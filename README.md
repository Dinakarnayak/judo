# Judo

Judo is one assistant that chooses a configured provider in Auto mode, with free/local services tried first. Collaborate sends the request to every configured provider and combines successful answers. Advanced lets you choose one provider. API keys stay on the local server and never go to the browser.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. To use a local model, install [Ollama](https://ollama.com/download), run `ollama pull llama3.2`, and set `OLLAMA_ENABLED=true` in `.env`. Ollama must be running locally.
4. Optionally add provider keys to `.env` (see below). Free tiers and quotas are controlled by each provider and may change.
5. On Windows, double-click `start-judo.bat`; otherwise run `npm start` from this folder.
6. Open `http://127.0.0.1:4173`.

## Providers

| Provider | Setup | Notes |
| --- | --- | --- |
| Ollama | `OLLAMA_ENABLED=true`; install and download a model | Local inference; no per-request API charge. Uses your computer's resources. |
| Gemini | `GEMINI_API_KEY` | Google AI Studio offers free-tier access to selected models with account-specific limits. |
| Groq | `GROQ_API_KEY` | Fast hosted open models; availability and free developer quotas can vary. |
| OpenRouter | `OPENROUTER_API_KEY` | Supports free model offerings; free model IDs and limits can change. |
| Hugging Face | `HF_TOKEN` | Inference Providers may use account credits and provider-specific models/limits. |
| ChatGPT / OpenAI API | `OPENAI_API_KEY` | Optional. ChatGPT subscription plans do not include API usage. |
| Claude / Anthropic API | `ANTHROPIC_API_KEY` | Optional API account integration. |

The current default model names are in `.env.example` and can be changed there. For a local Ollama model, pull it first using `ollama pull <model>` and set `OLLAMA_MODEL` to that same model name. Provider catalogs, model availability, account eligibility, and free quotas change over time; consult the provider's official docs: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Groq API](https://console.groq.com/docs/api-reference), [OpenRouter pricing](https://openrouter.ai/pricing/), [Ollama API](https://docs.ollama.com/api), and [Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers).

Auto mode chooses a single best-fit configured provider, preferring Ollama, Gemini, Groq, OpenRouter, and Hugging Face before optional OpenAI/Claude. If a provider is unavailable or out of quota, Judo tries the next configured provider. Media support depends on the selected provider. Use Collaborate only when you want parallel calls to all configured providers; external providers may consume paid quota even when some alternatives are free.

## Included capabilities

- Unified Judo chat with Auto, Collaborate, and Advanced modes.
- Modular adapters for Gemini, Groq, OpenRouter, Ollama, Hugging Face, OpenAI, and Claude.
- Free/local-first routing and fallback between configured providers.
- Provider attribution and routing reason details on each response.
- Text, image, PDF, and video attachments (support varies by provider).
- Optional provider web search tools and citations where supported.
- Browser microphone input, optional device read-aloud, conversation history, projects, and saved prompts.
- Alexa custom skill Lambda starter in `alexa/lambda.mjs`.

## Alexa setup and limits

The Alexa adapter handles launch, AskJudo, help, stop, and cancel requests. Add `ASK_SKILL_ID` and provider keys to the Lambda environment, install dependencies with `npm install`, and deploy `alexa/lambda.mjs` as the Lambda handler. Create a custom Alexa skill with an `AskJudoIntent` and a `query` slot, then connect its endpoint to the Lambda function.

Alexa requires a cloud-accessible skill endpoint; it cannot call a computer bound to localhost. The starter keeps short history in the Alexa skill session. Persistent conversation sharing between Alexa and the local browser requires account linking and hosted storage and is not part of this prototype.

## Privacy

Requests and attached files are sent to the selected remote provider. Ollama requests stay on the local machine. Review each remote provider's data terms and usage limits before configuring its key. Browser history stays in that browser profile. The app binds to `127.0.0.1` by default. No user accounts or long-term file storage are included.
