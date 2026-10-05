
import { getMic } from './audio.mjs';

const TRIGGER_OVER_FLOOR = 2.6;
const GUARD_BOOST = 2.4;
const RELEASE_RATIO = 0.6;
const START_MS = 110;
const SILENCE_MS = 650;
const MAX_MS = 20000;
const FLOOR_UP = 0.0008;
const FLOOR_DOWN = 0.02;

function pickMime() {
  for (const mime of ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export async function startVad(h) {
  let stream;
  try { stream = await getMic(); }
  catch (error) {
    h.onError(error?.name === 'NotAllowedError' ? 'Microphone access denied.' : 'No microphone available.');
    return { stop(){}, setGuard(){}, live:()=>false, meter:()=>({energy:0,floor:0,threshold:0,speaking:false}) };
  }
  if (typeof MediaRecorder === 'undefined') {
    h.onError('This browser cannot record audio.');
    return { stop(){}, setGuard(){}, live:()=>false, meter:()=>({energy:0,floor:0,threshold:0,speaking:false}) };
  }

  const mime = pickMime();
  const ctx = new AudioContext();
  await ctx.resume().catch(()=>{});
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.35;
  source.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  let stopped=false, guard=false, floor=0.01, smooth=0, threshold=0;
  let recorder=null, parts=[], armedAt=0, speaking=false, startedAt=0, lastLoud=0, raf=0;

  const rms=()=>{
    analyser.getFloatTimeDomainData(buf);
    let sum=0;
    for(const value of buf) sum += value*value;
    return Math.sqrt(sum/buf.length);
  };
  const begin=()=>{
    parts=[];
    recorder = mime ? new MediaRecorder(stream,{mimeType:mime}) : new MediaRecorder(stream);
    recorder.ondataavailable=e=>{ if(e.data?.size) parts.push(e.data); };
    recorder.start();
  };
  const discard=()=>{
    if(!recorder) return;
    try { recorder.ondataavailable=null; if(recorder.state!=='inactive') recorder.stop(); } catch {}
    recorder=null; parts=[];
  };
  const finish=()=>{
    const rec=recorder, started=startedAt;
    recorder=null; speaking=false; startedAt=0;
    if(!rec) return;
    const done=()=>{
      const blob=new Blob(parts,{type:rec.mimeType||mime||'audio/webm'});
      parts=[];
      h.onEnd(blob, started ? performance.now()-started : 0);
    };
    rec.onstop=done;
    try { if(rec.state!=='inactive') rec.stop(); else done(); } catch { done(); }
  };
  const tick=()=>{
    if(stopped) return;
    raf=requestAnimationFrame(tick);
    const energy=rms();
    smooth += (energy-smooth)*0.5;
    h.onLevel(Math.min(1,smooth*12));
    if(!speaking && armedAt===0){
      const rate=smooth>floor?FLOOR_UP:FLOOR_DOWN;
      floor += (smooth-floor)*rate;
      floor=Math.max(floor,0.0015);
    }
    threshold=floor*TRIGGER_OVER_FLOOR*(guard?GUARD_BOOST:1);
    const now=performance.now();
    if(!speaking){
      if(smooth>threshold){
        if(!armedAt){ armedAt=now; begin(); }
        else if(now-armedAt>=START_MS){ speaking=true; startedAt=armedAt; lastLoud=now; h.onStart(); }
      } else if(armedAt){ armedAt=0; discard(); }
    } else {
      if(smooth>threshold*RELEASE_RATIO) lastLoud=now;
      if(now-lastLoud>=SILENCE_MS || now-startedAt>=MAX_MS){ armedAt=0; finish(); }
    }
  };
  tick();
  return {
    stop(){ stopped=true; cancelAnimationFrame(raf); discard(); stream.getTracks().forEach(track=>track.stop()); source.disconnect(); void ctx.close(); },
    setGuard(value){ guard=Boolean(value); },
    live(){ return !stopped; },
    meter(){ return {energy:smooth,floor,threshold,speaking}; }
  };
}
