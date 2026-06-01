export function trimEnv(name, fallback = '') {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return value.trim();
}

export function getConfig() {
  return {
    anthropicApiKey: trimEnv('ANTHROPIC_API_KEY'),
    anthropicEndpoint: trimEnv('ANTHROPIC_ENDPOINT', 'https://agentrouter.org/v1'),
    anthropicModel: trimEnv('ANTHROPIC_MODEL', 'claude-opus-4-6'),
    linkedinAccessToken: trimEnv('LINKEDIN_ACCESS_TOKEN'),
    linkedinPersonUrn: trimEnv('LINKEDIN_PERSON_URN'),
  };
}
