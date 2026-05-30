import 'dotenv/config';
import axios from 'axios';
import { getConfig } from './config.js';
import { buildAgentRouterHeaders } from './generator.js';

const config = getConfig();

function fail(label, error) {
  const detail = error.response?.data?.error?.message || error.response?.data?.message || error.message;
  console.error(`❌ ${label}: ${detail}`);
  process.exit(1);
}

async function testClaude() {
  if (!config.anthropicApiKey) fail('Claude', new Error('ANTHROPIC_API_KEY is missing'));

  const url = `${config.anthropicEndpoint.replace(/\/$/, '')}/messages`;
  await axios.post(
    url,
    {
      model: 'claude-opus-4-6',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Reply with one word: ok' }],
    },
    { headers: buildAgentRouterHeaders(config.anthropicApiKey), timeout: 30000 }
  );
  console.log('✅ Claude API connected');
}

async function testLinkedIn() {
  if (!config.linkedinAccessToken) fail('LinkedIn', new Error('LINKEDIN_ACCESS_TOKEN is missing'));
  if (!config.linkedinPersonUrn) fail('LinkedIn', new Error('LINKEDIN_PERSON_URN is missing'));

  await axios.get('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${config.linkedinAccessToken}` },
    timeout: 30000,
  });
  console.log('✅ LinkedIn token valid');
}

const target = process.argv[2] || 'all';

try {
  if (target === 'claude' || target === 'all') await testClaude();
  if (target === 'linkedin' || target === 'all') await testLinkedIn();
  console.log('All checks passed.');
} catch (error) {
  fail(target, error);
}
