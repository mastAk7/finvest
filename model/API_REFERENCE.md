# API Reference - Deployed Model Service

## Base URL
```
https://finvest-2p2y.onrender.com
```

## Endpoints

### 1. Generate Pitch
Convert informal loan requests into professional investor pitches.

**Endpoint:** `POST /generate-pitch`

**Request Body:**
```json
{
  "text": "I need 50000 rupees for my momos shop"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "professional_pitch": "Professional pitch text here...",
    "extracted_info": {
      "loan_amount": "50000",
      "purpose": "momos shop",
      "business_type": "food business"
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

**Example Usage:**

**JavaScript/Fetch:**
```javascript
const response = await fetch('https://finvest-2p2y.onrender.com/generate-pitch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'I need 50000 rupees for my momos shop'
  })
});

const data = await response.json();
console.log(data);
```

**Python:**
```python
import requests

url = 'https://finvest-2p2y.onrender.com/generate-pitch'
data = {'text': 'I need 50000 rupees for my momos shop'}

response = requests.post(url, json=data)
result = response.json()
print(result)
```

**cURL:**
```bash
curl -X POST https://finvest-2p2y.onrender.com/generate-pitch \
  -H "Content-Type: application/json" \
  -d '{"text": "I need 50000 rupees for my momos shop"}'
```

## Important Notes

1. **Cold Start**: Render free tier services spin down after 15 minutes of inactivity. The first request after spin-down may take 30-60 seconds.

2. **CORS**: CORS is enabled, so you can call this API from any frontend application.

3. **Rate Limiting**: Free tier may have rate limits. Monitor your usage.

4. **Environment Variable**: Make sure `GENAI_API_KEY` is set in your Render service environment variables.

## Troubleshooting

- **500 Error**: Check if `GENAI_API_KEY` is set in Render dashboard → Environment variables
- **Timeout**: Service might be spinning up, wait 30-60 seconds and try again
- **CORS Error**: Already configured, but check browser console for specific errors

