import { BaseProvider, postJson } from './base.mjs';

export class GeminiProvider extends BaseProvider {
  constructor(env) {
    super({ id: 'gemini', label: 'Gemini', apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-2.5-flash' });
  }

  async respond({ message, history = [], attachments = [], webSearch = false, system = '' }) {
    const contents = history.slice(-12).map(item => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] }));
    const parts = [{ text: message }];
    for (const file of attachments) {
      if (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf' || file.mimeType.startsWith('video/')) {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
      } else {
        parts.push({ text: `\n\n[Attached file: ${file.name}]\n${Buffer.from(file.data, 'base64').toString('utf8').slice(0, 120000)}` });
      }
    }
    contents.push({ role: 'user', parts });
    const body = { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 1800 } };
    if (webSearch) body.tools = [{ googleSearch: {} }];
    const response = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, body, { 'x-goog-api-key': this.apiKey });
    const text = response.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    if (!text) throw new Error('Gemini returned no text.');
    const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({ title: chunk.web?.title || chunk.web?.uri, url: chunk.web?.uri })).filter(item => item.url) || [];
    return { text, citations };
  }
}

