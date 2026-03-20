from flask import Flask, jsonify
from flask_cors import CORS
from config import config
import os
from utils.database import db, get_database_uri
from models import db_models

# Create Flask app
def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Database config (Render: DATABASE_URL). Fallback to sqlite for local dev.
    app.config['SQLALCHEMY_DATABASE_URI'] = get_database_uri()
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    with app.app_context():
        db.create_all()
    
    # Enable CORS for all routes and allow common headers
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.admin import admin_bp
    from routes.traffic_routes import traffic_routes_bp
    from routes.catch_routes import catch_routes_bp
    from routes.wheel_routes import wheel_routes_bp
    from routes.decode_routes import decode_routes_bp
    from routes.puzzle_routes import puzzle_routes_bp
    from routes.common_routes import common_routes_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(traffic_routes_bp)
    app.register_blueprint(catch_routes_bp)
    app.register_blueprint(wheel_routes_bp)
    app.register_blueprint(decode_routes_bp)
    app.register_blueprint(puzzle_routes_bp)
    app.register_blueprint(common_routes_bp)

    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            'message': 'GaoGamer backend is running',
            'health': '/api/health',
            'auth': '/api/auth/login',
            'games': {
                'catch_start': '/api/game/catch-me/start',
                'catch_play': '/api/game/catch-me/play'
            }
        }), 200
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'Server is running',
            'storage': 'sqlalchemy',
            'catch_payload_mutable': True
        }), 200
    
    # 404 handler
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Endpoint not found'}), 404
    
    # 500 handler
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'message': 'Internal server error'}), 500
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host=app.config.get('SERVER_HOST', '0.0.0.0'), port=app.config.get('SERVER_PORT', 5000))
