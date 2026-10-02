import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './src/config.mjs';
import { providerStatus, runJudo } from './src/judo-core.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(env.PORT || 4173);
const maxBody = 18 * 1024 * 1024;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

async function readJson(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBody) throw Object.assign(new Error('Request is too large (18 MB maximum).'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (req.method === 'GET' && pathname === '/api/providers') return sendJson(res, 200, { providers: providerStatus() });
  if (req.method === 'POST' && pathname === '/api/chat') {
    try {
      const body = await readJson(req);
      const message = String(body.message || '').trim();
      if (!message && !body.attachments?.length) return sendJson(res, 400, { error: 'Write a message or attach a file.' });
      const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : [];
      for (const file of attachments) {
        if (!file || typeof file.name !== 'string' || typeof file.mimeType !== 'string' || typeof file.data !== 'string' || file.data.length > 12_000_000) {
          return sendJson(res, 400, { error: 'An attachment was invalid or too large.' });
        }
      }
      const result = await runJudo({
        message: message || 'Analyze the attached files and summarize the most useful findings.',
        history: Array.isArray(body.history) ? body.history.filter(item => ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-12) : [],
        attachments,
        mode: ['auto', 'collaborate', 'manual'].includes(body.mode) ? body.mode : 'auto',
        provider: body.provider || '',
        webSearch: Boolean(body.webSearch)
      });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, error.status || 502, { error: error.message, code: error.code || 'request_failed' });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end('Method not allowed'); }
  const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const file = path.resolve(root, `.${requested}`);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
});
server.listen(port, '127.0.0.1', () => console.log(`Judo is running locally at http://127.0.0.1:${port}`));

