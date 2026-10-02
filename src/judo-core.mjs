import { env } from './config.mjs';
import { OpenAIProvider } from '../providers/openai.mjs';
import { ClaudeProvider } from '../providers/claude.mjs';
import { GeminiProvider } from '../providers/gemini.mjs';

const registry = [new OpenAIProvider(env), new ClaudeProvider(env), new GeminiProvider(env)];
const byId = new Map(registry.map(provider => [provider.id, provider]));
const systemPrompt = 'You are Judo, one helpful assistant that can coordinate specialized AI systems behind the scenes. Speak as Judo, not as a committee. Give a clear, useful, accurate answer. Never invent which providers were used. When synthesizing, reconcile disagreements, preserve uncertainty, and remove repetition.';

export function providerStatus() {
  return registry.map(provider => ({ id: provider.id, label: provider.label, available: provider.available, model: provider.model }));
}

function autoPlan(message, attachments, available) {
  const text = message.toLowerCase();
  const multimodal = attachments.some(file => file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/'));
  const document = attachments.length > 0 || /paper|document|pdf|long report|summari[sz]e|methodology|presentation/.test(text);
  const complex = /compare|disagree|critique|evaluate|deep analysis|comprehensive|multiple perspectives|research/.test(text) || (document && /create|analy[sz]e|review|weakness|presentation/.test(text));
  const coding = /\b(code|debug|program|function|api|typescript|javascript|python|sql)\b/.test(text);
  let preferred, rationale;
  if (multimodal) { preferred = ['gemini', 'openai']; rationale = 'multimodal input'; }
  else if (document) { preferred = ['claude', 'openai']; rationale = 'document analysis'; }
  else if (coding) { preferred = ['openai', 'claude']; rationale = 'coding and reasoning'; }
  else { preferred = ['openai', 'claude', 'gemini']; rationale = 'general assistance'; }
  if (complex) { preferred = ['openai', 'claude', 'gemini']; rationale = 'complex task benefits from cross-model collaboration'; }
  const availableIds = new Set(available.map(item => item.id));
  const selected = preferred.filter(id => availableIds.has(id));
  return { selected: selected.length ? selected : available.slice(0, 1).map(item => item.id), rationale };
}

export async function runJudo({ message, history = [], attachments = [], mode = 'auto', provider = '', webSearch = false }) {
  const available = registry.filter(item => item.available);
  if (!available.length) {
    const error = new Error('Connect at least one provider API key in the local .env file to use Judo.');
    error.status = 503; error.code = 'no_providers_configured'; throw error;
  }
  let selected, rationale;
  if (mode === 'manual') {
    const chosen = byId.get(provider);
    if (!chosen || !chosen.available) {
      const error = new Error(`The ${chosen?.label || 'selected'} provider is not configured. Add its API key in .env.`);
      error.status = 400; error.code = 'provider_not_configured'; throw error;
    }
    selected = [chosen.id]; rationale = 'selected in advanced mode';
  } else if (mode === 'collaborate') {
    selected = available.map(item => item.id); rationale = 'you requested a collaborative answer';
  } else {
    const plan = autoPlan(message, attachments, available); selected = plan.selected; rationale = plan.rationale;
  }

  // In Auto, try the best-fit provider first, then fall back if its key, quota, or service is unavailable.
  if (mode === 'auto' && selected.length === 1) {
    const attempted = [];
    const order = [...selected, ...available.map(item => item.id).filter(id => !selected.includes(id))];
    for (const id of order) {
      const item = byId.get(id);
      try {
        const answer = await item.respond({ message, history, attachments, webSearch, system: systemPrompt });
        return { text: answer.text, providers: [{ id, label: item.label, model: item.model }], rationale: id === selected[0] ? rationale : `${rationale}; ${item.label} fallback`, synthesized: false, citations: answer.citations || [] };
      } catch (error) { attempted.push(`${item.label}: ${error.message}`); }
    }
    const error = new Error(attempted.join(' | ') || 'No provider returned a response.');
    error.status = 502; error.code = 'all_providers_failed'; throw error;
  }

  const results = await Promise.all(selected.map(async id => {
    const item = byId.get(id);
    try { return { id, label: item.label, model: item.model, ...await item.respond({ message, history, attachments, webSearch, system: systemPrompt }) }; }
    catch (error) { return { id, label: item.label, model: item.model, error: error.message, code: error.code }; }
  }));
  const successful = results.filter(result => result.text);
  if (!successful.length) {
    const error = new Error(results.map(result => `${result.label}: ${result.error}`).join(' | ') || 'No provider returned a response.');
    error.status = 502; error.code = 'all_providers_failed'; throw error;
  }
  let text = successful[0].text, synthesized = false;
  if (successful.length > 1) {
    const contributions = successful.map(result => `### ${result.label}\n${result.text}`).join('\n\n');
    const synthesizer = byId.get(successful[1].id);
    try {
      const final = await synthesizer.respond({ message: `Create one answer for the user from the model contributions below. Resolve contradictions where possible, call out unresolved differences briefly, and keep the result concise.\n\nUser's request: ${message}\n\n${contributions}`, system: systemPrompt });
      text = final.text; synthesized = true;
    } catch { text = contributions; }
  }
  const citations = successful.flatMap(result => result.citations || []);
  return { text, providers: successful.map(({ id, label, model }) => ({ id, label, model })), rationale, synthesized, citations: [...new Map(citations.map(item => [item.url, item])).values()] };
}

