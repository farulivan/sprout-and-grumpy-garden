// The garden's weather follows Sunny's mood: a clear morning while he is asleep or only a little grumpy,
// clouds rolling in as he gets grumpier, a stormy dusk when he is furious, and the sun bursting back out
// (with a rainbow) once he has been cheered up. Nothing here changes the fight; it is only how the world looks.
import type { Fight } from '../../../sim/fight';

export const MOODS = ['calm', 'grumpy', 'stormy', 'bloom'] as const;
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
}

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
  },
};

export function moodOf(fight: Fight): Mood {
  if (!fight.boss.alive) return 'bloom';
  if (fight.state === 'title') return 'calm';
  return MOODS[Math.min(fight.boss.phase, 3) - 1];
}

const SPEED = 2.2; // how quickly the weather turns, per second
const TINTS = ['cloudTint', 'hillTint', 'landTint', 'groundTint', 'vignetteTint'] as const;
const LEVELS = ['sun', 'ceiling', 'vignette', 'wind', 'life', 'rainbow'] as const;

// Blends between moods so the weather turns gradually. Every view reads `look`.
export class Weather {
  // How much of each mood is showing; always adds up to 1.
  readonly weight: Record<Mood, number> = { calm: 1, grumpy: 0, stormy: 0, bloom: 0 };
  readonly look: Look = { ...LOOKS.calm };

  update(mood: Mood, dt: number) {
    const k = 1 - Math.exp(-dt * SPEED);
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
  }
}
