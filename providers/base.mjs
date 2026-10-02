export class BaseProvider {
  constructor({ id, label, apiKey, model }) { this.id = id; this.label = label; this.apiKey = apiKey; this.model = model; }
  get available() { return Boolean(this.apiKey); }
  async respond() { throw new Error('Provider must implement respond().'); }
}

export async function postJson(url, body, headers = {}) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: { message: text || `HTTP ${response.status}` } }; }
  if (!response.ok) {
    const message = data.error?.message || data.message || `Provider returned HTTP ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data.error?.code || data.error?.type || 'provider_error';
    throw error;
  }
  return data;
}

export function extractText(output = []) {
  return output.filter(item => item.type === 'message').flatMap(item => item.content || []).filter(part => part.type === 'output_text').map(part => part.text).join('\n');
}

