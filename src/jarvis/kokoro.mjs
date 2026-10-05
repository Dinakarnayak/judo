let model=null; let loading=null; let failed=false; let progress=0; let lastError='';
export const VOICES=['bm_george','bm_fable','bm_lewis','bm_daniel'];
export const loadProgress=()=>progress;
export const isReady=()=>Boolean(model);
export const isUnavailable=()=>failed;
export async function load(){
  if(model) return model; if(failed) return null; if(loading) return loading;
  loading=(async()=>{
    try{
      const mod=await import('kokoro-js');
      model=await mod.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'webgpu',progress_callback:p=>{if(typeof p?.progress==='number') progress=p.progress/100;}});
      progress=1; return model;
    }catch(error){ failed=true; lastError=String(error?.message||error); return null; }
    finally{loading=null;}
  })();
  return loading;
}
export async function speak(text,{voice='bm_george',speed=0.95}={}){
  const tts=await load(); if(!tts) return null;
  try{ const audio=await tts.generate(text,{voice:VOICES.includes(voice)?voice:'bm_george',speed}); return URL.createObjectURL(audio.toBlob()); }
  catch(error){ lastError=String(error?.message||error); return null; }
}
export const availableVoices=()=>Promise.resolve(VOICES.slice());
export { lastError };