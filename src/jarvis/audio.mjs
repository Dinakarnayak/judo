/**
 * A single shared microphone stream plus an analyser, so the reactor can pulse
 * with the user's voice. Opening the mic more than once causes Chrome to drop
 * the earlier stream, so everything that needs audio goes through here.
 */

let stream = null;
let ctx = null;
let analyser = null;
let buf = null;

export async function getMic() {
  if (stream) return stream;
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  return stream;
}

export async function startAnalyser() {
  if (analyser) return;
  const s = await getMic();
  ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(s);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.75;
  src.connect(analyser);
  buf = new Uint8Array(analyser.frequencyBinCount);
}

/** 0..1 loudness. Returns 0 before the analyser is up. */
export function micLevel() {
  if (!analyser || !buf) return 0;
  analyser.getByteFrequencyData(buf);
  let sum = 0;
  for (let i = 4; i < buf.length; i++) sum += buf[i];
  const avg = sum / (buf.length - 4) / 255;
  return Math.min(1, avg * 3.2);
}

/** Analyser fed from an <audio> element, so the orb reacts while JARVIS talks. */
export function attachOutputAnalyser(el) {
  const c = new AudioContext();
  const src = c.createMediaElementSource(el);
  const a = c.createAnalyser();
  a.fftSize = 512;
  a.smoothingTimeConstant = 0.7;
  src.connect(a);
  a.connect(c.destination);
  const b = new Uint8Array(a.frequencyBinCount);
  return () => {
    a.getByteFrequencyData(b);
    let sum = 0;
    for (let i = 2; i < b.length; i++) sum += b[i];
    return Math.min(1, (sum / (b.length - 2) / 255) * 3);
  };
}
