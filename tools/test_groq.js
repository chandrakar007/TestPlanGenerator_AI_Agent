import dotenv from 'dotenv';
import path from 'path';

// Construct path to .env file in root directory (.env is 1 level up from tools/)
const envPath = path.resolve('../.env');
dotenv.config({ path: envPath });

async function testGroqConnection() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('❌ Missing GROQ_API_KEY in .env file.');
    process.exit(1);
  }

  console.log('Testing Groq connection...');

  try {
    // A lightweight check - listing available models
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully connected to Groq API.');
      console.log(`Available models retrieved: ${data.data.length} model(s) found.`);
      const popularModels = data.data.slice(0, 3).map(m => m.id).join(', ');
      console.log(`Some models available: ${popularModels}`);
    } else {
      console.error(`❌ Groq connection failed with status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`Response text: ${text}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during Groq connection test:');
    console.error(error.message);
    process.exit(1);
  }
}

testGroqConnection();
