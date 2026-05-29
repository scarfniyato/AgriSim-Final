from flask import Flask
from .routes import main

def create_app():
    app = Flask(__name__)
    # Reject oversized request bodies before they are read into memory.
    # Legitimate /api/simulate payloads are a few KB (worst case ~15 KB for a
    # full 730-day schedule), so 1 MB is generous headroom while still blocking
    # maliciously large payloads with a 413 before any handler runs.
    app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1 MB
    app.register_blueprint(main)
    return app