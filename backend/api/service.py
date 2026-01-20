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
from server_utils.auth import Auth

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
    return Auth.verify_id_token(token)

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
    
    # Only include location (coordinates) if explicitly requested (e.g., for editing)
    include_coords = request.args.get("coords", "false").lower() == "true"
    data = announcement.to_dict(include_location=include_coords)
    
    # Fetch owner details
    if announcement.owner_id:
        print(f"[DEBUG] Fetching owner for ID: {announcement.owner_id}")
        try:
            owner_record = auth.get_user(announcement.owner_id)
            data["owner"] = {
                "uid": owner_record.uid,
                "name": owner_record.display_name,
                "email": owner_record.email,
                "photo": owner_record.photo_url
            }
            print(f"[DEBUG] Successfully fetched owner: {owner_record.display_name}")
        except Exception as e:
            print(f"[ERROR_SERVICE] Failed to fetch owner details: {e}")
            data["owner"] = None
    else:
        print(f"[DEBUG] No owner_id found for property {property_id}")
            
    return jsonify(data), 200

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
    
    try:
        property_obj = Property.from_dict(data)
        property_id = manager.create_announcement(property_obj)
        return jsonify({"id": property_id, "status": "created"}), 201
    except Exception as e:
        print(f"[ERROR_SERVICE] Failed to create property: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

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

from firebase_admin import storage

# ... existing code ...

@app.route("/api/user/profile-image", methods=["POST"])
def upload_profile_image() -> Tuple[flask.Response, int]:
    """Upload profile image via server-side proxy to bypass CORS."""
    user = verify_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # Create a bucket reference
        bucket = storage.bucket()
        
        # Create a blob path: users/{uid}/profile_{timestamp}.jpg
        # We can use the filename provided or generate one
        import time
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        
        if ext not in allowed_extensions:
             return jsonify({"error": "Invalid file type"}), 400

        blob_path = f"users/{user['uid']}/profile_{int(time.time())}.{ext}"
        blob = bucket.blob(blob_path)
        
        # Upload the file
        blob.upload_from_file(file.stream, content_type=file.content_type)
        
        # Make it public (optional, or use signed URL)
        # standardized way for Firebase Storage public URLs
        # https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
        
        # NOTE: enabling public access might require bucket config changes. 
        # Alternatively, we can generate a signed URL:
        # url = blob.generate_signed_url(expiration=3600)
        
        # For this user profile use case, usually we want a long-lived public URL if the bucket allows public reads,
        # OR we use the download token method similar to client SDK.
        
        # Let's try to generate a persistent public access via make_public() if ACLs allow,
        # Otherwise fall back to a construction that mimics the client SDK if the token is properly set.
        
        # Ideally, we just want the standard public URL:
        blob.make_public()
        return jsonify({"url": blob.public_url}), 200

    except Exception as e:
        print(f"Upload failed: {e}")
        return jsonify({"error": str(e)}), 500

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
