from flask import Blueprint, request, jsonify, current_app
from middleware.auth_middleware import token_required
from datetime import datetime
import uuid

from games.catch_game import CatchGame
from utils.database import db
from models.db_models import GameSession, GameScore, CatchMeState

catch_routes_bp = Blueprint('catch_routes', __name__, url_prefix='/api/game/catch-me')

catch_me_logic = CatchGame()

@catch_routes_bp.route('/start', methods=['POST'])
@token_required
def start_game():
    try:
        questions = catch_me_logic.generate_question(10)
        session_id = str(uuid.uuid4())
        max_rounds = min(10, len(questions)) if questions else 0

        session = GameSession(
            session_id=session_id,
            user_id=request.user['user_id'],
            game_type='catch_game',
            start_time=datetime.utcnow(),
            status='active',
            payload=None
        )
        db.session.add(session)

        state = CatchMeState(
            session_id=session_id,
            user_id=request.user['user_id'],
            questions=list(questions),
            current_question_index=0,
            score=0,
            max_rounds=max_rounds,
            created_at=datetime.utcnow(),
            updated_at=None
        )
        db.session.add(state)
        db.session.commit()

        return jsonify({
            'message': 'Catch Me game started',
            'session_id': session_id,
            'first_question': questions[0] if questions else None,
            'max_rounds': max_rounds
        }), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@catch_routes_bp.route('/play', methods=['POST'])
@token_required
def play_round():
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        user_answer = data.get('answer_card_image')

        if not session_id or not user_answer:
            return jsonify({'message': 'Session ID and answer are required'}), 400

        session = GameSession.query.filter_by(session_id=session_id, user_id=request.user['user_id']).first()
        if not session or session.status != 'active':
            return jsonify({'message': 'Session not found or inactive'}), 404

        state = CatchMeState.query.filter_by(session_id=session_id, user_id=request.user['user_id']).first()
        if not state:
            return jsonify({'message': 'Session state not found'}), 404

        questions = list(state.questions or [])
        max_rounds = int(state.max_rounds or 0)
        if max_rounds <= 0:
            max_rounds = min(10, len(questions)) if questions else 0
        max_rounds = min(max_rounds, len(questions)) if questions else 0

        current_idx = int(state.current_question_index or 0)
        if current_idx >= max_rounds or current_idx >= len(questions):
            return jsonify({'message': 'No more questions left or session data invalid'}), 400

        question_image = questions[current_idx]
        is_correct = catch_me_logic.check_answer(question_image, user_answer)

        if is_correct:
            state.score = int(state.score or 0) + 1

        state.current_question_index = current_idx + 1
        state.updated_at = datetime.utcnow()

        is_finished = int(state.current_question_index or 0) >= max_rounds
        if is_finished:
            session.status = 'completed'
            session.end_time = datetime.utcnow()
            if session.start_time:
                session.duration = int((session.end_time - session.start_time).total_seconds())

            db.session.add(GameScore(
                score_id=str(uuid.uuid4()),
                user_id=session.user_id,
                session_id=session.session_id,
                game_type='catch_game',
                score=int(state.score or 0),
                level=1,
                created_at=datetime.utcnow()
            ))

        db.session.commit()

        next_question_index = int(state.current_question_index or 0)
        next_question = questions[next_question_index] if not is_finished and next_question_index < len(questions) else None

        payload = {
            'is_correct': is_correct,
            'score': int(state.score or 0),
            'is_finished': is_finished,
            'next_question': next_question,
            'current_question_index': int(state.current_question_index or 0),
            'max_rounds': max_rounds
        }

        if current_app.debug or current_app.config.get('ENV') == 'development':
            payload['debug'] = {
                'question_image': question_image,
                'user_answer': user_answer,
                'expected_answer': catch_me_logic.answer_key.get(question_image),
                'questions_len': len(questions),
                'computed_next_index': next_question_index
            }

        return jsonify(payload), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
