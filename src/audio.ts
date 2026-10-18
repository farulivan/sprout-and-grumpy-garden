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
  block: (tone) => tone(1400, { end: 1000, type: 'triangle', dur: 0.05, vol: 0.07 }), // a light "tink"
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
  // a grumpy little plant cheered up: three quick notes going up, like a "hooray"
  cheer: (tone) =>
    [784, 988, 1319].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.09, vol: 0.12, delay: i * 0.05 })),
  // a Snapper's jaws: two quick clacks
  snap: (tone) => {
    tone(260, { end: 140, dur: 0.05, vol: 0.09 });
    tone(230, { end: 120, dur: 0.05, vol: 0.09, delay: 0.08 });
  },
  fall: (tone) => tone(880, { end: 180, type: 'sine', dur: 0.4, vol: 0.12 }), // whistling down into a pit
  seed: (tone) =>
    [1319, 1760, 2093].forEach((f, i) => tone(f, { type: 'sine', dur: 0.1, vol: 0.1, delay: i * 0.06 })),
  // the stage's gate: a short fanfare
  clear: (tone) =>
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, { type: 'triangle', dur: i === 3 ? 0.4 : 0.14, vol: 0.16, delay: i * 0.12 }),
    ),
};

// Looping background music: a pentatonic arpeggio with a bass note under it. Each level has its own tune.
const NOTES = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3]; // C pentatonic over two octaves
export type Tune = 'boss' | 'stage';
interface TuneDef {
  pattern: readonly number[]; // indexes into NOTES, one per beat
  beat: number; // seconds per beat
  wave: OscillatorType;
  hold: number; // how long each note rings, in beats
  vol: number;
  bassEvery: number; // a bass note every this many beats...
  bass: readonly number[]; // ...going round these notes, an octave down
}
const TUNES: Record<Tune, TuneDef> = {
  // soft and steady under the boss fight
  boss: {
    pattern: [0, 2, 4, 5, 4, 2, 3, 1, 0, 3, 5, 7, 5, 3, 2, 1],
    beat: 0.28,
    wave: 'sine',
    hold: 1.7,
    vol: 0.055,
    bassEvery: 8,
    bass: [0, 3],
  },
  // a skipping walk down the garden path: quicker and plucked
  stage: {
    pattern: [0, 2, 4, 2, 5, 4, 2, 4, 3, 5, 7, 5, 6, 5, 3, 2],
    beat: 0.22,
    wave: 'triangle',
    hold: 1.1,
    vol: 0.05,
    bassEvery: 4,
    bass: [0, 3, 4, 3],
  },
};
// Music is scheduled on the audio clock a little ahead of time, so it keeps a steady beat even when the
// page's own timers run late.
const LOOKAHEAD = 0.2; // seconds of music to keep scheduled
const TICK = 50; // how often to top it up, in milliseconds

export class GameAudio {
  muted = false;
  // While paused, nothing is scheduled (a suspended context would pile notes up and play them all at
  // once on resume).
  paused = false;
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private tune: TuneDef = TUNES.boss;
  private beat = 0;
  private nextBeat = 0; // audio-clock time of the next beat to schedule

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

  // Starts a tune from its beginning, unless it is already playing. Another tune playing gives way to it.
  startMusic(tune: Tune = 'boss') {
    if (!this.ac || (this.musicTimer && this.tune === TUNES[tune])) return;
    this.tune = TUNES[tune];
    this.beat = 0;
    this.nextBeat = this.ac.currentTime + 0.05;
    this.musicTimer ??= setInterval(() => this.scheduleMusic(), TICK);
  }
  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleMusic() {
    const ac = this.ac;
    if (!ac) return;
    const now = ac.currentTime;
    if (this.muted || this.paused || ac.state !== 'running') {
      this.nextBeat = Math.max(this.nextBeat, now + 0.05); // pick up from "now" afterwards, not from the backlog
      return;
    }
    if (this.nextBeat < now) this.nextBeat = now; // the timer stalled for a long time: skip what was missed
    const t = this.tune;
    while (this.nextBeat < now + LOOKAHEAD) {
      const delay = this.nextBeat - now;
      this.tone(NOTES[t.pattern[this.beat % t.pattern.length]], {
        type: t.wave,
        dur: t.beat * t.hold,
        vol: t.vol,
        delay,
      });
      if (this.beat % t.bassEvery === 0)
        this.tone(NOTES[t.bass[(this.beat / t.bassEvery) % t.bass.length]] / 2, {
          type: 'triangle',
          dur: t.beat * 6,
          vol: 0.05,
          delay,
        });
      this.beat++;
      this.nextBeat += t.beat;
    }
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
