// The studio's sting, on the paper the loading screen left: "farulivan" pops in letter by letter, Pip's seed
// drops onto the i, bounces, cracks open and sprouts as the i's dot, and "presents" fades in under it. Then
// the words go, and the dawn opens from the sprout (TitleScene's iris).
import type { GameObjects, Scene } from 'phaser';
import { W } from '../../../config';
import { STING_AT } from '../../../sim/yard';
import { clamp } from '../../../sim/math';
import { part, unit } from '../../art/bake';
import { easeOutBack } from '../../motion';
import { LOGO_S, STING, STING_SIZE, STING_SPROUT } from './art';

// The word's baseline, and the top of the i's stem (its x-height), where the seed lands and the sprout grows.
export const STING_Y = 300;
const STEM_TOP = STING_Y - STING_SIZE * 0.52;
const LETTER_GAP = 0.06; // seconds between one letter and the next
const POP = 0.3;

export class Sting {
  // Where the sprout stands: the iris opens from here.
  readonly sproutX: number;
  readonly sproutY = STEM_TOP - 20 * LOGO_S * STING_SPROUT;
  private letters: { image: GameObjects.Image; key: string }[];
  private presents: GameObjects.Image;
  private seed: GameObjects.Image;
  private halves: GameObjects.Image[];
  private stalk: GameObjects.Image;
  private leaves: GameObjects.Image[];
  private all: GameObjects.Image[];

  // layer: a container fixed to the screen, so the camera's moves in the opening don't carry the sting along
  constructor(
    scene: Scene,
    depth: number,
    private gentle: boolean, // the player's device asks for less motion
    layer?: GameObjects.Container,
  ) {
    const cx = W / 2;
    this.sproutX = cx + STING.iX;
    this.letters = STING.letters.map(({ key, x }) => ({ image: part(scene, key, cx + x, STING_Y), key }));
    this.presents = part(scene, 'sting-presents', cx, STING_Y + 60);
    this.seed = part(scene, 'sting-seed', this.sproutX, 0);
    this.halves = ['sting-seed-l', 'sting-seed-r'].map((key) => part(scene, key, this.sproutX, 0));
    this.stalk = part(scene, 'logo-stalk', this.sproutX, STEM_TOP + 2);
    this.leaves = ['logo-leaf-l', 'logo-leaf-r'].map((key) =>
      part(scene, key, this.sproutX + LOGO_S * STING_SPROUT, STEM_TOP),
    );
    this.all = [
      ...this.letters.map((l) => l.image),
      this.presents,
      this.seed,
      ...this.halves,
      this.stalk,
      ...this.leaves,
    ];
    for (const img of this.all) img.setDepth(depth);
    layer?.add(this.all);
  }

  setVisible(visible: boolean) {
    for (const img of this.all) img.setVisible(visible);
  }

  // t: seconds into the sting. after: seconds into the opening, once the sting is over (the sprout lingers
  // for a moment as the iris opens from it).
  sync(t: number, after = -1) {
    const gone = after >= 0 ? 1 : clamp((t - STING_AT.leave) / 0.3, 0, 1), // the words leave
      { letters, land, sprout, presents } = STING_AT;
    this.letters.forEach(({ image, key }, i) => {
      const u = clamp((t - letters - i * LETTER_GAP) / POP, 0, 1),
        leave = clamp(gone * 1.6 - (i / this.letters.length) * 0.6, 0, 1),
        s = this.gentle ? 1 : easeOutBack(u) * (1 - leave * 0.4);
      image
        .setVisible(u > 0 && leave < 1)
        .setAlpha(this.gentle ? u * (1 - leave) : Math.min(1, u * 3) * (1 - leave))
        .setY(STING_Y + (this.gentle ? 0 : (1 - u) * 22 + leave * 10))
        .setScale(unit(key) * s);
    });
    const pu = clamp((t - presents) / 0.35, 0, 1);
    this.presents
      .setVisible(pu > 0 && gone < 1)
      .setAlpha(pu * (1 - gone))
      .setY(STING_Y + 60 + (1 - pu) * 8);

    // the seed: falls onto the i, bounces once, then cracks as the sprout comes up
    const restY = STEM_TOP - 8,
      falling = clamp((t - STING_AT.seed) / (land - STING_AT.seed), 0, 1),
      since = t - land;
    let y = -40 + (restY + 40) * falling * falling,
      sq = 1;
    if (since > 0) {
      const hop = clamp(since / 0.2, 0, 1);
      y = restY - Math.sin(hop * Math.PI) * 12;
      sq = 1 - 0.3 * Math.exp(-since * 14) * Math.cos(since * 30);
    }
    const cracked = t >= sprout - 0.04;
    this.seed
      .setVisible(t >= STING_AT.seed && !cracked)
      .setPosition(this.sproutX, y)
      .setScale(unit('sting-seed') * (2 - sq), unit('sting-seed') * sq);
    const split = clamp((t - (sprout - 0.04)) / 0.45, 0, 1);
    this.halves.forEach((half, i) => {
      const side = i ? 1 : -1;
      half
        .setVisible(cracked && split < 1)
        .setPosition(this.sproutX + side * split * 22, restY + split * split * 30)
        .setRotation(side * split * 1.2)
        .setAlpha(1 - split);
    });

    // the sprout: the i's dot
    const grow = clamp((t - sprout) / 0.3, 0, 1),
      fade = after >= 0 ? clamp(after / 0.25, 0, 1) : 0,
      big = STING_SPROUT * (1 + fade * 0.3);
    this.stalk
      .setVisible(grow > 0 && fade < 1)
      .setAlpha(1 - fade)
      .setScale(unit('logo-stalk') * big, unit('logo-stalk') * big * Math.min(1, grow * 2));
    const open = Math.max(0, grow * 2 - 1);
    this.leaves.forEach((leaf, i) =>
      leaf
        .setVisible(open > 0 && fade < 1)
        .setAlpha(1 - fade)
        .setY(STEM_TOP + 2 - 20 * LOGO_S * big) // where the leaves join the stalk (title/art.ts)
        .setScale(unit(i ? 'logo-leaf-r' : 'logo-leaf-l') * big * easeOutBack(open))
        .setRotation((1 - open) * (i ? -0.7 : 0.7) + Math.sin(t * 5) * 0.04),
    );
  }
}
