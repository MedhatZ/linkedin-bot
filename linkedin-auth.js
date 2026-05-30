import 'dotenv/config';
import axios from 'axios';
import { createServer } from 'http';
import { URL } from 'url';

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/callback';
const PORT = new URL(REDIRECT_URI).port || 3000;

const SCOPES = ['openid', 'profile', 'w_member_social'];

const PRODUCT_CHECKLIST = `
LinkedIn rejected the requested scopes. Enable BOTH products in your app:

  https://www.linkedin.com/developers/apps/250640038/products

  1. "Sign In with LinkedIn using OpenID Connect"  →  scopes: openid, profile
  2. "Share on LinkedIn"                         →  scope:  w_member_social

After requesting each product, wait 1–2 minutes and reload the Products page
until both show as "Added" (not "Request access" or "Pending").
`;

function fail(msg, extra = '') {
  console.error(`\n❌ ${msg}`);
  if (extra) console.error(extra);
  process.exit(1);
}

if (!CLIENT_ID) fail('LINKEDIN_CLIENT_ID is missing in .env');
if (!CLIENT_SECRET) fail('LINKEDIN_CLIENT_SECRET is missing in .env');

const authUrl =
  'https://www.linkedin.com/oauth/v2/authorization?' +
  new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
  });

console.log('\n=== LinkedIn OAuth Setup ===\n');
console.log('Required products (Products tab — both must be enabled):');
console.log('  • Sign In with LinkedIn using OpenID Connect');
console.log('  • Share on LinkedIn\n');
console.log('1. Add this Redirect URL in your LinkedIn app (Auth tab):');
console.log(`   ${REDIRECT_URI}\n`);
console.log('2. Open this URL in your browser and approve access:\n');
console.log(`   ${authUrl}\n`);
console.log('3. Waiting for callback...\n');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

  if (url.pathname !== new URL(REDIRECT_URI).pathname) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    res.writeHead(400);
    res.end(`Authorization failed: ${errorDescription || error}`);
    if (error === 'unauthorized_scope_error') {
      fail(`LinkedIn returned error: ${error}`, PRODUCT_CHECKLIST);
    }
    fail(`LinkedIn returned error: ${error}${errorDescription ? ` — ${errorDescription}` : ''}`);
  }

  if (!code) {
    res.writeHead(400);
    res.end('Missing authorization code');
    return;
  }

  try {
    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const personUrn = `urn:li:person:${userRes.data.sub}`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2>Success! You can close this tab.</h2><p>Check your terminal for the tokens.</p>');

    console.log('✅ Authorization successful!\n');
    console.log('Add these to your .env file:\n');
    console.log(`LINKEDIN_ACCESS_TOKEN=${accessToken}`);
    console.log(`LINKEDIN_PERSON_URN=${personUrn}`);
    console.log('\nToken expires in 60 days — set a reminder to re-run this script.\n');
  } catch (err) {
    res.writeHead(500);
    res.end('Token exchange failed. Check terminal.');
    fail(err.response?.data?.error_description || err.message);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT, () => {
  console.log(`Listening on ${REDIRECT_URI}`);
});
