export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
    ok: true,
    service: 'judo-api',
    runtime: 'vercel-node',
    message: 'Judo API function is running.'
  });
}
