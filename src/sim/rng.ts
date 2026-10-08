// Seeded random numbers (mulberry32). The simulation never calls Math.random, so the same seed and the
// same inputs always replay the same fight.
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  // 0 <= value < 1
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
