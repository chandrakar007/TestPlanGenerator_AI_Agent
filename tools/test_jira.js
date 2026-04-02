import dotenv from 'dotenv';
import path from 'path';

// Construct path to .env file in root directory (.env is 1 level up from tools/)
const envPath = path.resolve('../.env');
dotenv.config({ path: envPath });

async function testJiraConnection() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const username = process.env.JIRA_USERNAME;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !username || !apiToken) {
    console.error('❌ Missing JIRA credentials in .env file.');
    console.error('Ensure JIRA_BASE_URL, JIRA_USERNAME, and JIRA_API_TOKEN are set.');
    process.exit(1);
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  console.log(`Testing JIRA connection for user: ${username} at ${normalizedBaseUrl}...`);

  const authHeader = `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`;

  try {
    const response = await fetch(`${normalizedBaseUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully connected to JIRA.');
      console.log(`Logged in as: ${data.displayName} (${data.emailAddress})`);
    } else {
      console.error(`❌ JIRA connection failed with status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`Response text: ${text}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during JIRA connection test:');
    console.error(error.message);
    process.exit(1);
  }
}

testJiraConnection();
