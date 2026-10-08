// Tiny procedural audio: no asset files. Everything is synthesized with WebAudio oscillators.
let ac = null, master = null, musicTimer = null, muted = false, paused = false, step = 0;

export function initAudio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}
export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }
// While paused, nothing is scheduled (a suspended context would pile notes up and play them all at once on resume).
export function setAudioPaused(p) { paused = p; }

function tone(freq, { end = freq, type = 'square', dur = 0.12, vol = 0.2, delay = 0 } = {}) {
  if (!ac || muted || paused) return;
  const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (end !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
}

export const sfx = {
  shoot: () => tone(900, { end: 1500, dur: 0.06, vol: 0.07 }),
  jump: () => tone(320, { end: 660, type: 'triangle', dur: 0.14, vol: 0.16 }),
  land: () => tone(170, { end: 90, type: 'triangle', dur: 0.07, vol: 0.1 }),
  hurt: () => { tone(440, { end: 140, type: 'sawtooth', dur: 0.28, vol: 0.16 }); tone(220, { end: 110, dur: 0.2, vol: 0.06 }); },
  bossHit: () => tone(210, { end: 130, dur: 0.06, vol: 0.08 }),
  faceHit: () => tone(520, { end: 780, type: 'triangle', dur: 0.08, vol: 0.12 }),
  telegraph: () => { tone(720, { type: 'sine', dur: 0.09, vol: 0.13 }); tone(980, { type: 'sine', dur: 0.12, vol: 0.13, delay: 0.1 }); },
  spit: () => tone(260, { end: 120, type: 'triangle', dur: 0.15, vol: 0.14 }),
  petal: () => tone(600, { end: 900, type: 'sine', dur: 0.18, vol: 0.12 }),
  roar: () => { tone(130, { end: 55, type: 'sawtooth', dur: 0.7, vol: 0.18 }); tone(98, { end: 40, dur: 0.7, vol: 0.08 }); },
  pickup: () => [660, 880, 1320].forEach((f, i) => tone(f, { type: 'sine', dur: 0.12, vol: 0.14, delay: i * 0.07 })),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.24, vol: 0.18, delay: i * 0.14 })),
  lose: () => [440, 392, 349, 262].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.32, vol: 0.14, delay: i * 0.24 })),
};

// Gentle looping background music: a soft pentatonic arpeggio with a bass note every bar.
const NOTES = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3]; // C pentatonic over two octaves
const PATTERN = [0, 2, 4, 5, 4, 2, 3, 1, 0, 3, 5, 7, 5, 3, 2, 1];
export function startMusic() {
  if (!ac || musicTimer) return;
  const beat = 0.28;
  musicTimer = setInterval(() => {
    if (muted || paused) return;
    tone(NOTES[PATTERN[step % PATTERN.length]], { type: 'sine', dur: beat * 1.7, vol: 0.055 });
    if (step % 8 === 0) tone(NOTES[step % 16 === 0 ? 0 : 3] / 2, { type: 'triangle', dur: beat * 6, vol: 0.05 });
    step++;
  }, beat * 1000);
}
export function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
