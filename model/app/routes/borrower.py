
# app/routes/borrower.py

from flask import Blueprint, request, jsonify
from models.slang_to_pitch import slang_to_pitch

borrower_bp = Blueprint("borrower", __name__)

@borrower_bp.route("/generate_pitch", methods=["POST"])
def generate_pitch_api():
    """Convert informal loan request to professional pitch."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        user_text = data.get("idea", "")
        if not user_text or not user_text.strip():
            return jsonify({"error": "Please provide your loan request idea"}), 400

        result = slang_to_pitch(user_text.strip())
        return jsonify({"success": True, "pitch": result})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
