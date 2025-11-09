"""
Selector Service - Flask API for ranking investment offers
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from models.selector import select_best_offer
from typing import List, Dict
import os

app = Flask(__name__)
CORS(app)

@app.route('/rank', methods=['POST'])
def rank_offers():
    try:
        offers = request.json
        if not isinstance(offers, list):
            return jsonify({'error': 'Input must be a list of offers'}), 400

        # Validate offers format
        for offer in offers:
            required = ['investor_id', 'principal', 'interest_annual_pct', 'tenure_months']
            if not all(key in offer for key in required):
                return jsonify({'error': 'Invalid offer format'}), 400

        # Get best offer (this adds composite_score to all offers)
        best = select_best_offer(offers)
        
        if not best:
            return jsonify([])

        # Return all offers with their scores
        return jsonify(offers)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    print(f"🚀 Starting Offer Selector API Server on port {port}...")
    app.run(host='0.0.0.0', port=port)