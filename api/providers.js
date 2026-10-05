function provider(id, label, model, available) {
  return { id, label, model, available };
}

function providerStatus() {
  const env = process.env;
  return [
    provider('ollama', 'Ollama local', env.OLLAMA_MODEL || 'llama3.2', env.OLLAMA_ENABLED === 'true'),
    provider('gemini', 'Gemini', env.GEMINI_MODEL || 'gemini-2.5-flash', Boolean(env.GEMINI_API_KEY)),
    provider('groq', 'Groq', env.GROQ_MODEL || 'llama-3.3-70b-versatile', Boolean(env.GROQ_API_KEY)),
    provider('openrouter', 'OpenRouter', env.OPENROUTER_MODEL || 'openai/gpt-4o-mini', Boolean(env.OPENROUTER_API_KEY)),
    provider('huggingface', 'Hugging Face', env.HF_MODEL || 'Qwen/Qwen2.5-72B-Instruct', Boolean(env.HF_TOKEN)),
    provider('openai', 'OpenAI', env.OPENAI_MODEL || 'gpt-5.5', Boolean(env.OPENAI_API_KEY)),
    provider('claude', 'Claude', env.CLAUDE_MODEL || 'claude-sonnet-4-6', Boolean(env.ANTHROPIC_API_KEY))
  ];
}

export default function handler(req, res) {
  const origin = req.headers.origin;
  if (origin === 'https://dinakarnayak.github.io' || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({ providers: providerStatus() });
}
