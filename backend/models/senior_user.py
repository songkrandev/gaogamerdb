from datetime import datetime
import random

from utils.database import db
from models.db_models import SeniorUser


class SeniorUserModel:
    """Senior user access layer (used by routes/auth/admin)."""

    @staticmethod
    def generate_user_id():
        """Generate unique user ID like SU001..SU999."""
        existing_ids = set(
            r[0] for r in db.session.query(SeniorUser.user_id).all() if r and r[0]
        )
        while True:
            user_num = random.randint(1, 999)
            user_id = f"SU{user_num:03d}"
            if user_id not in existing_ids:
                return user_id

    @staticmethod
    def get_all():
        users = SeniorUser.query.order_by(SeniorUser.created_at.desc()).all()
        return [SeniorUserModel._to_dict(u) for u in users]

    @staticmethod
    def get_by_id(user_id):
        u = SeniorUser.query.filter_by(user_id=user_id).first()
        return SeniorUserModel._to_dict(u) if u else None

    @staticmethod
    def get_by_phone(phone):
        if not phone:
            return None
        u = SeniorUser.query.filter_by(phone=phone).first()
        return SeniorUserModel._to_dict(u) if u else None

    @staticmethod
    def get_by_email(email):
        if not email:
            return None
        u = SeniorUser.query.filter(db.func.lower(SeniorUser.email) == email.strip().lower()).first()
        return SeniorUserModel._to_dict(u) if u else None

    @staticmethod
    def create(user_data):
        created_at = user_data.get('created_at')
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except Exception:
                created_at = None

        updated_at = user_data.get('updated_at')
        if isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at)
            except Exception:
                updated_at = None

        u = SeniorUser(
            user_id=user_data.get('user_id') or SeniorUserModel.generate_user_id(),
            full_name=user_data.get('full_name') or '',
            email=(user_data.get('email') or '').strip().lower(),
            address=user_data.get('address'),
            phone=user_data.get('phone'),
            password=user_data.get('password') or '',
            plain_password=user_data.get('plain_password'),
            created_at=created_at or datetime.utcnow(),
            updated_at=updated_at,
            created_by=user_data.get('created_by')
        )
        db.session.add(u)
        db.session.commit()
        return SeniorUserModel._to_dict(u)

    @staticmethod
    def update(user_id, user_data):
        u = SeniorUser.query.filter_by(user_id=user_id).first()
        if not u:
            return False

        if 'full_name' in user_data:
            u.full_name = user_data.get('full_name')
        if 'email' in user_data:
            u.email = (user_data.get('email') or '').strip().lower()
        if 'address' in user_data:
            u.address = user_data.get('address')
        if 'phone' in user_data:
            u.phone = user_data.get('phone')
        if 'password' in user_data:
            u.password = user_data.get('password')
        if 'plain_password' in user_data:
            u.plain_password = user_data.get('plain_password')
        if 'created_by' in user_data:
            u.created_by = user_data.get('created_by')

        if 'updated_at' in user_data:
            updated_at = user_data.get('updated_at')
            if isinstance(updated_at, str):
                try:
                    updated_at = datetime.fromisoformat(updated_at)
                except Exception:
                    updated_at = None
            u.updated_at = updated_at
        else:
            u.updated_at = datetime.utcnow()

        db.session.commit()
        return True

    @staticmethod
    def delete(user_id):
        u = SeniorUser.query.filter_by(user_id=user_id).first()
        if not u:
            return False
        db.session.delete(u)
        db.session.commit()
        return True

    @staticmethod
    def count():
        return SeniorUser.query.count()

    @staticmethod
    def _to_dict(u: SeniorUser):
        if not u:
            return None
        return {
            'user_id': u.user_id,
            'full_name': u.full_name,
            'email': u.email,
            'address': u.address,
            'phone': u.phone,
            'password': u.password,
            'plain_password': u.plain_password,
            'created_at': u.created_at.isoformat() if u.created_at else None,
            'updated_at': u.updated_at.isoformat() if u.updated_at else None,
            'created_by': u.created_by
        }
