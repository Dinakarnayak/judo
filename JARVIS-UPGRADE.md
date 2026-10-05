# Judo Jarvis Upgrade

This branch upgrades Judo with selected architecture ideas from the public adewaskar/jarvis project without replacing Judo's existing multi-provider router.

## Added

- Local voice activity detection with microphone echo/noise controls.
- Optional ElevenLabs speech-to-text and text-to-speech through a local bridge.
- Continuous listening support suitable for wake-word/barge-in UX.
- Diagnostic-friendly voice architecture.
- Local WebSocket bridge using the Claude Agent SDK.
- Default-deny effectful tool policy. Tool writes remain disabled unless explicitly enabled.
- Provider status exposed by the bridge.
- A reusable Jarvis-inspired audio/sfx layer and Kokoro module for future neural TTS support.

## Preserved

- Judo Auto, Collaborate, and Advanced provider modes.
- Ollama, Gemini, Groq, OpenRouter, Hugging Face, OpenAI and Claude adapters.
- Existing attachments, projects, saved prompts, Alexa starter, and browser UI.
- API keys remain in local environment configuration rather than source code.

## Run

Copy `.env.example` to `.env`.

Start Judo normally:

`npm start`

Start the voice bridge separately:

`npm run start:voice`

The bridge listens on `127.0.0.1:8787` by default.

Set `ELEVENLABS_API_KEY` to enable cloud STT/TTS. Without it, the Judo browser microphone can still be used with its existing speech-recognition path.

## Safety

`JUDO_ALLOW_WRITES=false` by default. Outbound actions and other effectful tools are not enabled just because the model requests them.

## Source acknowledgement

The upgrade is inspired by and selectively adapted from the public architecture and implementation patterns in the `adewaskar/jarvis` project.

https://github.com/adewaskar/jarvis

This branch intentionally does not copy the entire Jarvis application or replace Judo's provider architecture.
