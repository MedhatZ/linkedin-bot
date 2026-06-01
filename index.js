import 'dotenv/config';
import cron from 'node-cron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { selectTopicForToday } from './topics.js';
import { generatePost } from './generator.js';
import { generatePostImage } from './image.js';
import { publishPost } from './linkedin.js';
import { getConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_LOG_FILE = join(__dirname, 'posts-log.json');
const FAILED_POSTS_FILE = join(__dirname, 'failed-posts.json');
const IMAGES_DIR = join(__dirname, 'generated-images');
const MAX_LOG_ENTRIES = 30;

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error?.message || error);
}

function readJsonFile(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function appendToPostsLog(entry) {
  const log_entries = readJsonFile(POSTS_LOG_FILE, []);
  log_entries.unshift(entry);
  writeJsonFile(POSTS_LOG_FILE, log_entries.slice(0, MAX_LOG_ENTRIES));
}

function saveFailedPost(entry) {
  const failed = readJsonFile(FAILED_POSTS_FILE, []);
  failed.unshift(entry);
  writeJsonFile(FAILED_POSTS_FILE, failed);
}

export async function runDailyPost() {
  const { anthropicModel } = getConfig();
  log(`Starting daily post workflow (model: ${anthropicModel})...`);

  const topicSelection = selectTopicForToday();
  log(`Selected topic: "${topicSelection.topic.category}" | Angle: "${topicSelection.angle}"`);

  let content;
  try {
    log('Generating content with Claude...');
    content = await generatePost(topicSelection);
    log(`Content generated (${content.length} chars)`);
  } catch (error) {
    logError('Content generation failed', error);
    saveFailedPost({
      timestamp: new Date().toISOString(),
      stage: 'generation',
      topic: topicSelection.topic.category,
      angle: topicSelection.angle,
      error: error.message,
    });
    throw error;
  }

  try {
    log('Generating cover image...');
    let imageBuffer = null;
    let imagePrompt = null;

    try {
      const imageResult = await generatePostImage(content, topicSelection);
      imageBuffer = imageResult.imageBuffer;
      imagePrompt = imageResult.imagePrompt;

      if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });
      const imagePath = join(IMAGES_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`);
      writeFileSync(imagePath, imageBuffer);
      log(`Image saved to ${imagePath}`);
    } catch (imageError) {
      logError('Image generation failed, posting text only', imageError);
    }

    log('Publishing to LinkedIn...');
    const { postId } = await publishPost(content, imageBuffer);

    appendToPostsLog({
      timestamp: new Date().toISOString(),
      postId,
      topic: topicSelection.topic.category,
      angle: topicSelection.angle,
      content,
      hasImage: Boolean(imageBuffer),
      imagePrompt,
    });

    log('Daily post workflow completed successfully.');
    return { postId, content };
  } catch (error) {
    logError('LinkedIn publish failed', error);
    saveFailedPost({
      timestamp: new Date().toISOString(),
      stage: 'publish',
      topic: topicSelection.topic.category,
      angle: topicSelection.angle,
      content,
      error: error.message,
    });
    throw error;
  }
}

function startScheduler() {
  const hour = process.env.POST_HOUR || '13';
  const minute = process.env.POST_MINUTE || '0';
  const timezone = process.env.TIMEZONE || 'Africa/Cairo';

  const cronExpression = `${minute} ${hour} * * *`;

  log(`Scheduler started. Cron: "${cronExpression}" (${timezone})`);

  cron.schedule(
    cronExpression,
    async () => {
      try {
        await runDailyPost();
      } catch (error) {
        logError('Scheduled post run failed', error);
      }
    },
    { timezone }
  );

  log('Waiting for next scheduled run. Use --now to post immediately.');
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
const postNow = process.argv.includes('--now');

if (isDirectRun) {
  if (postNow) {
    runDailyPost()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    startScheduler();
  }
}
