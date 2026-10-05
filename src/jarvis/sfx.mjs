let ctx=null,master=null,volume=0.5,ducked=false;
const DUCK=0.45;
function audio(){if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=volume;master.connect(ctx.destination);}return ctx;}
function tone(freq,dur=0.12,gain=0.15,type='sine',offset=0){const c=audio(),t=c.currentTime+offset,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur+0.02);}
export async function unlockAudio(){const c=audio();if(c.state==='suspended')await c.resume().catch(()=>{});}
export function setVolume(value){volume=Math.max(0,Math.min(1,value));if(master)master.gain.value=ducked?volume*DUCK:volume;}
export function play(cue){if(!ctx||ctx.state!=='running')return;const sounds={boot:[[110,0.5,0],[220,0.5,0.2],[880,0.25,0.9]],wake:[[1046,0.09,0],[1568,0.14,0.07]],listen:[[660,0.1,0]],tool:[[2200,0.05,0]],done:[[1320,0.1,0],[880,0.2,0.08]],error:[[320,0.18,0],[226,0.3,0.13]]};for(const [f,d,o] of sounds[cue]||[])tone(f,d,0.14,'sine',o);}
export function duck(on){if(!master||ducked===on)return;ducked=on;master.gain.setTargetAtTime(on?volume*DUCK:volume,audio().currentTime,0.08);}
