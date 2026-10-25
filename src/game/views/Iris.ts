// A round hole in a solid colour that opens on a scene or closes on it, as old cartoons begin and end: the
// ring baked below for the hole's edge, and four plain bands of the same colour around it.
import type { GameObjects, Scene } from 'phaser';
import { H, W } from '../../config';
import { bake, part, unit } from '../art/bake';
import { circle } from '../art/draw';

const IRIS_R = 200; // the hole as baked; it is scaled to the size wanted
// Solid colour around the hole, as baked: the bands reach a little way onto it, so no seam shows where they
// meet even as the ring gets small.
const MARGIN = 50;
const PAD = 260; // the bands reach this far past the edges, under any shake or zoom
// The farthest any point of the screen can be from a hole somewhere on it: open this wide, nothing is covered.
export const IRIS_OPEN = Math.hypot(W, H);

// A white square with a round hole in it, tinted to the colour wanted.
export function bakeIris(scene: Scene) {
  const side = (IRIS_R + MARGIN) * 2;
  bake(scene, 'iris', side, side, side / 2, side / 2, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(-side / 2, -side / 2, side, side);
    c.globalCompositeOperation = 'destination-out';
    circle(c, 0, 0, IRIS_R);
    c.fill();
    c.globalCompositeOperation = 'source-over';
  });
}

export class Iris {
  private ring: GameObjects.Image;
  private bands: GameObjects.Image[];

  // layer: a container to draw in (one fixed to the screen, say); otherwise the scene itself, at depth.
  constructor(scene: Scene, depth: number, layer?: GameObjects.Container) {
    this.ring = part(scene, 'iris').setDepth(depth);
    this.bands = [0, 1, 2, 3].map(() => part(scene, 'white').setDepth(depth));
    layer?.add([...this.bands, this.ring]);
  }

  // A hole of radius r at (x, y), in screen positions, in a screen of this colour: 0 covers everything,
  // IRIS_OPEN or more hides it. alpha fades the whole thing, for those who would rather have a fade.
  set(x: number, y: number, r: number, color: number, alpha = 1) {
    const open = r >= IRIS_OPEN || alpha <= 0;
    if (r < 4) r = 0; // a hole this small is shut: no ring, so no seams in the last frames
    this.ring.setVisible(!open && r > 0).setAlpha(alpha);
    for (const b of this.bands) b.setVisible(!open).setTint(color).setAlpha(alpha);
    if (open) return;
    const k = r / IRIS_R,
      h = (IRIS_R + MARGIN) * k - Math.min(3, MARGIN * k * 0.5); // the bands' edge, just onto the ring
    this.ring
      .setPosition(x, y)
      .setScale(unit('iris') * k)
      .setTint(color);
    const [top, bottom, left, right] = this.bands;
    top.setPosition(-PAD, -PAD).setDisplaySize(W + PAD * 2, y - h + PAD);
    bottom.setPosition(-PAD, y + h).setDisplaySize(W + PAD * 2, H + PAD - (y + h));
    left.setPosition(-PAD, y - h).setDisplaySize(x - h + PAD, h * 2);
    right.setPosition(x + h, y - h).setDisplaySize(W + PAD - (x + h), h * 2);
  }
}
