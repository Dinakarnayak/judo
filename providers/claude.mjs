import { BaseProvider, postJson } from './base.mjs';

export class ClaudeProvider extends BaseProvider {
  constructor(env) {
    super({ id: 'claude', label: 'Claude', apiKey: env.ANTHROPIC_API_KEY, model: env.CLAUDE_MODEL || 'claude-sonnet-4-6' });
  }

  async respond({ message, history = [], attachments = [], webSearch = false, system = '' }) {
    const messages = history.slice(-12).map(item => ({ role: item.role, content: item.content }));
    const content = [{ type: 'text', text: message }];
    for (const file of attachments) {
      if (file.mimeType.startsWith('image/')) content.push({ type: 'image', source: { type: 'base64', media_type: file.mimeType, data: file.data } });
      else if (file.mimeType === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: file.mimeType, data: file.data } });
      else content.push({ type: 'text', text: `\n\n[Attached file: ${file.name}]\n${Buffer.from(file.data, 'base64').toString('utf8').slice(0, 120000)}` });
    }
    messages.push({ role: 'user', content });
    const body = { model: this.model, max_tokens: 1800, system, messages };
    const headers = { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' };
    if (webSearch) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];
      headers['anthropic-beta'] = 'web-search-2025-03-05';
    }
    const response = await postJson('https://api.anthropic.com/v1/messages', body, headers);
    const text = (response.content || []).filter(part => part.type === 'text').map(part => part.text).join('\n');
    if (!text) throw new Error('Claude returned no text.');
    return { text, citations: [] };
  }
}

