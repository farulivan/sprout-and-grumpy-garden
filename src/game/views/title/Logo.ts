// The game's logo over Pip's yard: two lines and a sprout growing out of the first. Each part has its own
// image so the opening can drop the lines in one after the other and grow the sprout (TitleScene says how
// far along each one is).
import type { GameObjects, Scene } from 'phaser';
import { part, unit } from '../../art/bake';
import { LOGO_PARTS, LOGO_TILT } from './art';

const LEAVES = ['logo-leaf-l', 'logo-leaf-r'];

// Where the logo is and how far each part has come in: 0 = not there yet, 1 = in place.
export interface LogoPose {
  x: number;
  y: number;
  scale: number;
  line1: number;
  line2: number;
  sprout: number;
}

export class Logo {
  private root: GameObjects.Container;
  private line1: GameObjects.Image;
  private line2: GameObjects.Image;
  private stalk: GameObjects.Image;
  private leaves: GameObjects.Image[];

  constructor(scene: Scene, depth: number) {
    const { line1, line2, stalk, leaves } = LOGO_PARTS;
    this.stalk = part(scene, 'logo-stalk', stalk.x, stalk.y);
    this.leaves = LEAVES.map((key) => part(scene, key, leaves.x, leaves.y));
    this.line1 = part(scene, 'logo-line1', line1.x, line1.y);
    this.line2 = part(scene, 'logo-line2', line2.x, line2.y);
    this.root = scene.add
      .container(0, 0, [this.stalk, ...this.leaves, this.line1, this.line2])
      .setRotation(LOGO_TILT)
      .setDepth(depth);
  }

  sync(pose: LogoPose) {
    this.root.setPosition(pose.x, pose.y).setScale(pose.scale);
    this.line1.setAlpha(Math.min(1, pose.line1 * 3)).setVisible(pose.line1 > 0);
    this.line2.setAlpha(Math.min(1, pose.line2 * 3)).setVisible(pose.line2 > 0);
    const grow = pose.sprout;
    this.stalk.setVisible(grow > 0).setScale(unit('logo-stalk'), unit('logo-stalk') * Math.min(1, grow * 2));
    const open = Math.max(0, grow * 2 - 1); // the leaves unfurl once the stalk is up
    this.leaves.forEach((leaf, i) =>
      leaf
        .setVisible(open > 0)
        .setScale(unit(LEAVES[i]) * open)
        .setRotation((1 - open) * (i ? -0.6 : 0.6)),
    );
  }
}
