let current={stt:false,tts:false,bridge:false};
let probed=false;
export const caps=()=>current;
export const capabilitiesProbed=()=>probed;
export async function probeCapabilities(base='http://127.0.0.1:8787'){
  try{
    const response=await fetch(base+'/health',{signal:AbortSignal.timeout(2500),cache:'no-store'});
    if(response.ok){
      const data=await response.json();
      current={stt:Boolean(data.stt),tts:Boolean(data.tts),bridge:true};
    }
  }catch{}
  probed=true;
  return current;
}
export const engineLabel=()=>current.stt&&current.tts?'ElevenLabs':current.stt?'ElevenLabs STT':current.tts?'ElevenLabs TTS':'browser speech';
