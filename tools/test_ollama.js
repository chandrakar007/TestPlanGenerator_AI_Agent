import dotenv from 'dotenv';
import path from 'path';

// Construct path to .env file in root directory (.env is 1 level up from tools/)
const envPath = path.resolve('../.env');
dotenv.config({ path: envPath });

async function testOllamaConnection() {
  // Default to localhost if not specified in .env
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  console.log(`Testing Ollama connection at ${baseUrl}...`);

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  try {
    const response = await fetch(`${normalizedBaseUrl}/api/tags`, {
      method: 'GET'
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully connected to local Ollama instance.');
      
      if (data.models && data.models.length > 0) {
        console.log(`Found ${data.models.length} model(s) downloaded.`);
        const modelNames = data.models.map(m => m.name).join(', ');
        console.log(`Available models: ${modelNames}`);
      } else {
        console.warn('⚠️ Connected to Ollama, but no models found. You may need to run: ollama run <model>');
      }
    } else {
      console.error(`❌ Ollama connection failed with status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`Response text: ${text}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error during Ollama connection test to ${normalizedBaseUrl}:`);
    console.error(`Failed to fetch. Ensure Ollama is running locally. Error: ${error.message}`);
    process.exit(1);
  }
}

testOllamaConnection();
