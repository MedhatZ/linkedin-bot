# LinkedIn Daily Post Scheduler

Automated Node.js bot that generates and publishes daily LinkedIn posts about programming, tech education, interviews, and AI — powered by Claude AI.

## Quick Setup

1. **Clone and install**

   ```bash
   cd linkedin-bot
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in all values in `.env` (see sections below).

3. **Test locally**

   ```bash
   npm run post-now
   ```

4. **Run the scheduler**

   ```bash
   npm start
   ```

   Posts automatically every day at 1:00 PM Cairo time (`Africa/Cairo`).

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | API key for Claude via agentrouter |
| `ANTHROPIC_ENDPOINT` | Default: `https://agentrouter.org/v1` |
| `LINKEDIN_ACCESS_TOKEN` | OAuth 2.0 access token with `w_member_social` scope |
| `LINKEDIN_PERSON_URN` | Your LinkedIn person URN (e.g. `urn:li:person:ABC123`) |
| `POST_HOUR` | Hour to post (default: `13`) |
| `POST_MINUTE` | Minute to post (default: `0`) |
| `TIMEZONE` | IANA timezone (default: `Africa/Cairo`) |

---

## Getting a LinkedIn Access Token

### 1. Create a LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Create an app and add the **Share on LinkedIn** product
3. Note your **Client ID** and **Client Secret**

### 2. Get an Authorization Code

Open this URL in your browser (replace `YOUR_CLIENT_ID` and `YOUR_REDIRECT_URI`):

```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=openid%20profile%20w_member_social
```

After approving, copy the `code` from the redirect URL.

### 3. Exchange Code for Access Token

```bash
curl -X POST "https://www.linkedin.com/oauth/v2/accessToken" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=YOUR_REDIRECT_URI"
```

Copy the `access_token` from the response into `LINKEDIN_ACCESS_TOKEN`.

### 4. Get Your Person URN

```bash
curl -X GET "https://api.linkedin.com/v2/userinfo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

The `sub` field in the response is your member ID. Your URN is:

```
urn:li:person:YOUR_SUB_VALUE
```

Set this as `LINKEDIN_PERSON_URN` in `.env`.

---

## Running Locally vs GitHub Actions

### Locally

| Command | Description |
|---|---|
| `npm start` | Starts the cron scheduler (runs continuously) |
| `npm run post-now` | Generates and posts immediately (for testing) |

Logs are written to the console. Successful posts are saved to `posts-log.json`. Failed posts go to `failed-posts.json`.

### GitHub Actions

The workflow at `.github/workflows/daily-post.yml` runs automatically:

- **Schedule:** daily at 11:00 UTC (= 1:00 PM Cairo)
- **Manual trigger:** Actions tab → "Daily LinkedIn Post" → "Run workflow"

Add these secrets in your repo (**Settings → Secrets and variables → Actions**):

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_ENDPOINT`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_PERSON_URN`
- `POST_HOUR`
- `POST_MINUTE`
- `TIMEZONE`

---

## Rotating Your LinkedIn Token (Every 60 Days)

LinkedIn access tokens expire after **60 days**. Set a calendar reminder to refresh before expiry.

### Option A: Refresh Token Flow (recommended for automation)

If your app has the refresh token flow enabled:

```bash
curl -X POST "https://www.linkedin.com/oauth/v2/accessToken" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

Update `LINKEDIN_ACCESS_TOKEN` in `.env` and your GitHub secret.

### Option B: Re-authorize Manually

Repeat the authorization steps above to get a new access token, then update:

1. Local `.env` file
2. GitHub Actions secret `LINKEDIN_ACCESS_TOKEN`

If a post fails due to an expired token, the bot logs a warning and saves the content to `failed-posts.json` so you can publish it manually after refreshing the token.

---

## Project Structure

```
linkedin-bot/
├── index.js          # Scheduler + main workflow
├── generator.js      # Claude AI content generation
├── linkedin.js       # LinkedIn UGC API wrapper
├── topics.js         # Rotating topic categories
├── posts-log.json    # Last 30 successful posts (auto-created)
├── failed-posts.json # Failed posts for manual review (auto-created)
├── .env.example
├── package.json
└── README.md
```

## Content Strategy

Topics rotate daily across 7 categories:

- Programming tips & best practices
- Tech career & interview prep
- AI & LLM news and practical usage
- Learning roadmaps & resources
- Developer productivity & tools
- Open source & side projects
- Tech industry insights & trends

Each post uses a random format angle (hot take, step-by-step tip, interview Q&A, etc.) with no repeat from the previous day.
