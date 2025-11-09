# app/routes/investor.py

from flask import Blueprint, request, jsonify
from models.selector import select_best_offer

investor_bp = Blueprint('investor', __name__)

@investor_bp.route('/select_investor', methods=['POST'])
def select_investor_api():
    """Select the best investor offer based on configured weights."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        offers = data.get('offers')
        if not offers or not isinstance(offers, list):
            return jsonify({"error": "Please provide a list of offers"}), 400

        # Optional weights from request or use defaults
        w_principal = data.get('w_principal', 0.6)  # 60% weight to loan amount
        w_interest = data.get('w_interest', 0.4)    # 40% weight to interest rate

        best = select_best_offer(offers, w_principal=w_principal, w_interest=w_interest)
        if best:
            return jsonify({"success": True, "best_offer": best})
        else:
            return jsonify({"error": "No valid offers found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500
