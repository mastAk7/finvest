/**
 * Quick test script to verify the deployed model API is working
 * Run with: node test-model-api.js
 */

const fetch = require('node-fetch');

const MODEL_API_URL = 'https://finvest-2p2y.onrender.com';

async function testModelAPI() {
    console.log('🧪 Testing Model API...\n');
    console.log(`URL: ${MODEL_API_URL}/generate-pitch\n`);

    try {
        const response = await fetch(`${MODEL_API_URL}/generate-pitch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: 'I need 50000 rupees for my momos shop' 
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Error Response:', error);
            return;
        }

        const result = await response.json();
        console.log('✅ Success! Response:');
        console.log(JSON.stringify(result, null, 2));

        if (result.success && result.data) {
            console.log('\n✅ API is working correctly!');
            console.log(`Professional Pitch: ${result.data.professional_pitch?.substring(0, 100)}...`);
        } else {
            console.log('\n⚠️ API responded but format may be unexpected');
        }

    } catch (err) {
        console.error('❌ Test failed:', err.message);
        console.error('\nPossible issues:');
        console.error('1. Service might be spinning up (wait 30-60 seconds and try again)');
        console.error('2. GENAI_API_KEY might not be set in Render environment variables');
        console.error('3. Network connectivity issue');
    }
}

testModelAPI();

