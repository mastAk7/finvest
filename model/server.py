"""
Flask server for the pitch generation model.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API Key from environment variable
GENAI_API_KEY = os.getenv('GENAI_API_KEY')
if not GENAI_API_KEY:
    raise ValueError("GENAI_API_KEY environment variable is required. Please set it in your .env file or environment.")
genai.configure(api_key=GENAI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

@app.route('/generate-pitch', methods=['POST'])
def generate_pitch():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400

        user_text = data['text']
        
        prompt = f'''
        Convert this informal loan request into a professional investor pitch.
        Extract key details like loan amount, purpose, and business type.
        
        Input: "{user_text}"
        
        Respond in this exact JSON format:
        {{
            "professional_pitch": "The professional pitch text",
            "extracted_info": {{
                "loan_amount": "amount if mentioned",
                "purpose": "purpose if mentioned",
                "business_type": "business type if mentioned"
            }}
        }}
        '''
        
        response = model.generate_content(prompt)
        result = response.text.strip()
        
        # Clean up markdown and code blocks if present
        if result.startswith('```'):
            # Remove the first line (```json)
            result = result.split('\n', 1)[1]
        if result.endswith('```'):
            # Remove the last line (```)
            result = result.rsplit('\n', 1)[0]
            
        # Remove any remaining markdown or language identifiers
        result = result.replace('```json', '').replace('```', '').strip()
        
        try:
            # Parse the JSON to validate it
            parsed_json = json.loads(result)
            return jsonify({
                'success': True,
                'data': parsed_json
            })
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw text received: {result}")
            return jsonify({
                'success': False,
                'error': 'Failed to parse model response as JSON'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    print(f"🚀 Starting Pitch Generation API Server on port {port}...")
    app.run(host='0.0.0.0', port=port)