export const env = process.env;

// Vercel and local Node both expose environment variables through process.env.
// Local development can load .env with the shell/launcher; no filesystem access is
// needed here, which keeps the serverless runtime portable.
export const voiceConfig = {
  bridgePort: Number(env.JUDO_BRIDGE_PORT || 8787),
  elevenLabsApiKey: env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: env.JUDO_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
  model: env.JUDO_AGENT_MODEL || 'auto',
  writesEnabled: env.JUDO_ALLOW_WRITES === 'true',
};
