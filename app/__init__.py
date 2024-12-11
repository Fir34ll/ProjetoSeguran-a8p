from flask import Flask
from flask_session import Session
import os

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.urandom(24)
    app.config['SESSION_TYPE'] = 'filesystem'
    
    Session(app)
    
    from app import routes
    app.register_blueprint(routes.main)
    
    return app
