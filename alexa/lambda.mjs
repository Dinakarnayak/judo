import Alexa from 'ask-sdk-core';
import { runJudo } from '../src/judo-core.mjs';

const skillId = process.env.ASK_SKILL_ID;
function sessionHistory(attributes) { return Array.isArray(attributes.judoHistory) ? attributes.judoHistory.slice(-8) : []; }

const launchHandler = {
  canHandle(input) { return Alexa.getRequestType(input.requestEnvelope) === 'LaunchRequest'; },
  handle(input) { return input.responseBuilder.speak('Judo is ready. What can I help you with?').reprompt('What would you like Judo to do?').getResponse(); }
};
const askHandler = {
  canHandle(input) { return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(input.requestEnvelope) === 'AskJudoIntent'; },
  async handle(input) {
    const message = input.requestEnvelope.request.intent?.slots?.query?.value || '';
    if (!message) return input.responseBuilder.speak('Please tell me what you would like Judo to do.').reprompt('What should I ask Judo?').getResponse();
    const attributes = input.attributesManager.getSessionAttributes();
    const history = sessionHistory(attributes);
    const answer = await runJudo({ message, history, mode: 'auto' });
    attributes.judoHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: answer.text }].slice(-8);
    input.attributesManager.setSessionAttributes(attributes);
    return input.responseBuilder.speak(answer.text.replace(/[#*_`\[\]]/g, '').slice(0, 7000)).reprompt('What else would you like Judo to help with?').getResponse();
  }
};
const helpHandler = {
  canHandle(input) { return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(input.requestEnvelope) === 'AMAZON.HelpIntent'; },
  handle(input) { return input.responseBuilder.speak('Say, Alexa, ask Judo, followed by your question.').reprompt('What would you like me to ask Judo?').getResponse(); }
};
const stopHandler = {
  canHandle(input) { return ['AMAZON.StopIntent', 'AMAZON.CancelIntent'].includes(Alexa.getIntentName(input.requestEnvelope)); },
  handle(input) { return input.responseBuilder.speak('Goodbye.').getResponse(); }
};
const errorHandler = {
  canHandle() { return true; },
  handle(input, error) {
    console.error('Alexa Judo request failed:', error.message);
    return input.responseBuilder.speak('Judo could not complete that request. Please try again.').reprompt('What should I ask Judo?').getResponse();
  }
};

export const handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(launchHandler, askHandler, helpHandler, stopHandler)
  .addErrorHandlers(errorHandler)
  .withSkillId(skillId)
  .lambda();

