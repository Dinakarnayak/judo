import { BaseProvider, postJson } from './base.mjs';

// Shared adapter for OpenAI-compatible inference APIs (including local Ollama).
export class CompatibleProvider extends BaseProvider {
  constructor({ id, label, apiKey, model, baseUrl, enabled = true, local = false }) {
    super({ id, label, apiKey: apiKey || (local ? 'local' : ''), model });
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.enabled = enabled;
    this.local = local;
  }
  get available() { return this.enabled && (this.local || Boolean(this.apiKey)); }

  async respond({ message, history = [], attachments = [], system = '' }) {
    const messages = [{ role: 'system', content: system }, ...history.slice(-12).map(item => ({ role: item.role, content: item.content }))];
    const content = [{ type: 'text', text: message }];
    for (const file of attachments) {
      if (file.mimeType.startsWith('image/')) content.push({ type: 'image_url', image_url: { url: `data:${file.mimeType};base64,${file.data}` } });
      else content.push({ type: 'text', text: `\n\n[Attached file: ${file.name}]\n${Buffer.from(file.data, 'base64').toString('utf8').slice(0, 100000)}` });
    }
    messages.push({ role: 'user', content: content.length === 1 ? message : content });
    const headers = this.local ? {} : { Authorization: `Bearer ${this.apiKey}` };
    const data = await postJson(`${this.baseUrl}/chat/completions`, { model: this.model, messages, max_tokens: 1800 }, headers);
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`${this.label} returned no text.`);
    return { text, citations: [] };
  }
}
