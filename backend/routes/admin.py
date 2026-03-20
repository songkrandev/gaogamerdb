from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required, admin_required
from models.senior_user import SeniorUserModel
from utils.auth import AuthUtils
from datetime import datetime
from utils.database import db
from models.db_models import GameScore, GameSession, SeniorUser

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def get_all_users():
    """Get all senior users"""
    try:
        users = SeniorUserModel.get_all()
        # Keep password visible for admin
        
        return jsonify({
            'message': 'Users retrieved successfully',
            'count': len(users),
            'data': users
        }), 200
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/scores', methods=['GET'])
@token_required
@admin_required
def get_all_scores():
    """Get all game scores with user names"""
    try:
        rows = (
            db.session.query(GameScore, SeniorUser.full_name)
            .join(SeniorUser, SeniorUser.user_id == GameScore.user_id, isouter=True)
            .order_by(GameScore.created_at.desc())
            .all()
        )
        enriched_scores = []
        for sc, full_name in rows:
            enriched_scores.append({
                'score_id': sc.score_id,
                'user_id': sc.user_id,
                'session_id': sc.session_id,
                'game_type': sc.game_type,
                'score': sc.score,
                'level': sc.level,
                'created_at': sc.created_at.isoformat() if sc.created_at else None,
                'full_name': full_name or f"User {sc.user_id}"
            })
            
        return jsonify({
            'message': 'Scores retrieved successfully',
            'count': len(enriched_scores),
            'data': enriched_scores
        }), 200
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/scores/<score_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_score(score_id):
    """Delete a specific game score"""
    try:
        sc = GameScore.query.filter_by(score_id=score_id).first()
        if not sc:
            return jsonify({'message': 'Failed to delete score or score not found'}), 404
        db.session.delete(sc)
        db.session.commit()
        return jsonify({'message': 'Score deleted successfully'}), 200
            
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/scores/all', methods=['DELETE'])
@token_required
@admin_required
def delete_all_scores():
    """Delete all game scores and sessions"""
    try:
        db.session.query(GameScore).delete()
        db.session.query(GameSession).delete()
        db.session.commit()
        return jsonify({'message': 'All scores and sessions deleted successfully'}), 200
            
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/users/<user_id>', methods=['GET'])
@token_required
@admin_required
def get_user(user_id):
    """Get single senior user"""
    try:
        user = SeniorUserModel.get_by_id(user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Keep password visible for admin
        
        return jsonify({
            'message': 'User retrieved successfully',
            'data': user
        }), 200
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/users', methods=['POST'])
@token_required
@admin_required
def create_user():
    """Create new senior user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['full_name', 'email', 'address', 'phone', 'password']
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Check if email already exists
        if SeniorUserModel.get_by_email(data['email']):
            return jsonify({'message': 'Email already exists'}), 400
        
        # Check if phone already exists
        if SeniorUserModel.get_by_phone(data['phone']):
            return jsonify({'message': 'Phone number already exists'}), 400
        
        # Keep plain password for display
        plain_password = data['password']
        
        # Hash password but keep plain for admin visibility
        user_data = {
            'full_name': data['full_name'],
            'email': data['email'].strip().lower(),
            'address': data['address'],
            'phone': data['phone'],
            'password': AuthUtils.hash_password(data['password']),
            'plain_password': plain_password,
            'created_at': datetime.now().isoformat(),
            'created_by': request.user['user_id']
        }
        
        new_user = SeniorUserModel.create(user_data)
        
        return jsonify({
            'message': 'User created successfully',
            'data': new_user
        }), 201
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/users/<user_id>', methods=['PUT'])
@token_required
@admin_required
def update_user(user_id):
    """Update senior user"""
    try:
        user = SeniorUserModel.get_by_id(user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update only provided fields
        if 'full_name' in data:
            user['full_name'] = data['full_name']
        if 'email' in data:
            user['email'] = data['email'].strip().lower()
        if 'address' in data:
            user['address'] = data['address']
        if 'phone' in data:
            user['phone'] = data['phone']
        if 'password' in data:
            user['password'] = AuthUtils.hash_password(data['password'])
            user['plain_password'] = data['password']
        
        user['updated_at'] = datetime.now().isoformat()
        
        if SeniorUserModel.update(user_id, user):
            user.pop('password', None)
            return jsonify({
                'message': 'User updated successfully',
                'data': user
            }), 200
        else:
            return jsonify({'message': 'Failed to update user'}), 500
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(user_id):
    """Delete senior user"""
    try:
        user = SeniorUserModel.get_by_id(user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        if SeniorUserModel.delete(user_id):
            return jsonify({'message': 'User deleted successfully'}), 200
        else:
            return jsonify({'message': 'Failed to delete user'}), 500
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/stats', methods=['GET'])
@token_required
@admin_required
def get_stats():
    """Get admin dashboard statistics"""
    try:
        total_users = SeniorUserModel.count()

        total_sessions = GameSession.query.count()
        total_scores = GameScore.query.count()

        avg_score = db.session.query(db.func.avg(GameScore.score)).scalar() or 0

        popularity_rows = (
            db.session.query(GameScore.game_type, db.func.count(GameScore.score_id))
            .group_by(GameScore.game_type)
            .all()
        )
        game_popularity = [
            {'label': game_type or 'Unknown', 'value': int(count)}
            for game_type, count in popularity_rows
        ]
        game_popularity = sorted(game_popularity, key=lambda x: x['value'], reverse=True)[:5]
        
        return jsonify({
            'message': 'Stats retrieved successfully',
            'data': {
                'total_senior_users': total_users,
                'total_sessions': total_sessions,
                'total_scores': total_scores,
                'average_score': round(avg_score, 1),
                'game_popularity': game_popularity
            }
        }), 200
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/scores/summary', methods=['GET'])
@token_required
@admin_required
def get_score_summary():
    """Get usage summary, grouped by user, with optional date range filter"""
    try:
        start = request.args.get('start')  # YYYY-MM-DD
        end = request.args.get('end')      # YYYY-MM-DD

        def parse_date_flexible(s):
            """Accept ISO (YYYY-MM-DD or full ISO), MM/DD/YYYY, DD/MM/YYYY, and Buddhist year (YYYY+543)."""
            if not s:
                return None
            # If full ISO datetime passed
            try:
                return datetime.fromisoformat(s)
            except Exception:
                pass
            # Date only patterns
            try_formats = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"]
            for fmt in try_formats:
                try:
                    dt = datetime.strptime(s, fmt)
                    # Adjust Buddhist year
                    if dt.year > 2400:
                        dt = dt.replace(year=dt.year - 543)
                    return dt
                except Exception:
                    continue
            return None

        start_dt = None
        end_dt = None
        if start:
            base = parse_date_flexible(start)
            start_dt = datetime(base.year, base.month, base.day, 0, 0, 0) if base else None
        if end:
            base = parse_date_flexible(end)
            end_dt = datetime(base.year, base.month, base.day, 23, 59, 59) if base else None

        session_q = db.session.query(GameSession.user_id, db.func.count(GameSession.session_id)).group_by(GameSession.user_id)
        score_q = db.session.query(GameScore.user_id, db.func.count(GameScore.score_id)).group_by(GameScore.user_id)
        if start_dt:
            session_q = session_q.filter(GameSession.start_time >= start_dt)
            score_q = score_q.filter(GameScore.created_at >= start_dt)
        if end_dt:
            session_q = session_q.filter(GameSession.start_time <= end_dt)
            score_q = score_q.filter(GameScore.created_at <= end_dt)

        sessions_map = {uid: int(cnt) for uid, cnt in session_q.all() if uid}
        plays_map = {uid: int(cnt) for uid, cnt in score_q.all() if uid}

        user_rows = db.session.query(SeniorUser.user_id, SeniorUser.full_name).all()
        user_map = {uid: name for uid, name in user_rows}

        user_ids = set(sessions_map.keys()) | set(plays_map.keys())
        summary_list = []
        for uid in user_ids:
            summary_list.append({
                'user_id': uid,
                'full_name': user_map.get(uid, f"User {uid}"),
                'sessions': sessions_map.get(uid, 0),
                'plays': plays_map.get(uid, 0)
            })
        summary_list = sorted(summary_list, key=lambda x: x['sessions'], reverse=True)

        return jsonify({
            'message': 'Summary retrieved successfully',
            'count': len(summary_list),
            'data': summary_list
        }), 200

    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/scores/user/<user_id>', methods=['GET'])
@token_required
@admin_required
def get_user_score_details(user_id):
    """Get detailed scores for a user with optional date range filter"""
    try:
        def parse_date_flexible(s):
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

        start = request.args.get('start')  # YYYY-MM-DD
        end = request.args.get('end')      # YYYY-MM-DD

        start_base = parse_date_flexible(start) if start else None
        end_base = parse_date_flexible(end) if end else None
        start_dt = datetime(start_base.year, start_base.month, start_base.day, 0, 0, 0) if start_base else None
        end_dt = datetime(end_base.year, end_base.month, end_base.day, 23, 59, 59) if end_base else None

        q = GameScore.query.filter_by(user_id=user_id)
        if start_dt:
            q = q.filter(GameScore.created_at >= start_dt)
        if end_dt:
            q = q.filter(GameScore.created_at <= end_dt)
        q = q.order_by(GameScore.created_at.desc())

        details = []
        for s in q.all():
            details.append({
                'score_id': s.score_id,
                'user_id': s.user_id,
                'session_id': s.session_id,
                'game_type': s.game_type,
                'score': s.score,
                'level': s.level,
                'created_at': s.created_at.isoformat() if s.created_at else None
            })

        # Enrich with full name
        user = SeniorUserModel.get_by_id(user_id)
        full_name = user['full_name'] if user else f"User {user_id}"

        return jsonify({
            'message': 'User score details retrieved successfully',
            'data': {
                'user_id': user_id,
                'full_name': full_name,
                'scores': details
            }
        }), 200

    except Exception as e:
        return jsonify({'message': str(e)}), 500

