// The game's logo over Pip's yard: two lines and a sprout growing out of the first. Each part has its own
// image so the opening can drop the first line in, stamp the second down under it and grow the sprout
// (TitleScene says how far along each one is).
import type { GameObjects, Scene } from 'phaser';
import { part, unit } from '../../art/bake';
import { LOGO_PARTS, LOGO_TILT } from './art';

const LEAVES = ['logo-leaf-l', 'logo-leaf-r'];

// One line of the logo: how far above its place it still is, its squash and stretch, and how much of it
// shows.
export interface LinePose {
  dy: number;
  sx: number;
  sy: number;
  alpha: number;
}
export const LINE_AT_REST: LinePose = { dy: 0, sx: 1, sy: 1, alpha: 1 };
// Where the whole logo is, each line's pose, and how far the sprout has grown (0 = not yet, 1 = grown).
export interface LogoPose {
  x: number;
  y: number;
  scale: number;
  tilt: number; // a little rock, added to the logo's lean
  line1: LinePose;
  line2: LinePose;
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
    this.root
      .setPosition(pose.x, pose.y)
      .setScale(pose.scale)
      .setRotation(LOGO_TILT + pose.tilt);
    const line = (img: GameObjects.Image, key: string, y: number, p: LinePose) =>
      img
        .setVisible(p.alpha > 0)
        .setAlpha(p.alpha)
        .setY(y + p.dy)
        .setScale(unit(key) * p.sx, unit(key) * p.sy);
    line(this.line1, 'logo-line1', LOGO_PARTS.line1.y, pose.line1);
    line(this.line2, 'logo-line2', LOGO_PARTS.line2.y, pose.line2);
    // the sprout rides on the first line
    const grow = pose.sprout,
      dy = pose.line1.dy;
    this.stalk
      .setVisible(grow > 0)
      .setY(LOGO_PARTS.stalk.y + dy)
      .setScale(unit('logo-stalk'), unit('logo-stalk') * Math.min(1, grow * 2));
    const open = Math.max(0, grow * 2 - 1); // the leaves unfurl once the stalk is up
    this.leaves.forEach((leaf, i) =>
      leaf
        .setVisible(open > 0)
        .setY(LOGO_PARTS.leaves.y + dy)
        .setScale(unit(LEAVES[i]) * open)
        .setRotation((1 - open) * (i ? -0.6 : 0.6)),
    );
  }
}
