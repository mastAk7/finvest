# app/routes/negotiate.py

from flask import Blueprint, request, jsonify
from models.negotiator import negotiate_round

negotiate_bp = Blueprint('negotiate', __name__)

@negotiate_bp.route('/chat', methods=['POST'])
def chat_with_bot():
    """Process investor messages during negotiation."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Get message and current state
        message = data.get('message')
        if not message or not message.strip():
            return jsonify({"error": "Please provide a message"}), 400

        # Get or initialize negotiation state
        current_offer = data.get('current_offer', {
            "interest_annual_pct": None,
            "tenure_months": None,
            "investor_id": data.get('investor_id', 'INV1')
        })
        history = data.get('history', [])

        # Run negotiation round
        result = negotiate_round(current_offer, message.strip(), history)

        return jsonify({
            "success": True,
            "status": result["status"],
            "message": result["message"],
            "updated_offer": result["updated_offer"],
            "history": result["history"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
