"""
    file: service.py
    brief: Main Flask application for State Manager
"""
# Standard library imports
import os
import sys
from pathlib import Path
from typing import Any, Dict, Tuple

# Third-party imports
import flask
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from firebase_admin import auth

# Local imports
from server_utils.ai import AI as AIService
from server_utils.database import Database
from server_utils.security import Security

# Add backend directory to sys.path
basedir = Path(__file__).parent.parent
sys.path.append(str(basedir))

# Load environment variables
load_dotenv(basedir / ".env")
load_dotenv(basedir / ".env.local", override=True)

from api.models.manager import PropertyManager, Property

# Initialize Database
credentials = os.environ.get("DATABASE_SERVICE_ACCOUNT")
database_url = os.environ.get("DATABASE_URL")

if credentials:
    import json
    if isinstance(credentials, str) and credentials.startswith("{"):
        credentials = json.loads(credentials)
    Database.initialize_app(credentials, database_url)
else:
    print("Warning: DATABASE_SERVICE_ACCOUNT not set. Database not initialized.")

# Initialize AI
ai_key = os.environ.get("AI_API_KEY")
if ai_key:
    AIService.initialize(ai_key)
else:
    print("Warning: AI_API_KEY not set. AI features disabled.")


app = Flask(__name__)

# Configure CORS
allowed_origin = os.environ.get("STATIC_BASE_URL", "http://localhost:5173")
origins_list = [o.strip().rstrip("/") for o in allowed_origin.split(',')]
CORS(app, resources={r"/*": {"origins": origins_list}})

@app.route("/")
def home() -> Any:
    """Status endpoint for the backend service."""
    return "Mugen State Manager API is running", 200

# Initialize Security
security = Security()
manager = PropertyManager()

def verify_token() -> Any:
    """Verify Firebase JWT from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

@app.before_request
def before_request_hook() -> Any:
    """Apply security validation before each request."""
    return security.validation()

# Removed home() route to allow serve() to handle the root path

@app.route("/api/announcements", methods=["GET"])
def get_announcements() -> Tuple[flask.Response, int]:
    """Get all announcements with filters."""
    filters = request.args.to_dict()
    announcements = manager.get_all_announcements(filters)
    return jsonify(announcements), 200

@app.route("/api/announcements/<property_id>", methods=["GET"])
def get_announcement(property_id: str) -> Tuple[flask.Response, int]:
    """Get details of a single announcement."""
    announcement = manager.get_announcement(property_id)
    if not announcement:
        return jsonify({"error": "Announcement not found"}), 404
    return jsonify(announcement.to_dict()), 200

@app.route("/api/announcements", methods=["POST"])
def create_announcement() -> Tuple[flask.Response, int]:
    """Create a new announcement (Auth required)."""
    user = verify_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    if not data:
        return jsonify({"error": "Missing data"}), 400
    
    data["owner_id"] = user["uid"]
    property_obj = Property.from_dict(data)
    property_id = manager.create_announcement(property_obj)
    
    return jsonify({"id": property_id, "status": "created"}), 201

@app.route("/api/announcements/<property_id>", methods=["PUT"])
def update_announcement(property_id: str) -> Tuple[flask.Response, int]:
    """Update an announcement (Auth and ownership required)."""
    user = verify_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    existing = manager.get_announcement(property_id)
    if not existing:
        return jsonify({"error": "Not found"}), 404
    
    if existing.owner_id != user["uid"]:
        return jsonify({"error": "Forbidden"}), 403
    
    data = request.json
    if not data:
        return jsonify({"error": "Missing data"}), 400
    
    manager.update_announcement(property_id, data)
    return jsonify({"status": "updated"}), 200

@app.route("/api/announcements/<property_id>", methods=["DELETE"])
def delete_announcement(property_id: str) -> Tuple[flask.Response, int]:
    """Delete an announcement (Auth and ownership required)."""
    user = verify_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    existing = manager.get_announcement(property_id)
    if not existing:
        return jsonify({"error": "Not found"}), 404
    
    if existing.owner_id != user["uid"]:
        return jsonify({"error": "Forbidden"}), 403
    
    manager.delete_announcement(property_id)
    return jsonify({"status": "deleted"}), 200

@app.route("/api/user/announcements", methods=["GET"])
def get_user_announcements() -> Tuple[flask.Response, int]:
    """Get announcements for the logged-in user."""
    user = verify_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    announcements = manager.get_user_announcements(user["uid"])
    return jsonify(announcements), 200

@app.route("/api/user/profile", methods=["GET"])
def get_user_profile() -> Tuple[flask.Response, int]:
    """Get the profile of the logged-in user."""
    user = verify_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Firebase decoded token contains basic info
    profile = {
        "uid": user["uid"],
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture")
    }
    return jsonify(profile), 200
