import { providerStatus } from '../src/judo-core.mjs';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try { return res.status(200).json({ ok: true, service: 'judo-api', providers: providerStatus() }); }
  catch (error) { return res.status(500).json({ ok: false, error: error.message || 'Health check failed.' }); }
}
