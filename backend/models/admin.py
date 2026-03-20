from datetime import datetime

from utils.database import db
from models.db_models import Admin


def _admin_to_dict(a: Admin):
    """
    Convert SQLAlchemy model to the same dict shape used by the existing API.
    """
    return {
        'admin_id': a.admin_id,
        'email': a.email,
        'password': a.password,
        'full_name': a.full_name,
        'created_at': a.created_at.isoformat() if a.created_at else None
    }


class AdminModel:
    """Admin access layer (keeps old interface used by routes)"""

    @staticmethod
    def get_all():
        return [_admin_to_dict(a) for a in Admin.query.order_by(Admin.admin_id.asc()).all()]

    @staticmethod
    def get_by_id(admin_id):
        a = Admin.query.filter_by(admin_id=admin_id).first()
        return _admin_to_dict(a) if a else None

    @staticmethod
    def get_by_email(email):
        if not email:
            return None
        a = Admin.query.filter(db.func.lower(Admin.email) == email.strip().lower()).first()
        return _admin_to_dict(a) if a else None

    @staticmethod
    def create(admin_data):
        """
        Create admin.
        Expected keys: admin_id, email, password, full_name, created_at (optional).
        """
        created_at = admin_data.get('created_at')
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except Exception:
                created_at = None

        a = Admin(
            admin_id=admin_data.get('admin_id'),
            email=(admin_data.get('email') or '').strip().lower(),
            password=admin_data.get('password'),
            full_name=admin_data.get('full_name'),
            created_at=created_at or datetime.utcnow()
        )
        db.session.add(a)
        db.session.commit()
        return _admin_to_dict(a)

    @staticmethod
    def update(admin_id, admin_data):
        a = Admin.query.filter_by(admin_id=admin_id).first()
        if not a:
            return False

        if 'email' in admin_data:
            a.email = (admin_data.get('email') or '').strip().lower()
        if 'password' in admin_data:
            a.password = admin_data.get('password')
        if 'full_name' in admin_data:
            a.full_name = admin_data.get('full_name')

        db.session.commit()
        return True

    @staticmethod
    def delete(admin_id):
        a = Admin.query.filter_by(admin_id=admin_id).first()
        if not a:
            return False
        db.session.delete(a)
        db.session.commit()
        return True
