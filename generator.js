import axios from 'axios';

const SYSTEM_PROMPT = `You are a senior software engineer and tech educator with 10+ years of experience.
You write LinkedIn posts that feel human, insightful, and valuable — not corporate fluff.
Your audience: developers, CS students, and tech professionals.`;

const MODEL = 'claude-opus-4-6';

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

async function callClaude(apiKey, endpoint, userPrompt) {
  const url = `${endpoint.replace(/\/$/, '')}/messages`;

  const response = await axios.post(
    url,
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        Authorization: `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14',
        'anthropic-dangerous-direct-browser-access': 'true',
        'User-Agent': 'claude-cli/1.0.110 (external, cli)',
        'x-app': 'cli',
        'x-stainless-lang': 'js',
        'x-stainless-package-version': '0.55.1',
        'x-stainless-os': 'Windows',
        'x-stainless-arch': 'x64',
        'x-stainless-runtime': 'node',
        'x-stainless-runtime-version': 'v22.14.0',
        'content-type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const content = response.data?.content;
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Claude API returned empty content');
  }

  const textBlock = content.find((block) => block.type === 'text');
  if (!textBlock?.text?.trim()) {
    throw new Error('Claude API returned no text block');
  }

  return textBlock.text.trim();
}

export async function generatePost(topicSelection) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const endpoint = process.env.ANTHROPIC_ENDPOINT || 'https://agentrouter.org/v1';

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const userPrompt = buildUserPrompt(topicSelection);

  try {
    return await callClaude(apiKey, endpoint, userPrompt);
  } catch (firstError) {
    console.warn(`[${new Date().toISOString()}] Claude API failed, retrying once...`, firstError.message);

    try {
      return await callClaude(apiKey, endpoint, userPrompt);
    } catch (retryError) {
      throw new Error(`Claude API failed after retry: ${retryError.message}`);
    }
  }
}
