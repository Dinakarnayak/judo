# Judo — one assistant, many minds

Judo is a local-first AI assistant that gives you one conversation while routing work across multiple AI providers. It combines Auto routing, multi-model collaboration, manual provider selection, file analysis, web search support, browser voice, and an optional Jarvis-inspired local voice/agent bridge.

The Jarvis upgrade is integrated into Judo rather than replacing Judo's provider architecture.

## What Judo can do

- **Auto mode** — chooses a configured provider and falls back automatically.
- **Collaborate** — asks multiple configured providers and synthesizes their answers.
- **Advanced mode** — select a specific provider.
- **Local AI** — Ollama support for private local inference.
- **Cloud AI** — Gemini, Groq, OpenRouter, Hugging Face, OpenAI and Claude adapters.
- **Files** — text, Markdown, CSV, JSON, PDF, images and video, subject to provider support.
- **Web search** — optional provider-supported search.
- **Projects and chats** — browser-local history and saved prompts.
- **Voice** — browser speech recognition plus optional Jarvis-style local VAD.
- **Barge-in foundation** — microphone remains available while voice interaction is active.
- **ElevenLabs STT/TTS** — optional, with API keys kept on the local bridge.
- **Claude Agent bridge** — optional local tool/agent runtime using the Claude Agent SDK.
- **Safety controls** — effectful tools are disabled by default.

## Architecture

```text
                         ┌──────────────────────┐
                         │       Judo UI        │
                         │ index.html/app.js    │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │     Judo server      │
                         │   server.mjs :4173   │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
       ┌──────▼──────┐       ┌──────▼──────┐      ┌──────▼──────┐
       │  Providers  │       │ Judo Core   │      │ Voice UI    │
       │ Gemini etc. │       │ routing     │      │ VAD/audio   │
       └─────────────┘       └─────────────┘      └──────┬──────┘
                                                        │
                                               ┌────────▼────────┐
                                               │ Jarvis bridge   │
                                               │ localhost:8787  │
                                               └────────┬────────┘
                                                        │
                                           ┌────────────▼────────────┐
                                           │ optional ElevenLabs /   │
                                           │ Claude Agent SDK tools  │
                                           └─────────────────────────┘
```

Judo remains the primary assistant. The Jarvis layer supplies voice, local VAD, optional TTS/STT, and a controlled agent bridge.

## Quick start

### Requirements

- Node.js 20+
- A modern browser such as Chrome or Edge
- At least one configured AI provider, or Ollama for local inference
- Microphone permission if using voice

### Install

```bash
npm install
```

Copy the example configuration:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### Start Judo

```bash
npm start
```

Open:

```text
http://127.0.0.1:4173
```

### Start Judo + Jarvis bridge together

```bash
npm run start:all
```

This starts:

- Judo UI/API: `127.0.0.1:4173`
- Jarvis voice/agent bridge: `127.0.0.1:8787`

You can also run the bridge separately:

```bash
npm run start:voice
```

## Provider configuration

| Provider | Environment variable | Notes |
|---|---|---|
| Ollama | `OLLAMA_ENABLED=true` | Local inference |
| Gemini | `GEMINI_API_KEY` | Google AI API |
| Groq | `GROQ_API_KEY` | Fast hosted models |
| OpenRouter | `OPENROUTER_API_KEY` | Multi-model gateway |
| Hugging Face | `HF_TOKEN` | Inference Providers |
| OpenAI | `OPENAI_API_KEY` | OpenAI API |
| Claude | `ANTHROPIC_API_KEY` | Anthropic API |

Provider quotas, pricing and model availability can change. Judo does not promise that a provider's free tier will remain free or available.

## Jarvis voice upgrade

The Jarvis-inspired layer is under `src/jarvis/`.

### Voice activity detection

`vad.mjs` provides:

- microphone echo cancellation
- noise suppression
- automatic gain control
- adaptive noise floor
- speech thresholding
- hysteresis
- segment capture
- microphone level reporting
- clean shutdown

The implementation is browser JavaScript, so it can be loaded directly by the Judo UI.

### Optional ElevenLabs voice

Add:

```env
ELEVENLABS_API_KEY=your_key
JUDO_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
```

The key stays on the local bridge. The browser sends audio/text to the local bridge rather than receiving the secret.

### Claude Agent bridge

The local bridge uses the Claude Agent SDK to provide a controlled tool/agent runtime.

The bridge deliberately uses a conservative policy:

```env
JUDO_ALLOW_WRITES=false
```

Read-only tools can run. Effectful operations such as shell commands, file writes, deletion, publishing, purchases or outbound actions remain blocked until you explicitly enable writes.

Do not enable writes on a machine you do not trust.

## Audio modules

`src/jarvis/audio.mjs`
- shared microphone stream
- analyser
- microphone level
- output analyser

`src/jarvis/sfx.mjs`
- synthesized boot/wake/listen/tool/done/error cues
- volume control
- voice ducking

`src/jarvis/kokoro.mjs`
- optional browser-side Kokoro TTS adapter
- WebGPU path when the optional package is installed
- automatic fallback when unavailable

## Alexa

The repository also contains an Alexa Lambda starter at `alexa/lambda.mjs`.

Alexa cannot directly reach a localhost-only Judo server. A deployed endpoint and appropriate account linking/storage are required for persistent cross-device conversations.

## Privacy

Judo is designed to keep provider keys on the local server.

- Ollama requests stay on the local machine.
- Remote provider requests and attachments go to the provider selected by Judo.
- ElevenLabs voice requests go through the local Jarvis bridge.
- Browser chat history is stored in localStorage.
- The local servers bind to loopback by default.
- No Judo account system is included.

Microphone access is only requested when you activate voice.

## Security

The Jarvis bridge validates browser origins and listens on loopback.

Write-capable tools are disabled by default. If you enable them, review the tool policy and environment first.

Never commit:

- `.env`
- API keys
- access tokens
- private certificates
- personal credentials

## Development checks

Run:

```bash
npm run check
```

This performs Node syntax checks on the core server, bridge and Jarvis browser modules.

## Project structure

```text
judo/
├── index.html
├── styles.css
├── app.js
├── server.mjs
├── jarvis-bridge.mjs
├── start-all.mjs
├── package.json
├── .env.example
├── providers/
│   ├── base.mjs
│   ├── compatible.mjs
│   ├── gemini.mjs
│   ├── openai.mjs
│   └── claude.mjs
├── src/
│   ├── config.mjs
│   ├── judo-core.mjs
│   └── jarvis/
│       ├── audio.mjs
│       ├── capabilities.mjs
│       ├── kokoro.mjs
│       ├── sfx.mjs
│       └── vad.mjs
└── alexa/
    └── lambda.mjs
```

## Credits

The voice/agent upgrade is inspired by the architecture and implementation ideas in the public [adewaskar/jarvis](https://github.com/adewaskar/jarvis) project.

Judo keeps its own provider routing, UI, storage model and project structure; the Jarvis functionality is selectively adapted rather than replacing the application.

## License

Check the repository license before redistributing the project or adapted components.
