// All art is drawn in code. Each piece ("part") is drawn once at startup into its own texture with the
// Canvas 2D helpers in draw.ts, then views move, rotate and scale those parts every frame.
// To use drawn sprite art instead, load an atlas with the same keys and skip the bake step.
import type { GameObjects, Scene } from 'phaser';
import { RES } from '../../config';

// Baked textures are RES times larger than their logical size, so every part is shown at this scale.
// When a view scales a part, it multiplies by INV: setScale(INV * 1.2).
export const INV = 1 / RES;

type Draw = (ctx: CanvasRenderingContext2D) => void;
const origins = new Map<string, [number, number]>();

// Bake a part of w x h logical pixels. (ax, ay) is where the part's own (0, 0) sits inside that box;
// draw() then draws around (0, 0).
export function bake(scene: Scene, key: string, w: number, h: number, ax: number, ay: number, draw: Draw) {
  const texture = scene.textures.createCanvas(key, Math.ceil(w * RES), Math.ceil(h * RES));
  if (!texture) throw new Error(`Could not create texture "${key}"`);
  const ctx = texture.getContext();
  ctx.scale(RES, RES);
  ctx.translate(ax, ay);
  draw(ctx);
  texture.refresh();
  origins.set(key, [ax / w, ay / h]);
}

// An image of a baked part, pivoting on the part's own (0, 0).
export function part(scene: Scene, key: string, x = 0, y = 0): GameObjects.Image {
  const origin = origins.get(key);
  if (!origin) throw new Error(`No baked part "${key}"`);
  return scene.add.image(x, y, key).setOrigin(origin[0], origin[1]).setScale(INV);
}

// Change which part an image shows (for parts baked with the same size and origin, like faces).
export function show(image: GameObjects.Image, key: string) {
  if (image.texture.key !== key) image.setTexture(key);
}

// '#rgb' or '#rrggbb' to the number Phaser wants.
export function hex(color: string): number {
  const h = color.slice(1);
  return parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h, 16);
}
