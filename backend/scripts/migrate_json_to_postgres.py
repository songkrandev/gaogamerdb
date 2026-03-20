import json
import os
import sys
from datetime import datetime

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from config import Config
from utils.database import db
from models.db_models import Admin, SeniorUser, GameSession, GameScore


def _parse_dt(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except Exception:
        pass
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.year > 2400:
                dt = dt.replace(year=dt.year - 543)
            return dt
        except Exception:
            continue
    return None


def _read_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f) or {}


def migrate_admins():
    data = _read_json(Config.ADMINS_FILE).get('admins', [])
    for a in data:
        admin_id = a.get('admin_id')
        if not admin_id:
            continue
        exists = Admin.query.filter_by(admin_id=admin_id).first()
        if exists:
            continue
        db.session.add(Admin(
            admin_id=admin_id,
            email=(a.get('email') or '').strip().lower(),
            password=a.get('password') or '',
            full_name=a.get('full_name'),
            created_at=_parse_dt(a.get('created_at')) or datetime.utcnow()
        ))
    db.session.commit()


def migrate_senior_users():
    data = _read_json(Config.SENIOR_USERS_FILE).get('senior_users', [])
    for u in data:
        user_id = u.get('user_id')
        if not user_id:
            continue
        exists = SeniorUser.query.filter_by(user_id=user_id).first()
        if exists:
            continue
        db.session.add(SeniorUser(
            user_id=user_id,
            full_name=u.get('full_name') or '',
            email=(u.get('email') or '').strip().lower(),
            phone=u.get('phone'),
            address=u.get('address'),
            password=u.get('password') or '',
            plain_password=u.get('plain_password'),
            created_at=_parse_dt(u.get('created_at')) or datetime.utcnow(),
            updated_at=_parse_dt(u.get('updated_at')),
            created_by=u.get('created_by')
        ))
    db.session.commit()


def migrate_sessions():
    data = _read_json(Config.GAME_SESSIONS_FILE).get('game_sessions', [])
    known_keys = {'questions', 'current_question_index', 'score', 'max_rounds'}
    for s in data:
        session_id = s.get('session_id')
        if not session_id:
            continue
        exists = GameSession.query.filter_by(session_id=session_id).first()
        if exists:
            continue

        payload = None
        if any(k in s for k in known_keys):
            payload = {k: s.get(k) for k in known_keys if k in s}

        db.session.add(GameSession(
            session_id=session_id,
            user_id=s.get('user_id') or '',
            game_type=s.get('game_type') or 'unknown_game',
            start_time=_parse_dt(s.get('start_time')) or datetime.utcnow(),
            end_time=_parse_dt(s.get('end_time')),
            duration=s.get('duration'),
            status=s.get('status') or 'active',
            payload=payload
        ))
    db.session.commit()


def migrate_scores():
    data = _read_json(Config.GAME_SCORES_FILE).get('game_scores', [])
    for sc in data:
        score_id = sc.get('score_id')
        if not score_id:
            continue
        exists = GameScore.query.filter_by(score_id=score_id).first()
        if exists:
            continue
        db.session.add(GameScore(
            score_id=score_id,
            user_id=sc.get('user_id') or '',
            session_id=sc.get('session_id'),
            game_type=sc.get('game_type') or 'unknown_game',
            score=int(sc.get('score') or 0),
            level=int(sc.get('level') or 1),
            created_at=_parse_dt(sc.get('created_at')) or datetime.utcnow()
        ))
    db.session.commit()


def main():
    app = create_app()
    with app.app_context():
        migrate_admins()
        migrate_senior_users()
        migrate_sessions()
        migrate_scores()
        print('Migration completed.')


if __name__ == '__main__':
    main()
