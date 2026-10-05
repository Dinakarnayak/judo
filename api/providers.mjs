import { providerStatus } from '../src/judo-core.mjs';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://dinakarnayak.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({ providers: providerStatus() });
}
