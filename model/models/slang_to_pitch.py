"""
slang_to_pitch.py

This module converts informal loan requests into professional investor pitches using
Google's Gemini AI model. It handles the transformation of colloquial language
into structured, business-appropriate communication.
"""

import os
import json
from typing import Optional, Dict, Any
import google.generativeai as genai

# Configure Gemini API Key from env
GENAI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GENAI_API_KEY")

model = None
if GENAI_API_KEY:
    try:
        genai.configure(api_key=GENAI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
    except Exception as e:
        print(f"Warning: Failed to initialize Gemini model: {e}")
        print("Please ensure you have set the GOOGLE_API_KEY or GENAI_API_KEY environment variable")
else:
    print("Warning: GOOGLE_API_KEY or GENAI_API_KEY environment variable not set")

def slang_to_pitch(user_text: str) -> Dict[str, str]:
    """
    Convert informal loan request text into a professional pitch.

    Args:
        user_text: The informal or colloquial loan request text

    Returns:
        Dict containing the original text and professional pitch

    Raises:
        ValueError: If the input text is empty or invalid
        RuntimeError: If the API call fails
    """
    if not user_text or not user_text.strip():
        raise ValueError("Input text cannot be empty")
    
    if model is None:
        raise RuntimeError("Gemini model not initialized. Please set GOOGLE_API_KEY or GENAI_API_KEY environment variable.")

    prompt = f'''You are a financial advisor converting informal loan requests into professional pitches.
Take the informal text and convert it into a professional pitch.
Extract key information like loan amount, purpose, and business type.
Respond with ONLY the JSON object, no markdown, no code blocks, no additional text.

Input: "{user_text}"

Respond with this exact JSON structure:
{{
    "professional_pitch": "The professional version here",
    "extracted_info": {{
        "loan_amount": "amount if mentioned",
        "purpose": "purpose if mentioned",
        "business_type": "type of business if mentioned"
    }}
}}
'''
    try:
        response = model.generate_content(prompt)
        text = getattr(response, "text", "")
        
        if not text:
            raise RuntimeError("Empty response from API")

        # Clean up the response text
        text = text.strip()
        if text.startswith('```') and text.endswith('```'):
            # Remove markdown code blocks
            text = text[text.find('\n')+1:text.rfind('```')].strip()
        if text.startswith('json'):
            # Remove language identifier
            text = text[4:].strip()
        
        # Find the JSON object
        start = text.index("{")
        end = text.rindex("}") + 1
        json_text = text[start:end]
        
        # Parse the JSON
        result = json.loads(json_text)
        
        return {
            "original_text": user_text,
            "professional_pitch": result.get("professional_pitch", text),
            "extracted_info": result.get("extracted_info", {})
        }
    except Exception as e:
        # Fallback with error information
        return {
            "original_text": user_text,
            "professional_pitch": f"Error processing request: {str(e)}",
            "extracted_info": {}
        }

def _format_output(result: Dict[str, Any]) -> str:
    """Format the result dictionary into a readable string."""
    output = []
    output.append("🎯 Professional Pitch:")
    output.append(result["professional_pitch"])
    
    if info := result.get("extracted_info"):
        output.append("\n📊 Extracted Information:")
        for key, value in info.items():
            if value and value != key:  # Only show if there's meaningful info
                output.append(f"- {key.replace('_', ' ').title()}: {value}")
    
    return "\n".join(output)


if __name__ == "__main__":
    print("💬 Slang to Pitch Converter (type 'exit' to quit)\n")
    
    while True:
        try:
            user_input = input("Enter a slang loan request: ").strip()
            
            if not user_input:
                print("❌ Please enter some text")
                continue
                
            if user_input.lower() == "exit":
                print("Goodbye! 👋")
                break
                
            result = slang_to_pitch(user_input)
            print("\n" + _format_output(result))
            print("-" * 60)
            
        except KeyboardInterrupt:
            print("\nGoodbye! 👋")
            break
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            print("-" * 60)

