import { runJudo } from '../src/judo-core.mjs';

function cors(res) {
  const origin = process.env.NODE_ENV === 'production' ? 'https://dinakarnayak.github.io' : '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = String(body.message || '').trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : [];
    if (!message && !attachments.length) return res.status(400).json({ error: 'Write a message or attach a file.' });
    for (const file of attachments) {
      if (!file || typeof file.name !== 'string' || typeof file.mimeType !== 'string' || typeof file.data !== 'string' || file.data.length > 12_000_000) {
        return res.status(400).json({ error: 'An attachment was invalid or too large.' });
      }
    }
    const result = await runJudo({
      message: message || 'Analyze the attached files and summarize the most useful findings.',
      history: Array.isArray(body.history)
        ? body.history.filter(item => ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-12)
        : [],
      attachments,
      mode: ['auto', 'collaborate', 'manual'].includes(body.mode) ? body.mode : 'auto',
      provider: body.provider || '',
      webSearch: Boolean(body.webSearch)
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Judo request failed.', code: error.code || 'request_failed' });
  }
}
