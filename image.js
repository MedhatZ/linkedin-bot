import axios from 'axios';
import { getConfig } from './config.js';
import { buildAgentRouterHeaders } from './generator.js';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 627;

async function callClaude(userPrompt, maxTokens = 300) {
  const { anthropicApiKey: apiKey, anthropicEndpoint: endpoint, anthropicModel: model } = getConfig();
  const url = `${endpoint.replace(/\/$/, '')}/messages`;

  const response = await axios.post(
    url,
    {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userPrompt }],
    },
    {
      headers: buildAgentRouterHeaders(apiKey),
      timeout: 60000,
    }
  );

  const textBlock = response.data?.content?.find((block) => block.type === 'text');
  return textBlock?.text?.trim() || '';
}

export async function generateImagePrompt(content, topicSelection) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    return (
      `Cinematic wide-angle tech illustration about ${topicSelection.topic.category}, ` +
      'abstract modern professional, glowing neural networks and code motifs, ' +
      'rich depth and vibrant lighting, no text no logos, LinkedIn cover art style'
    );
  }

  const hook = content.split('\n').find((line) => line.trim())?.trim() || topicSelection.topic.category;

  const prompt = `You create visual prompts for LinkedIn post cover images.

Post hook: "${hook}"
Topic: ${topicSelection.topic.category}
Angle: ${topicSelection.angle}

Write ONE image generation prompt (2-3 sentences) for a stunning, cinematic, modern tech illustration.
Requirements:
- Visually striking, professional, scroll-stopping
- Abstract or metaphorical (no logos, no brand names)
- NO text, letters, words, or watermarks in the image
- Rich lighting, depth, vibrant but polished colors
- Suitable as a LinkedIn feed image (landscape 1.91:1)

Return ONLY the prompt text, nothing else.`;

  return callClaude(prompt, 200);
}

export async function fetchPostImage(imagePrompt) {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}` +
    `?width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true&seed=${Date.now()}`;

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    headers: { Accept: 'image/*' },
  });

  if (!response.data?.byteLength) {
    throw new Error('Image API returned empty response');
  }

  return Buffer.from(response.data);
}

export async function generatePostImage(content, topicSelection) {
  const imagePrompt = await generateImagePrompt(content, topicSelection);
  console.log(`[${new Date().toISOString()}] Image prompt: ${imagePrompt.slice(0, 120)}...`);

  const imageBuffer = await fetchPostImage(imagePrompt);
  console.log(`[${new Date().toISOString()}] Image generated (${Math.round(imageBuffer.length / 1024)} KB)`);

  return { imageBuffer, imagePrompt };
}
