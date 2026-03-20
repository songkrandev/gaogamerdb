from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from datetime import datetime
import uuid
from utils.database import db
from models.db_models import GameSession, GameScore

common_routes_bp = Blueprint('common_routes', __name__, url_prefix='/api/game')


def _session_to_dict(s: GameSession):
    return {
        'session_id': s.session_id,
        'user_id': s.user_id,
        'game_type': s.game_type,
        'start_time': s.start_time.isoformat() if s.start_time else None,
        'end_time': s.end_time.isoformat() if s.end_time else None,
        'duration': s.duration,
        'status': s.status,
        **(s.payload or {})
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

@common_routes_bp.route('/start-session', methods=['POST'])
@token_required
def start_game_session():
    """Start a new game session (generic for all games)"""
    try:
        data = request.get_json() or {}
        game_type = data.get('game_type', 'unknown_game')

        session = GameSession(
            session_id=str(uuid.uuid4()),
            user_id=request.user['user_id'],
            game_type=game_type,
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
            'message': f'{game_type} session started',
            'data': session_data
        }), 201
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@common_routes_bp.route('/end-session', methods=['POST'])
@token_required
def end_game_session():
    """End a game session (generic for all games)"""
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
            'message': 'Game session ended',
            'data': _session_to_dict(session)
        }), 200
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@common_routes_bp.route('/save-score', methods=['POST'])
@token_required
def save_game_score():
    """Save game score (generic for all games)"""
    try:
        data = request.get_json()
        
        if not data.get('session_id') or 'score' not in data:
            return jsonify({'message': 'Session ID and score are required'}), 400

        score = GameScore(
            score_id=str(uuid.uuid4()),
            user_id=request.user['user_id'],
            session_id=data['session_id'],
            game_type=data.get('game_type', 'unknown_game'),
            score=int(data['score']),
            level=int(data.get('level', 1)),
            created_at=datetime.utcnow()
        )
        db.session.add(score)
        db.session.commit()

        score_data = _score_to_dict(score)

        return jsonify({
            'message': 'Game score saved successfully',
            'data': score_data
        }), 201
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@common_routes_bp.route('/user-scores', methods=['GET'])
@token_required
def get_user_scores():
    """ดึงคะแนนทั้งหมดของผู้เล่นปัจจุบัน (ใช้ร่วมกันทุกเกม)"""
    try:
        rows = GameScore.query.filter_by(user_id=request.user['user_id']).order_by(GameScore.created_at.desc()).all()
        user_scores = [_score_to_dict(s) for s in rows]
        
        return jsonify({
            'message': 'Scores retrieved successfully',
            'count': len(user_scores),
            'data': user_scores
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
