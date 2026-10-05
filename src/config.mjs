import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

export const env = process.env;

// Jarvis-style local voice bridge configuration.
// All secrets remain server-side in .env.
export const voiceConfig = {
  bridgePort: Number(env.JUDO_BRIDGE_PORT || 8787),
  elevenLabsApiKey: env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: env.JUDO_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
  model: env.JUDO_AGENT_MODEL || 'auto',
  writesEnabled: env.JUDO_ALLOW_WRITES === 'true',
};
