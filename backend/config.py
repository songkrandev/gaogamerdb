import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'gaogamer-dev-secret-key-2026'
    JWT_SECRET = os.environ.get('JWT_SECRET') or 'gaogamer-jwt-secret-2026'
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION = timedelta(hours=24)
    
    # Data paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    
    ADMINS_FILE = os.path.join(DATA_DIR, 'admins.json')
    SENIOR_USERS_FILE = os.path.join(DATA_DIR, 'senior_users.json')
    GAME_SESSIONS_FILE = os.path.join(DATA_DIR, 'game_sessions.json')
    GAME_SCORES_FILE = os.path.join(DATA_DIR, 'game_scores.json')

    SERVER_HOST = os.environ.get('GAOGAMER_HOST') or '0.0.0.0'
    SERVER_PORT = int(os.environ.get('GAOGAMER_PORT') or '5000')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    DEVELOPMENT = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    DEVELOPMENT = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
