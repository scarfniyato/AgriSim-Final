import sys
import os

# Add backend to path so we can import the Flask app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app

app = create_app()
