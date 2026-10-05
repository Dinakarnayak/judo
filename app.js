const $ = selector => document.querySelector(selector);
const input = $('#input'), messagesEl = $('#messages'), errorEl = $('#error');
const keys = { chats: 'judo.chats.v2', projects: 'judo.projects.v1', active: 'judo.activeChat.v2' };
const providers = [];
let pendingFiles = [];
let recognition;
let speakReplies = false;
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let savedPrompts = readStore('judo.savedPrompts.v1', []);
let chats = readStore(keys.chats, []);
let projects = readStore(keys.projects, ['Personal']);
let activeId = localStorage.getItem(keys.active) || '';
let currentProject = 'Personal';

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2400); }
function showError(raw) {
  errorEl.replaceChildren();
  let message = String(raw ?? '');
  try { const parsed = JSON.parse(message); message = parsed.error || parsed.message || message; } catch {}
  if (/credit_balance_exhausted|insufficient_quota|no credits remaining/i.test(message)) {
    errorEl.append(document.createTextNode('OpenAI API credits are exhausted. Judo will try another configured provider; otherwise add API credits. '));
    const link = document.createElement('a'); link.href = 'https://platform.openai.com/settings/organization/billing/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open API billing'; errorEl.append(link); return;
  }
  if (/no providers configured|connect at least one provider/i.test(message)) message = 'Add a provider key in the local .env file, or enable Ollama for local models, then restart Judo.';
  errorEl.textContent = message;
}
function saveChats() { localStorage.setItem(keys.chats, JSON.stringify(chats.slice(0, 40))); }
function activeChat() { return chats.find(chat => chat.id === activeId); }
function ensureChat() {
  let chat = activeChat();
  if (!chat) { chat = { id: crypto.randomUUID(), title: 'New chat', project: currentProject, messages: [], updatedAt: Date.now() }; chats.unshift(chat); activeId = chat.id; localStorage.setItem(keys.active, activeId); saveChats(); renderRecent(); }
  return chat;
}
function renderRecent() {
  const list = $('#recentList'); list.replaceChildren();
  chats.filter(chat => chat.project === currentProject).slice(0, 8).forEach(chat => {
    const button = document.createElement('button'); button.className = `sideitem ${chat.id === activeId ? 'active' : ''}`; button.textContent = chat.title || 'New chat'; button.onclick = () => openChat(chat.id); list.append(button);
  });
}
function renderProjects() {
  const list = $('#projectList'); list.replaceChildren();
  projects.forEach(project => { const button = document.createElement('button'); button.className = `sideitem ${project === currentProject ? 'active' : ''}`; button.textContent = `◇  ${project}`; button.onclick = () => { currentProject = project; renderProjects(); renderRecent(); newChat(false); }; list.append(button); });
  localStorage.setItem(keys.projects, JSON.stringify(projects));
}
function renderSavedPrompts() {
  const list = $('#savedPromptList'); list.replaceChildren();
  if (!savedPrompts.length) { const empty = document.createElement('p'); empty.className = 'tiny'; empty.textContent = 'Save a user prompt with the ☆ button beside it.'; list.append(empty); return; }
  savedPrompts.forEach((prompt, index) => {
    const row = document.createElement('div'); row.className = 'provider-row';
    const run = document.createElement('button'); run.className = 'sideitem'; run.textContent = prompt; run.onclick = () => { $('#savedOverlay').classList.remove('open'); send(prompt); };
    const remove = document.createElement('button'); remove.className = 'iconbtn'; remove.textContent = '×'; remove.title = 'Remove saved prompt';
    remove.onclick = () => { savedPrompts.splice(index, 1); localStorage.setItem('judo.savedPrompts.v1', JSON.stringify(savedPrompts)); renderSavedPrompts(); };
    row.append(run, remove); list.append(row);
  });
}
function makeBubble(message) {
  const row = document.createElement('div'); row.className = `message ${message.role}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = message.role === 'user' ? 'Y' : 'J';
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  const text = document.createElement('div'); text.textContent = message.content || ''; bubble.append(text);
  if (message.role === 'assistant' && (message.providers?.length || message.rationale)) {
    const details = document.createElement('details'); details.className = 'meta';
    const summary = document.createElement('summary');
    const names = (message.providers || []).map(provider => provider.label).join(' + ') || 'Judo';
    summary.textContent = `Used: ${names}${message.synthesized ? ' · Judo synthesis' : ''}`;
    details.append(summary);
    const why = document.createElement('p'); why.textContent = `Reason: ${message.rationale || 'Judo Auto routing'}`; details.append(why);
    (message.citations || []).slice(0, 8).forEach(source => { const link = document.createElement('a'); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = source.title || source.url; const wrap = document.createElement('div'); wrap.className = 'sources'; wrap.append(link); details.append(wrap); });
    bubble.append(details);
  }
  if (message.role === 'user' && message.fileNames?.length) { const line = document.createElement('div'); line.className = 'tiny'; line.textContent = `Attached: ${message.fileNames.join(', ')}`; bubble.append(line); }
  if (message.role === 'user' && message.content) {
    const save = document.createElement('button'); save.className = 'iconbtn'; save.type = 'button'; save.title = 'Save this prompt'; save.textContent = '☆';
    save.onclick = () => { if (!savedPrompts.includes(message.content)) { savedPrompts.unshift(message.content); savedPrompts = savedPrompts.slice(0, 30); localStorage.setItem('judo.savedPrompts.v1', JSON.stringify(savedPrompts)); toast('Prompt saved.'); } else toast('That prompt is already saved.'); };
    bubble.append(save);
  }
  if (message.role === 'user') row.append(bubble, avatar); else row.append(avatar, bubble);
  return row;
}
function renderChat() {
  messagesEl.replaceChildren();
  const chat = activeChat(); const hasMessages = Boolean(chat?.messages?.length);
  $('#welcome').style.display = hasMessages ? 'none' : 'block'; $('#suggestions').style.display = hasMessages ? 'none' : 'grid'; messagesEl.style.display = hasMessages ? 'block' : 'none';
  if (chat) chat.messages.forEach(message => messagesEl.append(makeBubble(message)));
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function openChat(id) { activeId = id; localStorage.setItem(keys.active, id); const chat = activeChat(); currentProject = chat?.project || 'Personal'; renderProjects(); renderRecent(); renderChat(); }
function newChat(create = true) {
  activeId = '';
  localStorage.removeItem(keys.active);
  pendingFiles = []; renderFiles(); showError(''); input.value = '';
  if (create) ensureChat();
  renderChat(); renderRecent();
}
function renderFiles() {
  const strip = $('#attachments'); strip.replaceChildren();
  pendingFiles.forEach((file, index) => { const chip = document.createElement('span'); chip.className = 'filechip'; chip.textContent = `${file.name} ×`; chip.title = 'Remove attachment'; chip.onclick = () => { pendingFiles.splice(index, 1); renderFiles(); }; strip.append(chip); });
}
function asBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); }); }
async function addFiles(files) {
  for (const file of [...files]) {
    if (pendingFiles.length >= 5) { toast('Attach up to five files at a time.'); break; }
    if (file.size > 8 * 1024 * 1024) { toast(`${file.name} is over the 8 MB per-file limit.`); continue; }
    const allowed = file.type.startsWith('image/') || file.type.startsWith('video/') || ['application/pdf','text/plain','text/markdown','text/csv','application/json'].includes(file.type) || /\.(txt|md|csv|json|pdf|png|jpe?g|webp|gif|mp4|webm)$/i.test(file.name);
    if (!allowed) { toast(`That file type is not supported: ${file.name}`); continue; }
    pendingFiles.push({ name: file.name, mimeType: file.type || mimeFromName(file.name), data: await asBase64(file) });
  }
  renderFiles();
}
function mimeFromName(name) { const ext = name.split('.').pop().toLowerCase(); return ({pdf:'application/pdf',txt:'text/plain',md:'text/markdown',csv:'text/csv',json:'application/json',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',webm:'video/webm'})[ext] || 'application/octet-stream'; }
function selectedMode() { return $('#mode').value; }
async function send(text = input.value.trim()) {
  if (!text && !pendingFiles.length) return;
  showError('');
  const chat = ensureChat();
  const fileNames = pendingFiles.map(file => file.name);
  const userMessage = { role: 'user', content: text || 'Please analyze these attachments.', fileNames };
  chat.messages.push(userMessage); chat.updatedAt = Date.now();
  if (chat.title === 'New chat') chat.title = (text || fileNames[0] || 'New chat').slice(0, 42);
  const attachments = pendingFiles.splice(0); renderFiles(); input.value = ''; saveChats(); renderRecent(); renderChat();
  const typing = { role: 'assistant', content: 'Judo is bringing the right capabilities together…' };
  chat.messages.push(typing); renderChat();
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      message: userMessage.content,
      history: chat.messages.slice(0, -2).filter(item => ['user','assistant'].includes(item.role)).map(item => ({ role: item.role, content: item.content })),
      attachments,
      mode: selectedMode(), provider: $('#provider').value, webSearch: $('#webSearch').checked
    }) });
    const result = await response.json();
    chat.messages.pop();
    if (!response.ok) throw new Error(result.error || `Judo request failed (${response.status}).`);
    chat.messages.push({ role: 'assistant', content: result.text, providers: result.providers, rationale: result.rationale, synthesized: result.synthesized, citations: result.citations });
    if (speakReplies && 'speechSynthesis' in window) { const utterance = new SpeechSynthesisUtterance(result.text); speechSynthesis.cancel(); speechSynthesis.speak(utterance); }
  } catch (error) {
    chat.messages.pop();
    showError(error.message || 'Judo could not complete that request.');
    chat.messages.push({ role: 'assistant', content: 'I couldn’t complete that request. Check the message below and try again.' });
  }
  chat.updatedAt = Date.now(); saveChats(); renderChat(); renderRecent();
}
async function refreshProviders() {
  try {
    const response = await fetch('/api/providers', { cache: 'no-store' });
    const data = await response.json(); providers.splice(0, providers.length, ...(data.providers || []));
    const enabled = providers.filter(provider => provider.available);
    $('#providerSummary').textContent = enabled.length ? `Ready · ${enabled.map(item => item.label).join(' + ')}` : 'Add API keys to start';
    const list = $('#providerRows'); list.replaceChildren();
    providers.forEach(provider => { const row = document.createElement('div'); row.className = 'provider-row'; const label = document.createElement('span'); label.textContent = `${provider.label} · ${provider.model}`; const badge = document.createElement('span'); badge.className = `badge ${provider.available ? 'configured' : 'notconfigured'}`; badge.textContent = provider.available ? 'Ready' : provider.id === 'ollama' ? 'Enable local' : 'Optional key'; row.append(label, badge); list.append(row); });
    const select = $('#provider'); [...select.options].forEach(option => { const entry = providers.find(item => item.id === option.value); option.disabled = !entry?.available; });
  } catch { $('#providerSummary').textContent = 'Local server unavailable'; }
}
let voiceMode='browser', voiceController=null, voiceBridge=null;
async function setupVoice(){
  const SpeechAPI=window.SpeechRecognition||window.webkitSpeechRecognition;
  try{
    const health=await fetch('http://127.0.0.1:8787/health',{cache:'no-store'}).then(r=>r.json());
    if(health.ok) voiceBridge=health;
  }catch{}
  if(voiceBridge){
    const {startVad}=await import('./src/jarvis/vad.mjs');
    const {unlockAudio}=await import('./src/jarvis/sfx.mjs');
    let active=false;
    const start=async()=>{
      if(active)return;
      active=true; await unlockAudio();
      voiceController=await startVad({
        onStart:()=>{ $('#voiceState').textContent='Listening…'; $('#voiceState').classList.add('listening'); },
        onLevel:v=>{ if(v>0.04) $('#voiceState').textContent='Listening…'; },
        onEnd:async blob=>{
          try{
            const response=await fetch('http://127.0.0.1:8787/stt',{method:'POST',headers:{'content-type':blob.type||'audio/webm'},body:blob});
            if(!response.ok) throw new Error('Voice transcription failed.');
            const data=await response.json();
            if(data.text?.trim()) send(data.text.trim());
          }catch(error){showError(error.message);}
        },
        onError:message=>{active=false;toast(message);}
      });
      $('#voiceState').textContent='Jarvis voice active · click to stop';
      $('#mic').classList.add('listening');
    };
    const stop=()=>{voiceController?.stop();voiceController=null;active=false;$('#voiceState').textContent='Voice off';$('#mic').classList.remove('listening');};
    $('#mic').onclick=()=>active?stop():start();
    voiceMode=voiceBridge.stt?'elevenlabs':'browser';
    $('#voiceState').textContent='Jarvis voice ready';
    return;
  }
  if(!SpeechAPI){
    $('#mic').onclick=()=>toast('Voice input is not available in this browser.');
    return;
  }
  recognition=new SpeechAPI();
  recognition.lang='en-GB'; recognition.interimResults=true; recognition.continuous=false;
  recognition.onstart=()=>{$('#voiceState').textContent='Listening…';$('#voiceState').classList.add('listening');};
  recognition.onend=()=>{$('#voiceState').textContent='Voice ready';$('#voiceState').classList.remove('listening');};
  recognition.onerror=()=>{$('#voiceState').textContent='Voice unavailable';};
  recognition.onresult=event=>{
    let transcript='';
    for(let i=event.resultIndex;i<event.results.length;i++) transcript+=event.results[i][0].transcript;
    input.value=transcript;
    if(event.results[event.results.length-1].isFinal) send(transcript);
  };
  $('#mic').onclick=()=>{try{recognition.start();}catch{recognition.stop();}};
}
$('#send').onclick = () => send();
input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } });
$('#newChat').onclick = () => newChat(false);
$('#attach').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = event => { addFiles(event.target.files); event.target.value = ''; };
$('#mode').onchange = () => { $('#provider').hidden = selectedMode() !== 'manual'; };
$('#settingsButton').onclick = $('#openSettings').onclick = () => $('#settingsOverlay').classList.add('open');
$('#closeSettings').onclick = () => $('#settingsOverlay').classList.remove('open');
$('#settingsOverlay').onclick = event => { if (event.target === $('#settingsOverlay')) $('#settingsOverlay').classList.remove('open'); };
$('#addProject').onclick = () => { const name = prompt('Name this project'); if (name?.trim() && !projects.includes(name.trim())) { projects.push(name.trim()); currentProject = name.trim(); renderProjects(); renderRecent(); newChat(false); } };
$('#voiceNav').onclick = () => { speakReplies = !speakReplies; toast(speakReplies ? 'Judo will read replies aloud using this device’s speech voice.' : 'Read-aloud is off. Alexa voice is available through the skill adapter.'); };
$('#savedNav').onclick = () => { renderSavedPrompts(); $('#savedOverlay').classList.add('open'); };
$('#closeSaved').onclick = () => $('#savedOverlay').classList.remove('open');
$('#savedOverlay').onclick = event => { if (event.target === $('#savedOverlay')) $('#savedOverlay').classList.remove('open'); };
document.querySelectorAll('.suggest').forEach(button => button.onclick = () => send(button.dataset.prompt));
window.addEventListener('beforeunload', () => recognition?.stop());
renderProjects(); renderRecent(); if (activeId && activeChat()) renderChat(); else { activeId = ''; renderChat(); } refreshProviders();
void setupVoice();
