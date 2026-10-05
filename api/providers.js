import { providerStatus } from '../src/judo-core.mjs';

export default function handler(req, res) {
  const origin = req.headers.origin;
  if (origin === 'https://dinakarnayak.github.io' || !origin) res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try { return res.status(200).json({ providers: providerStatus() }); }
  catch (error) { return res.status(500).json({ error: error.message || 'Provider status failed.' }); }
}
