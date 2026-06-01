import axios from 'axios';
import { getConfig } from './config.js';
import { generateFromTemplate, shouldUseTemplateOnly } from './templates.js';

const SYSTEM_PROMPT = `You are a senior software engineer and tech educator with 10+ years of experience.
You write LinkedIn posts that feel human, insightful, and valuable — not corporate fluff.
Your audience: developers, CS students, and tech professionals.`;

function getStainlessOs() {
  switch (process.platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'MacOS';
    default:
      return 'Linux';
  }
}

export function buildAgentRouterHeaders(apiKey) {
  return {
    'x-api-key': apiKey,
    Authorization: `Bearer ${apiKey}`,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14',
    'anthropic-dangerous-direct-browser-access': 'true',
    'User-Agent': 'claude-cli/1.0.110 (external, cli)',
    'x-app': 'cli',
    'x-stainless-lang': 'js',
    'x-stainless-package-version': '0.55.1',
    'x-stainless-os': getStainlessOs(),
    'x-stainless-arch': process.arch === 'arm64' ? 'arm64' : 'x64',
    'x-stainless-runtime': 'node',
    'x-stainless-runtime-version': process.version,
    'content-type': 'application/json',
  };
}

function buildUserPrompt({ date, dayName, topic, angle }) {
  return `Write a LinkedIn post for today.

Date: ${date} (${dayName})
Topic category: ${topic.category}
Topic focus: ${topic.description}
Format/angle: ${angle}

Post requirements:
- 150–250 words
- First line = scroll-stopping hook
- Include code block when relevant (use \`\`\` formatting)
- 1 actionable takeaway
- End with an engaging question
- 4–6 relevant hashtags (#programming #coding #AI #tech #career #softwareengineering)
- Max 2 emojis
- Language: English

Return ONLY the post text. No preamble, no explanation, no markdown wrapper around the entire post.`;
}

function isAgentRouter(endpoint) {
  return endpoint.includes('agentrouter.org');
}

function isWafBlocked(data) {
  if (typeof data === 'string') {
    const lower = data.toLowerCase();
    return lower.includes('<!doctype') || lower.includes('aliyun_waf');
  }
  return false;
}

function extractTextFromResponse(data) {
  if (!data) return null;

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  if (Array.isArray(data.content)) {
    const text = data.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
      .trim();
    if (text) return text;
  }

  const openAiText = data.choices?.[0]?.message?.content;
  if (typeof openAiText === 'string' && openAiText.trim()) {
    return openAiText.trim();
  }

  return null;
}

function parseResponseBody(body) {
  if (isWafBlocked(body)) {
    throw new Error('WAF_BLOCKED: API gateway blocked this server IP');
  }
  try {
    return JSON.parse(body);
  } catch {
    if (typeof body === 'string') {
      throw new Error(`API returned non-JSON: ${body.slice(0, 120)}`);
    }
    throw new Error('Invalid JSON from API');
  }
}

async function callViaMessages(apiKey, endpoint, userPrompt) {
  const { anthropicModel: model } = getConfig();
  const url = `${endpoint.replace(/\/$/, '')}/messages`;

  const response = await axios.post(
    url,
    {
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    },
    {
      headers: buildAgentRouterHeaders(apiKey),
      timeout: 90000,
      transformResponse: [(body) => body],
      responseType: 'text',
    }
  );

  const data = parseResponseBody(response.data);
  const text = extractTextFromResponse(data);
  if (text) return text;

  throw new Error(`Empty content from messages API: ${JSON.stringify(data).slice(0, 300)}`);
}

async function callViaChatCompletions(apiKey, endpoint, userPrompt) {
  const { anthropicModel: model } = getConfig();
  const url = `${endpoint.replace(/\/$/, '')}/chat/completions`;

  const response = await axios.post(
    url,
    {
      model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: buildAgentRouterHeaders(apiKey),
      timeout: 90000,
      transformResponse: [(body) => body],
      responseType: 'text',
    }
  );

  const data = parseResponseBody(response.data);
  const text = extractTextFromResponse(data);
  if (text) return text;

  throw new Error(`Empty content from chat API: ${JSON.stringify(data).slice(0, 300)}`);
}

async function callClaude(apiKey, endpoint, userPrompt) {
  if (isAgentRouter(endpoint)) {
    try {
      return await callViaMessages(apiKey, endpoint, userPrompt);
    } catch {
      return await callViaChatCompletions(apiKey, endpoint, userPrompt);
    }
  }
  return callViaMessages(apiKey, endpoint, userPrompt);
}

function shouldFallbackToTemplate(error) {
  const msg = error?.message || '';
  return (
    msg.includes('WAF_BLOCKED') ||
    msg.includes('empty content') ||
    msg.includes('Empty content') ||
    msg.includes('unauthorized client') ||
    msg.includes('non-JSON')
  );
}

export async function generatePost(topicSelection) {
  if (shouldUseTemplateOnly()) {
    const post = generateFromTemplate(topicSelection);
    console.log(
      `[${new Date().toISOString()}] Using template post (GitHub Actions — AgentRouter blocked on cloud servers)`
    );
    return { content: post, usedTemplate: true };
  }

  const { anthropicApiKey: apiKey, anthropicEndpoint: endpoint } = getConfig();

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const userPrompt = buildUserPrompt(topicSelection);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (attempt > 1) {
        console.warn(`[${new Date().toISOString()}] Retrying Claude (attempt ${attempt}/2)...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
      const content = await callClaude(apiKey, endpoint, userPrompt);
      return { content, usedTemplate: false };
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] Claude failed (attempt ${attempt}/2):`, error.message);
      if (shouldFallbackToTemplate(error) && attempt === 2) break;
    }
  }

  const post = generateFromTemplate(topicSelection);
  console.log(`[${new Date().toISOString()}] Falling back to template post (${post.length} chars)`);
  return { content: post, usedTemplate: true };
}
