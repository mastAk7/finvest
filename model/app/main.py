# app/main.py
from flask import Flask, jsonify
from flask_cors import CORS

# Import Blueprints
from routes.borrower import borrower_bp
from routes.investor import investor_bp
from routes.negotiate import negotiate_bp

app = Flask(__name__)
CORS(app)  # allows frontend to talk to backend (especially during local dev)

# Register routes
app.register_blueprint(borrower_bp, url_prefix="/borrower")
app.register_blueprint(investor_bp, url_prefix="/investor")
app.register_blueprint(negotiate_bp, url_prefix="/negotiate")

@app.route("/")
def home():
    return jsonify({
        "message": "Welcome to LoanAIML Shark Tank API 🦈",
        "routes": ["/borrower", "/investor", "/negotiate"]
    })

if __name__ == "__main__":
    app.run(debug=True)
