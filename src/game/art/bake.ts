// All art is drawn in code. Each piece ("part") is drawn once at startup with the Canvas 2D helpers in
// draw.ts, then views move, rotate and scale those parts every frame.
//
// Small parts are packed together into a few big shared textures (an atlas). That matters for speed: the
// graphics card draws everything that shares a texture in one go, so a hundred parts on one atlas cost
// about as much as one. Big parts (whole background layers) keep a texture of their own.
//
// To use drawn sprite art instead, load an atlas whose frames have the same keys and skip the bake step.
import type { GameObjects, Scene } from 'phaser';
import { RES } from '../../config';

export { hex } from './color';

// Baked textures are RES times larger than their logical size, so every part is shown at this scale.
// When a view scales a part, it multiplies by INV: setScale(INV * 1.2).
export const INV = 1 / RES;
// Big soft things (glows, haze, far hills) are baked smaller than that: nobody can tell, and a
// full-screen layer costs a quarter of the memory. Parts baked this way are scaled by unit(key).
export const SOFT = 1;

const PAGE = 2048; // width and height of an atlas page, in texture pixels (every device supports this)
const SOLO = 512; // a part with a side longer than this many texture pixels gets a texture of its own
const GUTTER = 2; // empty pixels around each part on a page, so neighbours never bleed into each other

type Draw = (ctx: CanvasRenderingContext2D) => void;
interface Baked {
  texture: string;
  frame?: string; // set when the part lives on an atlas page
  origin: [number, number];
  unit: number;
}
interface Job {
  key: string;
  pw: number; // size in texture pixels
  ph: number;
  res: number;
  ax: number;
  ay: number;
  draw: Draw;
}
const baked = new Map<string, Baked>();
let queue: Job[] = [];
let packed = false; // once the atlas is drawn, anything baked later gets a texture of its own

function paint(ctx: CanvasRenderingContext2D, job: Job, x: number, y: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, job.pw, job.ph);
  ctx.clip(); // a part may only draw inside its own box
  ctx.translate(x, y);
  ctx.scale(job.res, job.res);
  ctx.translate(job.ax, job.ay);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  job.draw(ctx);
  ctx.restore();
}

// Bake a part of w x h logical pixels. (ax, ay) is where the part's own (0, 0) sits inside that box;
// draw() then draws around (0, 0). res = texture pixels per logical pixel.
// Small parts are only queued here; finishBaking() draws them onto the atlas.
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
  if (baked.has(key)) throw new Error(`Part "${key}" is baked twice`);
  const job: Job = { key, pw: Math.ceil(w * res), ph: Math.ceil(h * res), res, ax, ay, draw };
  const part: Baked = { texture: key, origin: [ax / w, ay / h], unit: 1 / res };
  baked.set(key, part);
  if (!packed && job.pw <= SOLO && job.ph <= SOLO) {
    queue.push(job);
    return;
  }
  const texture = scene.textures.createCanvas(key, job.pw, job.ph);
  if (!texture) throw new Error(`Could not create texture "${key}"`);
  paint(texture.getContext(), job, 0, 0);
  texture.refresh();
}

// Call once after every bake(): packs the queued parts onto atlas pages and draws them.
export function finishBaking(scene: Scene) {
  // Tallest first, in rows ("shelves"): simple, and it wastes little space when heights are sorted.
  const jobs = queue.sort((a, b) => b.ph - a.ph);
  queue = [];
  packed = true;
  // Each part is drawn on this scratch canvas first and copied onto its page from there. (Drawing it
  // straight onto the page and copying edge pixels within the page is far slower: every copy from a
  // canvas to itself makes the browser duplicate the whole page first.)
  const scratch = document.createElement('canvas');
  scratch.width = scratch.height = SOLO;
  const pen = scratch.getContext('2d')!;
  let page = -1,
    ctx: CanvasRenderingContext2D | null = null,
    x = PAGE, // forces the first part to open a row, and that row to open a page
    y = PAGE,
    rowH = 0;
  const pages: { refresh(): unknown }[] = [];
  for (const job of jobs) {
    const { pw, ph } = job,
      w = pw + GUTTER * 2,
      h = ph + GUTTER * 2;
    if (x + w > PAGE) {
      x = 0;
      y += rowH;
      rowH = h;
    }
    if (y + h > PAGE) {
      const texture = scene.textures.createCanvas(`atlas-${++page}`, PAGE, PAGE);
      if (!texture) throw new Error('Could not create an atlas page');
      // Everything still works on two pages, but each one is 16 MB of video memory, and parts on
      // different pages cannot be drawn in one go. Worth knowing the moment it happens.
      if (page > 0) console.warn(`The art no longer fits on one atlas page: opening page ${page + 1}.`);
      pages.push(texture);
      ctx = texture.getContext();
      x = y = 0;
      rowH = h;
    }
    const px = x + GUTTER,
      py = y + GUTTER,
      to = ctx!;
    pen.clearRect(0, 0, SOLO, SOLO);
    paint(pen, job, 0, 0);
    to.drawImage(scratch, 0, 0, pw, ph, px, py, pw, ph);
    // Repeat the part's outermost pixels once into the gutter. When a part is stretched (a 4-pixel white
    // square over the whole screen, say), the smoothing at its edges then blends with more of itself
    // instead of with the empty gutter.
    to.drawImage(scratch, 0, 0, pw, 1, px, py - 1, pw, 1);
    to.drawImage(scratch, 0, ph - 1, pw, 1, px, py + ph, pw, 1);
    to.drawImage(scratch, 0, 0, 1, ph, px - 1, py, 1, ph);
    to.drawImage(scratch, pw - 1, 0, 1, ph, px + pw, py, 1, ph);
    const texture = scene.textures.get(`atlas-${page}`);
    texture.add(job.key, 0, px, py, pw, ph);
    const part = baked.get(job.key)!;
    part.texture = texture.key;
    part.frame = job.key;
    x += w;
  }
  for (const texture of pages) texture.refresh();
}

function get(key: string): Baked {
  const part = baked.get(key);
  if (!part) throw new Error(`No baked part "${key}"`);
  return part;
}

// The scale at which a baked part appears at its logical size (INV unless it was baked with its own res).
export function unit(key: string): number {
  return get(key).unit;
}

// An image of a baked part, pivoting on the part's own (0, 0).
export function part(scene: Scene, key: string, x = 0, y = 0): GameObjects.Image {
  const p = get(key);
  return scene.add.image(x, y, p.texture, p.frame).setOrigin(p.origin[0], p.origin[1]).setScale(p.unit);
}

// A ribbon of a baked part that bends along a line of points: Sunny's stem, the vine. The part's
// length is spread along the points, first to last, and its height is the ribbon's thickness. It is one
// strip whose corners are moved in place, so following a curve that changes every frame costs almost
// nothing. (A shape rebuilt with Graphics is cut into triangles again every frame.)
export class Ribbon {
  readonly rope: GameObjects.Rope;
  private points: { x: number; y: number }[];
  private perWorld: number; // the rope works in texture pixels

  constructor(scene: Scene, key: string, points: number) {
    const p = get(key);
    this.points = Array.from({ length: points }, () => ({ x: 0, y: 0 }));
    this.rope = scene.add.rope(0, 0, p.texture, p.frame, this.points, true).setScale(p.unit);
    this.perWorld = 1 / p.unit;
  }
  // Put point i at a world position. Call bend() once all the points are placed.
  set(i: number, x: number, y: number) {
    const point = this.points[i];
    point.x = x * this.perWorld;
    point.y = y * this.perWorld;
  }
  bend() {
    this.rope.setDirty();
  }
}

// Which part an image is showing.
const shown = (image: GameObjects.Image) =>
  image.frame.name === '__BASE' ? image.texture.key : image.frame.name;

// Change which part an image shows. It keeps its scale, so swap between parts baked at the same size
// (faces, the petals of each phase, particle shapes).
export function show(image: GameObjects.Image, key: string) {
  if (shown(image) === key) return;
  const p = get(key);
  image.setTexture(p.texture, p.frame).setOrigin(p.origin[0], p.origin[1]);
}
