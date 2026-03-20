import uuid
from datetime import datetime

from utils.database import db
from sqlalchemy.ext.mutable import MutableDict, MutableList


def _uuid():
    return str(uuid.uuid4())


class Admin(db.Model):
    """
    Admin users.
    Mirrors old JSON shape: admin_id, email, password, full_name, created_at.
    """
    __tablename__ = 'admins'

    admin_id = db.Column(db.String(20), primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class SeniorUser(db.Model):
    """
    Senior users (players).
    Mirrors old JSON shape: user_id, full_name, email, phone, address, password, plain_password, created_at, updated_at, created_by.
    """
    __tablename__ = 'senior_users'

    user_id = db.Column(db.String(20), primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(30), unique=True, nullable=True, index=True)
    address = db.Column(db.Text, nullable=True)
    password = db.Column(db.String(255), nullable=False)
    plain_password = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    created_by = db.Column(db.String(20), db.ForeignKey('admins.admin_id'), nullable=True)
    created_by_admin = db.relationship('Admin', backref=db.backref('created_users', lazy=True))


class GameSession(db.Model):
    """
    Game sessions. Some games (catch_me) need extra per-session data, stored in payload (JSON).
    """
    __tablename__ = 'game_sessions'

    session_id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(20), db.ForeignKey('senior_users.user_id'), nullable=False, index=True)
    game_type = db.Column(db.String(50), nullable=False, index=True)

    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    duration = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='active', index=True)

    payload = db.Column(MutableDict.as_mutable(db.JSON), nullable=True)

    user = db.relationship('SeniorUser', backref=db.backref('sessions', lazy=True))


class CatchMeState(db.Model):
    __tablename__ = 'catch_me_states'

    session_id = db.Column(db.String(36), db.ForeignKey('game_sessions.session_id'), primary_key=True)
    user_id = db.Column(db.String(20), db.ForeignKey('senior_users.user_id'), nullable=False, index=True)

    questions = db.Column(MutableList.as_mutable(db.JSON), nullable=False, default=list)
    current_question_index = db.Column(db.Integer, nullable=False, default=0)
    score = db.Column(db.Integer, nullable=False, default=0)
    max_rounds = db.Column(db.Integer, nullable=False, default=10)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)


class GameScore(db.Model):
    """
    Game scores. Mirrors old JSON shape: score_id, user_id, session_id, game_type, score, level, created_at.
    """
    __tablename__ = 'game_scores'

    score_id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(20), db.ForeignKey('senior_users.user_id'), nullable=False, index=True)
    session_id = db.Column(db.String(36), db.ForeignKey('game_sessions.session_id'), nullable=True, index=True)
    game_type = db.Column(db.String(50), nullable=False, index=True)
    score = db.Column(db.Integer, nullable=False, default=0)
    level = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = db.relationship('SeniorUser', backref=db.backref('scores', lazy=True))
    session = db.relationship('GameSession', backref=db.backref('scores', lazy=True))
