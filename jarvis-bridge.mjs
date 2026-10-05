import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { env, voiceConfig } from './src/config.mjs';
import { providerStatus, runJudo } from './src/judo-core.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = voiceConfig.bridgePort;
const ALLOW_WRITES = voiceConfig.writesEnabled;
const READ_ONLY_BUILTINS = new Set(['Read','Glob','Grep','WebFetch','WebSearch','TodoWrite','Task','Agent','ToolSearch','ListMcpResources','ReadMcpResource','BashOutput','TaskOutput']);
const WRITE_BUILTINS = new Set(['Bash','Write','Edit','MultiEdit','NotebookEdit','KillShell','TaskStop']);
const READ_VERB = /^(get|list|read|search|find|query|fetch|check|describe|inspect|show|view|explain|screenshot)/i;
const EFFECTFUL = /(send|call|post|create|delete|remove|update|edit|write|install|launch|tap|swipe|press|type|buy|pay|charge|publish|deploy|outbound|download)/i;

function originAllowed(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      ((Number(u.port) >= 5173 && Number(u.port) <= 5199) || (Number(u.port) >= 4173 && Number(u.port) <= 4199));
  } catch { return false; }
}

function configuredServers() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude.json'), 'utf8'));
    return { ...(cfg.mcpServers || {}) };
  } catch { return {}; }
}

const MCP_SERVERS = configuredServers();

function decideTool(name) {
  if (READ_ONLY_BUILTINS.has(name)) return true;
  if (WRITE_BUILTINS.has(name)) return ALLOW_WRITES;
  if (name.startsWith('mcp__')) {
    const parts = name.split('__');
    const server = parts[1] || '';
    const tool = parts.slice(2).join('__');
    if (server === 'judo') return true;
    if (EFFECTFUL.test(tool)) return ALLOW_WRITES;
    if (server === 'exa' || server === 'serper' || server === 'serpapi' || server === 'openrouter' || server === 'higgsfield' || server === 'elevenlabs') return true;
    return READ_VERB.test(tool) || ALLOW_WRITES;
  }
  return ALLOW_WRITES;
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

const httpServer = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !originAllowed(origin)) {
    res.writeHead(403); return res.end('forbidden');
  }
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { ok: true, tts: Boolean(voiceConfig.elevenLabsApiKey), stt: Boolean(voiceConfig.elevenLabsApiKey), providers: providerStatus() });
  }
  if (req.method === 'POST' && req.url === '/stt') {
    if (!voiceConfig.elevenLabsApiKey) return sendJson(res, 503, { error: 'ElevenLabs STT is not configured.' });
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 25 * 1024 * 1024) return sendJson(res, 413, { error: 'Audio too large.' }); chunks.push(chunk); }
    const type = String(req.headers['content-type'] || 'audio/webm');
    const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'mp4' : 'webm';
    try {
      const form = new FormData();
      form.append('model_id', 'scribe_v1');
      form.append('file', new Blob([Buffer.concat(chunks)], { type }), `speech.${ext}`);
      const upstream = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method:'POST', headers:{ 'xi-api-key': voiceConfig.elevenLabsApiKey }, body:form });
      if (!upstream.ok) return sendJson(res, upstream.status, { error: await upstream.text() });
      return sendJson(res, 200, { text: String((await upstream.json()).text || '').trim() });
    } catch (error) {
      return sendJson(res, 502, { error: String(error?.message || error) });
    }
  }
  if (req.method === 'POST' && req.url === '/tts') {
    if (!voiceConfig.elevenLabsApiKey) return sendJson(res, 503, { error: 'ElevenLabs TTS is not configured.' });
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 64 * 1024) return sendJson(res, 413, { error:'Text too large.' }); }
    let text; try { text = JSON.parse(body || '{}').text; } catch { return sendJson(res,400,{error:'Invalid JSON.'}); }
    if (!text) return sendJson(res,400,{error:'No text.'});
    try {
      const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.elevenLabsVoiceId}/stream?output_format=mp3_22050_32&optimize_streaming_latency=3`, {
        method:'POST', headers:{ 'xi-api-key':voiceConfig.elevenLabsApiKey, 'content-type':'application/json' },
        body:JSON.stringify({ text, model_id:'eleven_flash_v2_5', voice_settings:{ stability:0.4, similarity_boost:0.75, speed:1.05 } })
      });
      if (!upstream.ok) { res.writeHead(upstream.status); return res.end(await upstream.text()); }
      res.writeHead(200,{ 'content-type':'audio/mpeg','cache-control':'no-cache' });
      for await (const chunk of upstream.body) res.write(Buffer.from(chunk));
      return res.end();
    } catch(error) { res.writeHead(502); return res.end(String(error?.message || error)); }
  }
  if (req.method === 'GET' && req.url === '/api/providers') return sendJson(res,200,{providers:providerStatus()});
  if (req.method === 'GET' || req.method === 'HEAD') {
    const requested = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
    const file = path.resolve(ROOT, '.' + requested);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
    const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8' };
    res.writeHead(200,{ 'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store' });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file).pipe(res);
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false
});

wss.on('connection', (ws) => {
  let active = true;
  const send = (payload) => { if (active && ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload)); };
  send({ type:'ready', servers:Object.keys(MCP_SERVERS), writes:ALLOW_WRITES });

  ws.on('close', () => { active = false; });
  ws.on('message', async (raw) => {
    let msg; try { msg=JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === 'interrupt') return;
    if (msg.type !== 'ask' || !msg.text) return;

    const askId = String(msg.id || Date.now());
    let stopped = false;
    const abort = new AbortController();

    if (msg.type === 'ask') {
      send({ type:'status', ask:askId, status:'thinking' });
      try {
        const session = query({
          prompt: String(msg.text),
          options: {
            model: voiceConfig.model === 'auto' ? undefined : voiceConfig.model,
            effort: 'medium',
            mcpServers: MCP_SERVERS,
            settingSources: [],
            permissionMode: 'default',
            canUseTool: async (name) => decideTool(name) ? { behavior:'allow' } : { behavior:'deny', message:'Effectful tool disabled in Judo safe mode.' }
          }
        });
        for await (const event of session) {
          if (!active || stopped) break;
          if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text) send({ type:'text', ask:askId, delta:block.text });
              if (block.type === 'tool_use') send({ type:'tool', ask:askId, name:block.name || 'tool' });
            }
          } else if (event.type === 'result') {
            send({ type:'done', ask:askId, text:String(event.result || '').trim() });
          }
        }
      } catch(error) {
        send({ type:'error', ask:askId, message:String(error?.message || error) });
      }
    }
  });
});

httpServer.on('upgrade', (req, socket, head) => {
  const origin = req.headers.origin;
  if (!originAllowed(origin)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); return socket.destroy(); }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

httpServer.listen(PORT, '127.0.0.1', () => console.log(`Judo voice bridge: http://127.0.0.1:${PORT}`));
