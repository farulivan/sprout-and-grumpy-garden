// All art is drawn in code. Each piece ("part") is drawn once at startup into its own texture with the
// Canvas 2D helpers in draw.ts, then views move, rotate and scale those parts every frame.
// To use drawn sprite art instead, load an atlas with the same keys and skip the bake step.
import type { GameObjects, Scene } from 'phaser';
import { RES } from '../../config';

export { hex } from './color';

// Baked textures are RES times larger than their logical size, so every part is shown at this scale.
// When a view scales a part, it multiplies by INV: setScale(INV * 1.2).
export const INV = 1 / RES;
// Big soft things (glows, haze, far hills) are baked smaller than that: nobody can tell, and a
// full-screen layer costs a quarter of the memory. Parts baked this way are scaled by unit(key).
export const SOFT = 1;

type Draw = (ctx: CanvasRenderingContext2D) => void;
const origins = new Map<string, [number, number]>();
const units = new Map<string, number>();

// Bake a part of w x h logical pixels. (ax, ay) is where the part's own (0, 0) sits inside that box;
// draw() then draws around (0, 0). res = texture pixels per logical pixel.
export function bake(
  scene: Scene,
  key: string,
  w: number,
  h: number,
  ax: number,
  ay: number,
  draw: Draw,
  res = RES,
) {
  const texture = scene.textures.createCanvas(key, Math.ceil(w * res), Math.ceil(h * res));
  if (!texture) throw new Error(`Could not create texture "${key}"`);
  const ctx = texture.getContext();
  ctx.scale(res, res);
  ctx.translate(ax, ay);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  texture.refresh();
  origins.set(key, [ax / w, ay / h]);
  units.set(key, 1 / res);
}

// The scale at which a baked part appears at its logical size (INV unless it was baked with its own res).
export function unit(key: string): number {
  const u = units.get(key);
  if (u === undefined) throw new Error(`No baked part "${key}"`);
  return u;
}

// An image of a baked part, pivoting on the part's own (0, 0).
export function part(scene: Scene, key: string, x = 0, y = 0): GameObjects.Image {
  const origin = origins.get(key);
  if (!origin) throw new Error(`No baked part "${key}"`);
  return scene.add.image(x, y, key).setOrigin(origin[0], origin[1]).setScale(unit(key));
}

// Change which part an image shows (for parts baked with the same size and origin, like faces).
export function show(image: GameObjects.Image, key: string) {
  if (image.texture.key !== key) image.setTexture(key);
}
