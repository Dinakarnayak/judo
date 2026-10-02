# Judo

Judo is one assistant that can route a request to several AI providers, combine their work, and return one response. Auto mode is the default; Collaborate asks every configured provider and synthesizes the successful results; Advanced lets the user choose one provider. The app keeps provider keys on the server and stores chat history in the current browser's local storage.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and add one or more API keys. The real `.env` is ignored by Git.
3. On Windows, double-click `start-judo.bat`; otherwise run `npm start` from this folder.
4. Open `http://127.0.0.1:4173` and allow microphone access if you use voice input.

Provider API usage is billed by each provider separately. A ChatGPT plan does not include OpenAI API usage. Judo's Auto mode falls back to another configured provider when the selected provider is unavailable or out of quota.

## Included capabilities

- One Judo chat with Auto, Collaborate, and Advanced provider modes.
- Provider adapters for OpenAI Responses, Claude Messages, and Gemini Generate Content.
- Automatic routing for documents, multimodal files, coding, and complex requests.
- Multi-provider comparison and one Judo synthesis, with optional provider and routing details.
- Text, image, PDF, and video attachments (provider support varies by file type).
- Optional provider web search tools and returned citations where supported.
- Browser microphone input, optional device read-aloud, conversation history, projects, and saved prompts.
- Alexa custom-skill Lambda starter in `alexa/lambda.mjs`.

## API keys

Add any subset of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY` to `.env`. Judo shows which providers are configured without exposing the keys to the browser. You can override model names in the same file. The UI and local server bind to `127.0.0.1`, so other machines cannot access the local app by default.

## Alexa setup

The Alexa adapter handles `LaunchRequest`, `AskJudoIntent`, help, stop, and cancel. Add the project's `ASK_SKILL_ID` and provider keys to the Lambda environment, install dependencies with `npm install`, and deploy `alexa/lambda.mjs` as the Lambda handler. Create a custom Alexa skill with an `AskJudoIntent` and a `query` slot, then connect its endpoint to the Lambda function. AWS skill integration and the configured skill ID provide the trust boundary.

Alexa must reach a cloud-hosted skill endpoint; it cannot call a computer bound to localhost. This starter keeps short history in the Alexa skill session. Sharing persistent conversation history between Alexa and the local browser requires account linking and shared hosted storage, which are not configured in this local prototype.

## Privacy and limits

Requests and attached files are sent to whichever external provider Judo selects. Review each provider's terms and billing before configuring its key. Local chat history remains in the browser profile. This prototype does not include user accounts, synchronized cloud history, production Alexa hosting, or long-term file storage.

