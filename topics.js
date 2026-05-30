import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, '.topic-state.json');

export const TOPICS = [
  {
    id: 'programming',
    category: 'Programming tips & best practices',
    description: 'JS, Python, system design, clean code, and engineering fundamentals',
  },
  {
    id: 'career',
    category: 'Tech career & interview prep',
    description: 'DSA, behavioral interviews, salary negotiation, and career growth',
  },
  {
    id: 'ai',
    category: 'AI & LLM news and practical usage',
    description: 'Latest AI trends, LLM workflows, and practical developer applications',
  },
  {
    id: 'learning',
    category: 'Learning roadmaps & resources',
    description: 'Curated learning paths, courses, books, and skill-building guides',
  },
  {
    id: 'productivity',
    category: 'Developer productivity & tools',
    description: 'IDEs, CLI tools, workflows, and habits that boost output',
  },
  {
    id: 'opensource',
    category: 'Open source & side projects',
    description: 'Contributing to OSS, building side projects, and shipping in public',
  },
  {
    id: 'industry',
    category: 'Tech industry insights & trends',
    description: 'Market trends, company culture, remote work, and industry shifts',
  },
];

export const ANGLES = [
  'hot take',
  'step-by-step tip',
  'common mistake + fix',
  'resource recommendation',
  'industry observation',
  'interview question + answer',
  'AI tool breakdown',
  'career advice story',
  'code snippet with explanation',
  'myth vs reality',
];

function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { lastTopicId: null, lastAngle: null };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { lastTopicId: null, lastAngle: null };
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function pickAngle(state) {
  const available = ANGLES.filter((a) => a !== state.lastAngle);
  const angle = available[Math.floor(Math.random() * available.length)];
  return angle;
}

/**
 * Select today's topic using day-of-week rotation with no-repeat fallback.
 * Primary: topic index = dayOfWeek % topic count.
 * If that matches yesterday's topic, pick the next available one.
 */
export function selectTopicForToday(date = new Date()) {
  const state = loadState();
  const dayOfWeek = date.getDay();
  let topicIndex = dayOfWeek % TOPICS.length;
  let topic = TOPICS[topicIndex];

  if (topic.id === state.lastTopicId) {
    topicIndex = (topicIndex + 1) % TOPICS.length;
    topic = TOPICS[topicIndex];
  }

  const angle = pickAngle(state);
  saveState({ lastTopicId: topic.id, lastAngle: angle });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    topic,
    angle,
    date: date.toISOString().split('T')[0],
    dayName: dayNames[dayOfWeek],
  };
}
