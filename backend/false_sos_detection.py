from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
import os
import logging
from logging.handlers import RotatingFileHandler
import pytz
app = Flask(__name__)
CORS(app)

# Setup logging
if not os.path.exists('logs'):
    os.mkdir('logs')
file_handler = RotatingFileHandler('logs/sos_service.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('SOS Verification Service started')

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URL")
client = MongoClient(MONGODB_URI)
db = client["WithU"]
sos_collection = db["sos"]

@app.route("/")
def root():
    app.logger.info('Root endpoint accessed')
    return jsonify({"message": "SOS Verification Service is running"})
@app.route("/api/verify_sos", methods=["POST"])
def verify_sos():
    data = request.get_json()
    app.logger.info(f"Verification request received: {data}")

    user_id = data.get("user_id")
    description = data.get("description")

    if not user_id or not description:
        app.logger.warning("Missing required fields in verification request")
        return jsonify({
            "verified": False,
            "message": "Missing user_id or description"
        }), 400

    try:
        # Check for recent SOS within the last 12 hours
        
# Example: Passing IST (Indian Standard Time) timezone
        

# 12 hours ago from now (UTC)
        time_threshold = datetime.now(timezone.utc) - timedelta(hours=12)

# Convert to MongoDB-compatible ISO format
        iso_time = time_threshold.isoformat(timespec='milliseconds')
        print(iso_time)  # Example: '2025-04-13T04:15:05.131+00:00'
        recent_sos = sos_collection.find_one({
            "owner_id": user_id,
            "createdAt": {"$gte": time_threshold},  # ✅ FIXED here
            "status": {"$in": ["resolved", "pending", "accepted"]}
        })

        if recent_sos:
            app.logger.info(f"User {user_id} has recent active SOS: {recent_sos}")
            return jsonify({
                "verified": False,
                "message": "You already have an active SOS within the last 12 hours."
            })

        # Log successful verification
        app.logger.info(f"SOS verification passed for user {user_id}")
        return jsonify({
            "verified": True,
            "message": "SOS verification passed"
        })

    except Exception as e:
        app.logger.error(f"Error during verification: {str(e)}", exc_info=True)
        return jsonify({
            "verified": False,
            "message": "Internal server error during verification"
        }), 500


@app.route("/api/check_recent_sos/<string:user_id>", methods=["GET"])
def check_recent_sos(user_id):
    app.logger.info(f"Checking recent SOS for user {user_id}")
    try:
        time_threshold = datetime.utcnow() - timedelta(hours=12)
        recent_sos = sos_collection.find_one({
            "owner_id": user_id,
            "createdAt": {"$gte": time_threshold},
            "status": {"$in": ["pending", "accepted"]}
        })

        return jsonify({
            "has_recent_sos": recent_sos is not None,
            "can_trigger_sos": recent_sos is None
        })

    except Exception as e:
        app.logger.error(f"Error checking recent SOS: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
