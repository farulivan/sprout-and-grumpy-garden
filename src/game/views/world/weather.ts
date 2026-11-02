// The garden's weather follows Sunny's mood: a clear morning while he is asleep or only a little grumpy,
// clouds rolling in as he gets grumpier, a stormy dusk when he is furious, and the sun bursting back out
// (with a rainbow) once he has been cheered up. Nothing here changes the fight; it is only how the world looks.
// One more look belongs to no boss: the dawn the game opens on, before the sun is up over Pip's yard.
// The last four are the Mushroom Wood's and Mo's: dusk, deeper dusk, his tantrum, and the wood all alight once
// he is cheered up. They come last so that the older skies stack as they always have.
import type { Fight } from '../../../sim/fight';

export const MOODS = [
  'calm',
  'grumpy',
  'stormy',
  'bloom',
  'dawn',
  'dusk',
  'gloom',
  'tantrum',
  'glow',
] as const;
export type Mood = (typeof MOODS)[number];

// What the world looks like in one mood. Tints multiply the baked art (white = as painted).
export interface Look {
  cloudTint: number;
  hillTint: number; // mountains and far hills
  landTint: number; // meadow, trees, fence
  groundTint: number; // grass, soil, platforms
  sun: number; // how bright the sun, its glow and its rays are
  ceiling: number; // 0-1: how far the storm clouds have rolled in
  vignette: number; // how dark the corners of the screen are
  vignetteTint: number;
  wind: number; // 0 = still air, 1 = gusts streaking past
  life: number; // butterflies and floating pollen
  rainbow: number;
  moon: number; // how bright the moon is, on a sky that has one
  moteTint: number; // what floats in the air: pollen by day, fireflies by night
}

const POLLEN = 0xfff3c4,
  FIREFLY = 0xcdf86a;
const LOOKS: Record<Mood, Look> = {
  calm: {
    cloudTint: 0xffffff,
    hillTint: 0xffffff,
    landTint: 0xffffff,
    groundTint: 0xffffff,
    sun: 1,
    ceiling: 0,
    vignette: 0.3,
    vignetteTint: 0x12405a,
    wind: 0,
    life: 1,
    rainbow: 0,
    moon: 0,
    moteTint: POLLEN,
  },
  grumpy: {
    cloudTint: 0xc3cadd,
    hillTint: 0xc9d4e6,
    landTint: 0xd3dde2,
    groundTint: 0xe4e6ee,
    sun: 0.35,
    ceiling: 0.6,
    vignette: 0.42,
    vignetteTint: 0x1d2c52,
    wind: 0.45,
    life: 0.25,
    rainbow: 0,
    moon: 0,
    moteTint: POLLEN,
  },
  stormy: {
    cloudTint: 0x8f88b8,
    hillTint: 0x9093c4,
    landTint: 0xa3a6cc,
    groundTint: 0xc9c5dc,
    sun: 0.05,
    ceiling: 1,
    vignette: 0.6,
    vignetteTint: 0x1c1140,
    wind: 1,
    life: 0,
    rainbow: 0,
    moon: 0,
    moteTint: POLLEN,
  },
  bloom: {
    cloudTint: 0xfffaf0,
    hillTint: 0xfffff2,
    landTint: 0xffffff,
    groundTint: 0xffffff,
    sun: 1.5,
    ceiling: 0,
    vignette: 0.16,
    vignetteTint: 0x2a5a3a,
    wind: 0,
    life: 1.6,
    rainbow: 1,
    moon: 0,
    moteTint: POLLEN,
  },
  // cool violet shadows and pink clouds, the sun still low
  dawn: {
    cloudTint: 0xf4c6d6,
    hillTint: 0xa9a8de,
    landTint: 0xb7b2dc,
    groundTint: 0xc6bcdc,
    sun: 0.6,
    ceiling: 0,
    vignette: 0.5,
    vignetteTint: 0x2a2266,
    wind: 0,
    life: 0,
    rainbow: 0,
    moon: 0,
    moteTint: POLLEN,
  },
  // the wood's art is painted for this light, so nothing is tinted yet; the last of the day low in the trees
  dusk: {
    cloudTint: 0xb9a3cf,
    hillTint: 0xffffff,
    landTint: 0xffffff,
    groundTint: 0xffffff,
    sun: 0,
    ceiling: 0,
    vignette: 0.48,
    vignetteTint: 0x1a1140,
    wind: 0,
    life: 0.75,
    rainbow: 0,
    moon: 0.55,
    moteTint: FIREFLY,
  },
  // deeper dusk: the warmth has gone, the moon is up, and more fireflies are out
  gloom: {
    cloudTint: 0x6f6a9f,
    hillTint: 0x9a9ad8,
    landTint: 0xa9acdc,
    groundTint: 0xb9bce0,
    sun: 0,
    ceiling: 0,
    vignette: 0.66,
    vignetteTint: 0x0b0a2c,
    wind: 0,
    life: 1.15,
    rainbow: 0,
    moon: 1,
    moteTint: FIREFLY,
  },
  // Mo at his worst: a purple night with the storm down
  tantrum: {
    cloudTint: 0x5a4a8c,
    hillTint: 0x8a78c8,
    landTint: 0x9a86cc,
    groundTint: 0xae9cd2,
    sun: 0,
    ceiling: 0.8,
    vignette: 0.72,
    vignetteTint: 0x1c0b3c,
    wind: 0.7,
    life: 0.5,
    rainbow: 0,
    moon: 0.35,
    moteTint: 0xe0a0ff,
  },
  // Mo cheered up: the whole wood alight
  glow: {
    cloudTint: 0xe0d4ff,
    hillTint: 0xfff4ff,
    landTint: 0xffffff,
    groundTint: 0xffffff,
    sun: 0,
    ceiling: 0,
    vignette: 0.22,
    vignetteTint: 0x2a2a70,
    wind: 0,
    life: 1.7,
    rainbow: 0,
    moon: 1,
    moteTint: FIREFLY,
  },
};

export function moodOf(fight: Fight): Mood {
  if (!fight.boss.alive) return 'bloom';
  return MOODS[Math.min(fight.boss.phase, 3) - 1];
}

const SPEED = 2.2; // how quickly the weather turns, per second
const TINTS = ['cloudTint', 'hillTint', 'landTint', 'groundTint', 'vignetteTint', 'moteTint'] as const;
const LEVELS = ['sun', 'ceiling', 'vignette', 'wind', 'life', 'rainbow', 'moon'] as const;

// Blends between moods so the weather turns gradually. Every view reads `look`.
export class Weather {
  // How much of each mood is showing; always adds up to 1.
  readonly weight: Record<Mood, number> = {
    calm: 1,
    grumpy: 0,
    stormy: 0,
    bloom: 0,
    dawn: 0,
    dusk: 0,
    gloom: 0,
    tantrum: 0,
    glow: 0,
  };
  readonly look: Look = { ...LOOKS.calm };
  private settled: Mood | null = 'calm'; // the mood the weather has fully turned to, if it has

  // Straight to a mood, with no blend: the opening skipped, say.
  snap(mood: Mood) {
    for (const m of MOODS) this.weight[m] = m === mood ? 1 : 0;
    Object.assign(this.look, LOOKS[mood]);
    this.settled = mood;
  }

  // speed: how quickly it turns, per second, if not at the usual pace (a night falling slowly along a stage)
  update(mood: Mood, dt: number, speed = SPEED) {
    if (mood === this.settled) return; // nothing to blend until the mood changes
    const k = 1 - Math.exp(-dt * speed);
    let total = 0;
    for (const m of MOODS) {
      this.weight[m] += ((m === mood ? 1 : 0) - this.weight[m]) * k;
      total += this.weight[m];
    }
    for (const m of MOODS) this.weight[m] /= total;

    for (const key of LEVELS) {
      let v = 0;
      for (const m of MOODS) v += LOOKS[m][key] * this.weight[m];
      this.look[key] = v;
    }
    for (const key of TINTS) {
      let r = 0,
        g = 0,
        b = 0;
      for (const m of MOODS) {
        const c = LOOKS[m][key],
          w = this.weight[m];
        r += ((c >> 16) & 255) * w;
        g += ((c >> 8) & 255) * w;
        b += (c & 255) * w;
      }
      this.look[key] = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    }

    // The blend only creeps toward its goal, so call it done once it is too close to tell.
    if (this.weight[mood] > 0.9995) {
      this.snap(mood);
    } else {
      this.settled = null;
    }
  }
}
