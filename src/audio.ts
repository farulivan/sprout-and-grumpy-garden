// Tiny procedural audio: no asset files. Everything is synthesized with WebAudio oscillators.
import type { SfxName } from './presentation';

interface ToneOptions {
  end?: number; // slide to this frequency
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  delay?: number;
}
type Tone = (freq: number, opts?: ToneOptions) => void;

const RECIPES: Record<SfxName, (tone: Tone) => void> = {
  shoot: (tone) => tone(900, { end: 1500, dur: 0.06, vol: 0.07 }),
  jump: (tone) => tone(320, { end: 660, type: 'triangle', dur: 0.14, vol: 0.16 }),
  land: (tone) => tone(170, { end: 90, type: 'triangle', dur: 0.07, vol: 0.1 }),
  hurt: (tone) => {
    tone(440, { end: 140, type: 'sawtooth', dur: 0.28, vol: 0.16 });
    tone(220, { end: 110, dur: 0.2, vol: 0.06 });
  },
  bossHit: (tone) => tone(210, { end: 130, dur: 0.06, vol: 0.08 }),
  faceHit: (tone) => tone(520, { end: 780, type: 'triangle', dur: 0.08, vol: 0.12 }),
  telegraph: (tone) => {
    tone(720, { type: 'sine', dur: 0.09, vol: 0.13 });
    tone(980, { type: 'sine', dur: 0.12, vol: 0.13, delay: 0.1 });
  },
  spit: (tone) => tone(260, { end: 120, type: 'triangle', dur: 0.15, vol: 0.14 }),
  petal: (tone) => tone(600, { end: 900, type: 'sine', dur: 0.18, vol: 0.12 }),
  roar: (tone) => {
    tone(130, { end: 55, type: 'sawtooth', dur: 0.7, vol: 0.18 });
    tone(98, { end: 40, dur: 0.7, vol: 0.08 });
  },
  pickup: (tone) =>
    [660, 880, 1320].forEach((f, i) => tone(f, { type: 'sine', dur: 0.12, vol: 0.14, delay: i * 0.07 })),
  win: (tone) =>
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      tone(f, { type: 'triangle', dur: 0.24, vol: 0.18, delay: i * 0.14 }),
    ),
  lose: (tone) =>
    [440, 392, 349, 262].forEach((f, i) =>
      tone(f, { type: 'triangle', dur: 0.32, vol: 0.14, delay: i * 0.24 }),
    ),
};

// Gentle looping background music: a soft pentatonic arpeggio with a bass note every bar.
const NOTES = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3]; // C pentatonic over two octaves
const PATTERN = [0, 2, 4, 5, 4, 2, 3, 1, 0, 3, 5, 7, 5, 3, 2, 1];
const BEAT = 0.28;

export class GameAudio {
  muted = false;
  // While paused, nothing is scheduled (a suspended context would pile notes up and play them all at
  // once on resume).
  paused = false;
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private beat = 0;

  // Play through an AudioContext that something else owns (Phaser's), so its unlock handling,
  // pause-on-blur and master mute cover the synth too.
  attach(context: AudioContext, destination: AudioNode) {
    this.ac = context;
    this.master = context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(destination);
  }

  // Browsers only allow sound after a key press, click or touch, so call this from one.
  init() {
    if (!this.ac) {
      this.ac = new AudioContext();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ac.destination);
    }
    if (this.ac.state === 'suspended') void this.ac.resume();
  }

  play(name: SfxName) {
    RECIPES[name](this.tone);
  }

  startMusic() {
    if (!this.ac || this.musicTimer) return;
    this.musicTimer = setInterval(() => {
      if (this.muted || this.paused) return;
      this.tone(NOTES[PATTERN[this.beat % PATTERN.length]], { type: 'sine', dur: BEAT * 1.7, vol: 0.055 });
      if (this.beat % 8 === 0)
        this.tone(NOTES[this.beat % 16 === 0 ? 0 : 3] / 2, { type: 'triangle', dur: BEAT * 6, vol: 0.05 });
      this.beat++;
    }, BEAT * 1000);
  }
  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private tone: Tone = (freq, { end = freq, type = 'square', dur = 0.12, vol = 0.2, delay = 0 } = {}) => {
    const ac = this.ac;
    if (!ac || !this.master || this.muted || this.paused) return;
    const t0 = ac.currentTime + delay,
      o = ac.createOscillator(),
      g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (end !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  };
}
