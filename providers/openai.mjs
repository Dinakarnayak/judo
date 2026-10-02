import { BaseProvider, extractText, postJson } from './base.mjs';

export class OpenAIProvider extends BaseProvider {
  constructor(env) {
    super({ id: 'openai', label: 'ChatGPT', apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5.5' });
  }

  async respond({ message, history = [], attachments = [], webSearch = false, system = '' }) {
    const input = history.slice(-12).map(item => ({ role: item.role, content: item.content }));
    const content = [{ type: 'input_text', text: message }];
    for (const file of attachments) {
      if (file.mimeType.startsWith('image/')) content.push({ type: 'input_image', image_url: `data:${file.mimeType};base64,${file.data}` });
      else if (file.mimeType === 'application/pdf') content.push({ type: 'input_file', filename: file.name, file_data: `data:${file.mimeType};base64,${file.data}` });
      else content.push({ type: 'input_text', text: `\n\n[Attached file: ${file.name}]\n${Buffer.from(file.data, 'base64').toString('utf8').slice(0, 120000)}` });
    }
    input.push({ role: 'user', content });
    const body = { model: this.model, instructions: system, input, max_output_tokens: 1800 };
    if (webSearch) body.tools = [{ type: 'web_search' }];
    const response = await postJson('https://api.openai.com/v1/responses', body, { Authorization: `Bearer ${this.apiKey}` });
    const text = extractText(response.output);
    if (!text) throw new Error('ChatGPT returned no text.');
    return { text, citations: [] };
  }
}

