"""
    file: service.py
    brief: Main Flask application for State Manager
"""
# Standard library imports
import os
import sys
import json
from pathlib import Path
from typing import Any, Dict, Tuple

# Third-party imports
import flask
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from firebase_admin import auth, firestore

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
    return "Vita State Manager API is running", 200

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
    security.validation()
    return None

@app.route("/api/types", methods=["GET"])
def get_property_types() -> Tuple[flask.Response, int]:
    """Get list of allowed property types from JSON file."""
    try:
        types_file = basedir / "api" / "data" / "property_types.json"
        with open(types_file, "r") as f:
            types_list = json.load(f)
        return jsonify(types_list), 200
    except Exception as e:
        print(f"[ERROR_SERVICE] Failed to load types: {e}")
        return jsonify(["house", "apartment", "villa", "land"]), 200  # Fallback

@app.route("/api/listing-types", methods=["GET"])
def get_listing_types() -> Tuple[flask.Response, int]:
    """Get list of allowed listing types from JSON file."""
    try:
        types_file = basedir / "api" / "data" / "listing_types.json"
        with open(types_file, "r") as f:
            types_list = json.load(f)
        return jsonify(types_list), 200
    except Exception as e:
        print(f"[ERROR_SERVICE] Failed to load listing types: {e}")
        return jsonify(["sale", "rent"]), 200  # Fallback

@app.route("/api/statuses", methods=["GET"])
def get_property_statuses() -> Tuple[flask.Response, int]:
    """Get list of allowed property statuses from JSON file."""
    try:
        statuses_file = basedir / "api" / "data" / "property_statuses.json"
        with open(statuses_file, "r") as f:
            statuses_list = json.load(f)
        return jsonify(statuses_list), 200
    except Exception as e:
        print(f"[ERROR_SERVICE] Failed to load statuses: {e}")
        return jsonify(["available", "reserved", "under_option", "sold_rented"]), 200  # Fallback

@app.route("/api/amenities", methods=["GET"])
def get_amenities() -> Tuple[flask.Response, int]:
    """Get list of common key amenities from JSON file."""
    try:
        amenities_file = basedir / "api" / "data" / "key_amenities.json"
        with open(amenities_file, "r") as f:
            amenities_list = json.load(f)
        return jsonify(amenities_list), 200
    except Exception as e:
        print(f"[ERROR_SERVICE] Failed to load amenities: {e}")
        return jsonify(["Air Conditioning", "Swimming Pool", "Parking", "Garden"]), 200  # Fallback

@app.route("/api/region", methods=["GET"])
def get_region() -> Tuple[flask.Response, int]:
    """Get list of supported countries and their language packs."""
    # Detect language from query param or Accept-Language header
    lang = request.args.get("lang", "").lower()
    if not lang:
        header_lang = request.headers.get("Accept-Language", "").lower()
        if "es" in header_lang:
            lang = "es-es"
        elif "pt" in header_lang:
            # Check for pt-pt specifically, else pt-br
            lang = "pt-pt" if "pt-pt" in header_lang else "pt-br"
        else:
            lang = "en-us"
    
    # Dynamic language resolution
    try:
        lang_dir = basedir / "api" / "data" / "languages"
        # Get all json files keys (e.g. 'en-us', 'pt-br')
        available_langs = sorted([f.stem.lower() for f in lang_dir.glob("*.json")])
        
        target_lang = "en-us" # Default
        
        # 1. Exact match
        if lang in available_langs:
            target_lang = lang
        else:
            # 2. Prefix match (e.g. 'pt' -> 'pt-br')
            # specific preference for 'pt-br' over 'pt-pt' if just 'pt' is given? 
            # or just take the first one. Alphabetical: pt-br comes before pt-pt.
            matches = [l for l in available_langs if l.startswith(f"{lang}-")]
            if matches:
                target_lang = matches[0]
                
        lang_file = lang_dir / f"{target_lang}.json"
        
        with open(lang_file, "r", encoding="utf-8") as f:
            lang_pack = json.load(f)
            
        return jsonify({
            "regions": ["Brazil"],
            "language": target_lang,
            "availableLanguages": available_langs,
            "languagePack": lang_pack
        }), 200
    except Exception as e:
        print(f"[ERROR_SERVICE] Failed to load language pack {lang}: {e}")
        # Fallback mechanism
        return jsonify({
            "regions": ["Brazil"],
            "language": "en-us",
            "availableLanguages": ["en-us"],
            "languagePack": {}
        }), 200

@app.route("/api/announcements", methods=["GET"])
def get_announcements() -> Tuple[flask.Response, int]:
    """Get all announcements with filters."""
    filters = request.args.to_dict()
    # List view always masked (is_owner=False)
    announcements = manager.get_all_announcements(filters)
    return jsonify(announcements), 200

@app.route("/api/announcements/<property_id>", methods=["GET"])
def get_announcement(property_id: str) -> Tuple[flask.Response, int]:
    """Get details of a single announcement."""
    announcement = manager.get_announcement(property_id)
    if not announcement:
        return jsonify({"error": "Announcement not found"}), 404
    
    # Check ownership
    user = verify_token()
    is_owner = False
    if user and announcement.owner_id == user["uid"]:
        is_owner = True

    # Only include location if requested AND owner logic handled in model
    # Note: to_dict now handles location protection if is_owner=False
    include_coords = request.args.get("coords", "false").lower() == "true"
    
    data = announcement.to_dict(include_location=include_coords, is_owner=is_owner)
    
    # Fetch owner details
    if announcement.owner_id:
        # Optimization: Only fetch owner details if not self? Or always?
        # Always fetch so we can show "Listed by You" or similar
        try:
            owner_record = auth.get_user(announcement.owner_id)
            data["owner"] = {
                "uid": owner_record.uid,
                "name": owner_record.display_name,
                "email": owner_record.email,
                "photo": owner_record.photo_url
            }
        except Exception as e:
            print(f"[ERROR_SERVICE] Failed to fetch owner details: {e}")
            data["owner"] = None
            
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

@app.route("/api/upload", methods=["POST"])
def upload_file() -> Tuple[flask.Response, int]:
    """Upload a file to Firebase Storage (Auth required)."""
    user = verify_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        bucket = storage.bucket()
        import time
        import uuid
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        
        if ext not in allowed_extensions:
             return jsonify({"error": "Invalid file type"}), 400

        # Folder structure: properties/{uid}/{uuid}.{ext}
        blob_path = f"properties/{user['uid']}/{uuid.uuid4()}.{ext}"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_file(file.stream, content_type=file.content_type)
        blob.make_public()
        
        return jsonify({"url": blob.public_url}), 200

    except Exception as e:
        print(f"Generic upload failed: {e}")
        return jsonify({"error": str(e)}), 500

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

@app.route("/api/user/profile-photo", methods=["POST"])
def upload_profile_photo() -> Tuple[flask.Response, int]:
    """Store compressed profile photo in Firestore."""
    user = verify_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    if not data or "photoData" not in data:
        return jsonify({"error": "Missing photo data"}), 400
    
    try:
        # Store compressed photo data in Firestore
        db = Database()
        photo_ref = db.collection("user_photos").document(user["uid"])
        photo_ref.set({
            "photoData": data["photoData"],
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        
        # Return a reference string
        photo_reference = f"profile:{user['uid']}"
        return jsonify({"photoReference": photo_reference}), 200
    except Exception as e:
        print(f"Failed to store profile photo: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/user/profile-photo/<uid>", methods=["GET"])
def get_profile_photo(uid: str) -> Tuple[flask.Response, int]:
    """Retrieve compressed profile photo from Firestore."""
    try:
        db = Database()
        photo_ref = db.collection("user_photos").document(uid)
        photo_doc = photo_ref.get()
        
        if not photo_doc.exists:
            return jsonify({"error": "Photo not found"}), 404
        
        photo_data = photo_doc.to_dict()
        return jsonify({"photoData": photo_data.get("photoData")}), 200
    except Exception as e:
        print(f"Failed to retrieve profile photo: {e}")
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

@app.route("/api/translate", methods=["POST"])
def translate_text() -> Tuple[flask.Response, int]:
    """Proxy translation request to Google Translate to bypass CORS."""
    # Optional: Require auth? The user said "frontend api", maybe public is fine for now but safer with auth or limit.
    # The frontend is mostly public for property details.
    
    data = request.json
    if not data or "text" not in data or "target_lang" not in data:
        return jsonify({"error": "Missing text or target_lang"}), 400

    text = data["text"]
    target_lang = data["target_lang"]
    
    try:
        import requests
        # Use the same endpoint the user liked
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": "auto",
            "tl": target_lang,
            "dt": "t",
            "q": text
        }
        
        resp = requests.get(url, params=params)
        if resp.status_code != 200:
             return jsonify({"error": "Translation service error"}), 502
             
        # Response format: [[["translated", "original", ...], ...], ...]
        json_data = resp.json()
        translated_text = "".join([s[0] for s in json_data[0]])
        
        return jsonify({"translatedText": translated_text}), 200
    except Exception as e:
        print(f"Translation proxy failed: {e}")
        return jsonify({"error": str(e)}), 500
