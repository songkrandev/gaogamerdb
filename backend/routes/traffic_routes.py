from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from datetime import datetime
import uuid
from utils.database import db
from models.db_models import GameSession, GameScore

traffic_routes_bp = Blueprint('traffic_routes', __name__, url_prefix='/api/game/traffic')


def _session_to_dict(s: GameSession):
    return {
        'session_id': s.session_id,
        'user_id': s.user_id,
        'game_type': s.game_type,
        'start_time': s.start_time.isoformat() if s.start_time else None,
        'end_time': s.end_time.isoformat() if s.end_time else None,
        'duration': s.duration,
        'status': s.status
    }


def _score_to_dict(sc: GameScore):
    return {
        'score_id': sc.score_id,
        'user_id': sc.user_id,
        'session_id': sc.session_id,
        'game_type': sc.game_type,
        'score': sc.score,
        'level': sc.level,
        'created_at': sc.created_at.isoformat() if sc.created_at else None
    }

@traffic_routes_bp.route('/start-session', methods=['POST'])
@token_required
def start_game_session():
    """Start a new traffic game session"""
    try:
        data = request.get_json()

        session = GameSession(
            session_id=str(uuid.uuid4()),
            user_id=request.user['user_id'],
            game_type='traffic_game',
            start_time=datetime.utcnow(),
            end_time=None,
            duration=None,
            status='active',
            payload=None
        )
        db.session.add(session)
        db.session.commit()
        session_data = _session_to_dict(session)

        return jsonify({
            'message': 'Traffic game session started',
            'data': session_data
        }), 201
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@traffic_routes_bp.route('/end-session', methods=['POST'])
@token_required
def end_game_session():
    """End a traffic game session"""
    try:
        data = request.get_json()
        
        if not data.get('session_id'):
            return jsonify({'message': 'Session ID is required'}), 400

        session = GameSession.query.filter_by(session_id=data['session_id'], user_id=request.user['user_id']).first()
        if not session:
            return jsonify({'message': 'Session not found'}), 404

        session.end_time = datetime.utcnow()
        session.status = 'completed'
        session.duration = int((session.end_time - session.start_time).total_seconds()) if session.start_time else None
        db.session.commit()

        return jsonify({
            'message': 'Traffic game session ended',
            'data': _session_to_dict(session)
        }), 200
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@traffic_routes_bp.route('/save-score', methods=['POST'])
@token_required
def save_game_score():
    """Save traffic game score"""
    try:
        data = request.get_json()
        
        if not data.get('session_id') or 'score' not in data:
            return jsonify({'message': 'Session ID and score are required'}), 400

        score = GameScore(
            score_id=str(uuid.uuid4()),
            user_id=request.user['user_id'],
            session_id=data['session_id'],
            game_type='traffic_game',
            score=int(data['score']),
            level=int(data.get('level', 1)),
            created_at=datetime.utcnow()
        )
        db.session.add(score)
        db.session.commit()
        score_data = _score_to_dict(score)

        return jsonify({
            'message': 'Traffic game score saved successfully',
            'data': score_data
        }), 201
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500
