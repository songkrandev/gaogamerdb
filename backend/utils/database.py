import os
from flask_sqlalchemy import SQLAlchemy

# SQLAlchemy instance shared across the backend.
db = SQLAlchemy()


def get_database_uri():
    """
    Build SQLAlchemy database URI.

    Render provides DATABASE_URL for PostgreSQL, sometimes prefixed with 'postgres://'
    which SQLAlchemy expects as 'postgresql://'.
    """
    url = os.environ.get('DATABASE_URL')
    if url and url.startswith('postgres://'):
        url = 'postgresql://' + url[len('postgres://'):]
    return url or 'sqlite:///local.db'

