// What the fight stands on: the soil and its cap of grass, tufts and flowers that sway along the back
// edge, the leaf platforms on their stalks, and the out-of-focus grass along the bottom of the screen.
// Nothing here ever covers the characters' feet or a hazard's warning: the only things drawn in front of
// the fight sit below the line everyone stands on.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, H, TAU, W } from '../../../config';
import { platforms } from '../../../sim/arena';
import { bake, INV, part, SOFT } from '../../art/bake';
import { LEAF_LINE, mix } from '../../art/color';
import {
  blade,
  circle,
  ellipse,
  glow,
  inside,
  leaf,
  line,
  linear,
  radial,
  seeded,
  type Ctx,
} from '../../art/draw';
import type { Weather } from './weather';

const GROUND_TOP = GROUND - 30; // the tallest baked blade stays below this
const TUFT_KINDS = 3,
  FLOWER_KINDS = 5;
const FRONT_PAD = 44;
// The ground is a little wider than the screen, so a screen shake never shows its edge.
const EDGE = 24,
  GX0 = -EDGE,
  GX1 = W + EDGE,
  GW = W + EDGE * 2;

const TUFTS = Array.from({ length: 26 }, (_, i) => ({
  x: 14 + i * 37 + ((i * 53) % 19),
  kind: i % TUFT_KINDS,
  size: 0.8 + ((i * 7) % 5) * 0.09,
}));
const FLOWERS = Array.from({ length: 40 }, (_, i) => ({
  x: 10 + i * 24 + ((i * 37) % 17),
  kind: (i * 3) % FLOWER_KINDS,
  size: 0.62 + ((i * 11) % 6) * 0.06,
  late: i % 4 !== 0, // most of them only sprout once the garden blooms
  due: 0.35 + (i / 40) * 0.5, // how far the bloom must have come before this one does: they pop up in turn
}));

const capTop = (x: number) => GROUND - 5 + Math.sin(x * 0.045) * 1.6 + Math.sin(x * 0.13 + 1) * 1.1;

function drawSoil(c: Ctx, rand: () => number) {
  c.fillStyle = linear(c, 0, GROUND, 0, H, ['#b5733f', '#8f5632', '#663b23']);
  c.fillRect(GX0, GROUND + 2, GW, H + EDGE - GROUND);
  // layers in the earth
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    for (let x = GX0; x <= GX1; x += 12)
      c.lineTo(x, GROUND + 30 + i * 11 + Math.sin(x * 0.021 + i * 1.7) * 4);
    line(c, '#472814', 2 + (i % 2), 0.2);
  }
  for (let i = 0; i < 300; i++) {
    ellipse(
      c,
      GX0 + rand() * GW,
      GROUND + 14 + rand() * 58,
      1 + rand() * 2.4,
      0.7 + rand() * 1.1,
      rand() * 3,
    );
    c.fillStyle = i % 2 ? 'rgba(222,165,108,0.45)' : 'rgba(72,40,20,0.4)';
    c.fill();
  }
  // pebbles
  for (let i = 0; i < 19; i++) {
    const x = GX0 + 10 + i * 53 + rand() * 30,
      y = GROUND + 28 + rand() * 36,
      rx = 5 + rand() * 7,
      ry = rx * (0.55 + rand() * 0.2);
    glow(c, x + 1, y + ry * 0.9, rx * 1.3, '#2b1608', 0.4, ry * 0.7);
    ellipse(c, x, y, rx, ry, (rand() - 0.5) * 0.5);
    c.fillStyle = radial(c, x, y, rx * 1.3, ['#e6d8c4', '#a8937d', '#7d6855'], x - rx * 0.4, y - ry * 0.5);
    c.fill();
  }
  // roots dangling from the turf
  for (let i = 0; i < 15; i++) {
    const x = GX0 + 20 + i * 68 + rand() * 40,
      len = 12 + rand() * 20,
      sway = (rand() - 0.5) * 12;
    c.beginPath();
    c.moveTo(x, GROUND + 12);
    c.quadraticCurveTo(x + sway, GROUND + 12 + len * 0.6, x + sway * 0.4, GROUND + 12 + len);
    c.moveTo(x + sway * 0.5, GROUND + 12 + len * 0.5);
    c.lineTo(x + sway * 0.5 + 5, GROUND + 12 + len * 0.8);
    line(c, '#ecd3a6', 1.5, 0.55);
  }
  // the turf's shadow on the soil
  c.fillStyle = linear(c, 0, GROUND + 8, 0, GROUND + 36, ['rgba(52,26,10,0.55)', 'rgba(52,26,10,0)']);
  c.fillRect(GX0, GROUND + 8, GW, 28);
  // and the screen's bottom edge falls into shade
  c.fillStyle = linear(c, 0, H - 26, 0, H, ['rgba(40,20,10,0)', 'rgba(40,20,10,0.35)']);
  c.fillRect(GX0, H - 26, GW, 26);
}

function drawTurf(c: Ctx, rand: () => number) {
  const greens = ['#58b947', '#6fcd4c', '#48a640', '#8ade5c'];
  // blades standing behind the edge of the turf
  for (let x = GX0; x < GX1; x += 3 + rand() * 3) {
    blade(c, x, capTop(x) + 4, 5 + rand() * 12, 3.4, (rand() - 0.5) * 7);
    c.fillStyle = greens[Math.floor(rand() * greens.length)];
    c.fill();
  }
  // the turf itself, hanging over the soil in scallops
  const edge: [number, number, number][] = []; // [x, y, depth] of each scallop
  for (let x = GX1 + 10; x > GX0 - 10;) {
    const w = 16 + rand() * 20;
    edge.push([x - w, GROUND + 9 + rand() * 2, 5 + rand() * 7]);
    x -= w;
  }
  const scallops = () => {
    let from = GX1 + 10;
    for (const [x, y, d] of edge) {
      c.quadraticCurveTo((from + x) / 2, y + d * 2, x, y);
      from = x;
    }
  };
  const turf = () => {
    c.beginPath();
    c.moveTo(GX0 - 10, capTop(GX0 - 10));
    for (let x = GX0 - 10; x <= GX1 + 10; x += 6) c.lineTo(x, capTop(x));
    c.lineTo(GX1 + 10, GROUND + 10);
    scallops();
    c.closePath();
  };
  turf();
  c.fillStyle = linear(c, 0, GROUND - 6, 0, GROUND + 22, ['#a6ec6c', '#74d04e', '#4dae3d']);
  c.fill();
  inside(c, turf, () => {
    c.lineWidth = 1.3;
    for (let i = 0; i < 560; i++) {
      const x = GX0 + rand() * GW,
        y = capTop(x) + 3 + rand() * 16,
        h = 2.5 + rand() * 4;
      c.strokeStyle = i % 3 ? 'rgba(200,246,142,0.7)' : 'rgba(52,140,54,0.55)';
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rand() - 0.5) * 3, y - h);
      c.stroke();
    }
  });
  c.beginPath();
  c.moveTo(GX1 + 10, GROUND + 10);
  scallops();
  line(c, '#2a8038', 2.6);
  c.beginPath();
  for (let x = GX0 - 10; x <= GX1 + 10; x += 6) c.lineTo(x, capTop(x) + 1);
  line(c, '#e0fba2', 2, 0.9);
}

// A clump of grass rooted at (0, 0).
function drawTuft(c: Ctx, rand: () => number) {
  const n = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5,
      h = 15 + rand() * 13 - Math.abs(u) * 10,
      x = u * 14;
    blade(c, x, 1, h, 4.6, u * 20 + (rand() - 0.5) * 5);
    c.fillStyle = linear(c, 0, 0, 0, -h, [
      mix('#3f9c3c', '#55b445', rand()),
      mix('#8fe05f', '#b6f07c', rand()),
    ]);
    c.fill();
  }
}

// A flower on its stem, rooted at (0, 0). Returns nothing; kind picks the bloom.
function drawFlower(c: Ctx, kind: number, rand: () => number) {
  const h = 17 + rand() * 9,
    lean = (rand() - 0.5) * 7;
  c.beginPath();
  c.moveTo(0, 1);
  c.quadraticCurveTo(lean * 0.2, -h * 0.5, lean, -h);
  line(c, '#3f9d3a', 2.2);
  leaf(c, lean * 0.25, -h * 0.4, 8, 2.6, -0.5);
  c.fillStyle = '#5fbf4d';
  c.fill();
  leaf(c, lean * 0.25, -h * 0.3, 7, 2.4, Math.PI + 0.5);
  c.fill();

  const x = lean,
    y = -h;
  const petals = (n: number, d: number, rx: number, ry: number, fill: string, edge: string) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.3;
      ellipse(c, x + Math.cos(a) * d, y + Math.sin(a) * d, rx, ry, a);
      c.fillStyle = fill;
      c.fill();
      line(c, edge, 0.9, 0.7);
    }
  };
  const centre = (r: number, fill: string, edge: string) => {
    circle(c, x, y, r);
    c.fillStyle = fill;
    c.fill();
    line(c, edge, 0.9, 0.8);
    circle(c, x - r * 0.3, y - r * 0.3, r * 0.35);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fill();
  };
  if (kind === 0) {
    petals(9, 4.6, 3.6, 1.9, '#ffffff', '#b9c2d6');
    centre(2.8, '#ffd23f', '#d98f1a');
  } else if (kind === 1) {
    // tulip: three overlapping petals in a cup
    for (const [dx, fill] of [
      [-2.6, '#f0608c'],
      [2.6, '#f0608c'],
      [0, '#ff8eb0'],
    ] as const) {
      c.beginPath();
      c.moveTo(x + dx - 3, y + 4);
      c.quadraticCurveTo(x + dx - 4.5, y - 3, x + dx, y - 7);
      c.quadraticCurveTo(x + dx + 4.5, y - 3, x + dx + 3, y + 4);
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      line(c, '#c2416d', 0.9, 0.7);
    }
  } else if (kind === 2) {
    petals(5, 3.9, 3.5, 3.1, '#b99bff', '#7f63d2');
    centre(2.2, '#fff1a8', '#d9a800');
  } else if (kind === 3) {
    petals(5, 3.7, 3.4, 3, '#ffdf5a', '#d99a1a');
    centre(2.1, '#ff9d3c', '#c9641a');
  } else {
    petals(6, 3.9, 3.6, 2.3, '#ffc4dd', '#e58bb4');
    centre(2.2, '#ffe27a', '#d99a1a');
  }
}

// A broad leaf to stand on. (0, 0) is the middle of the walkable top; w is the walkable width.
function drawLeafPlatform(c: Ctx, w: number) {
  const lx = -w / 2 - 13,
    ly = 3,
    rx = w / 2 + 16,
    ry = -1;
  // underside
  c.beginPath();
  c.moveTo(lx, ly);
  c.bezierCurveTo(-w * 0.3, 14, w * 0.3, 13, rx, ry);
  c.bezierCurveTo(w * 0.32, 28, -w * 0.3, 31, lx, ly);
  c.closePath();
  c.fillStyle = linear(c, 0, 6, 0, 28, ['#3f9f42', '#277a35']);
  c.fill();
  line(c, LEAF_LINE, 3.2);
  // top
  const top = () => {
    c.beginPath();
    c.moveTo(lx, ly);
    c.bezierCurveTo(-w * 0.3, -11, w * 0.3, -12, rx, ry);
    c.bezierCurveTo(w * 0.3, 13, -w * 0.3, 14, lx, ly);
    c.closePath();
  };
  top();
  c.fillStyle = linear(c, -w / 2, -9, w / 2, 12, ['#c3f482', '#8adb5c', '#5fc049']);
  c.fill();
  inside(c, top, () => {
    glow(c, -w * 0.18, -6, w * 0.34, '#ffffff', 0.38, 6);
    glow(c, w * 0.3, 9, w * 0.3, '#1f7a34', 0.3, 6);
    // veins
    c.beginPath();
    c.moveTo(lx + 6, ly);
    c.quadraticCurveTo(0, 1.5, rx - 6, ry + 0.5);
    line(c, '#e6fbb0', 2.4, 0.95);
    for (let i = 1; i < 8; i++) {
      const u = i / 8,
        x = lx + (rx - lx) * u,
        y = 1.5 - Math.abs(u - 0.5) * 2,
        reach = Math.sin(u * Math.PI);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 9, y - 3 * reach, x + 15, y - 8 * reach);
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 9, y + 3 * reach, x + 15, y + 8 * reach);
      line(c, '#d4f7a0', 1.4, 0.6);
    }
  });
  top();
  line(c, LEAF_LINE, 3.2);
  // a dewdrop
  circle(c, -w * 0.27, 3.5, 3);
  c.fillStyle = 'rgba(214,244,255,0.9)';
  c.fill();
  line(c, '#4fa7c9', 0.8, 0.7);
  circle(c, -w * 0.27 - 1, 2.5, 1);
  c.fillStyle = '#fff';
  c.fill();
}

// The stalk a leaf platform grows on: from under the leaf at (0, 0) down to the ground `drop` below.
function drawStalk(c: Ctx, drop: number, lean: number) {
  // the stalk is one curve; these are its two bends
  const bx1 = -16,
    by1 = drop * 0.3,
    bx2 = 18 + lean,
    by2 = drop * 0.68;
  const path = () => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(bx1, by1, bx2, by2, lean, drop);
  };
  // a point part of the way down that curve
  const at = (u: number, a: number, b: number, end: number) =>
    3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u * end;
  for (const [u, side] of [
    [0.42, -1],
    [0.7, 1],
  ] as const) {
    // a leaflet on each side, growing out of the stalk
    const x = at(u, bx1, bx2, lean),
      y = at(u, by1, by2, drop);
    leaf(c, x, y, 20, 6.5, side > 0 ? -0.5 : Math.PI + 0.5);
    c.fillStyle = linear(c, x - 20, y, x + 20, y, ['#9be36b', '#58b548']);
    c.fill();
    line(c, LEAF_LINE, 2.2);
  }
  path();
  line(c, LEAF_LINE, 9);
  path();
  line(c, '#57b547', 5.4);
  c.save();
  c.translate(-1.4, 0);
  path();
  line(c, '#b4ee83', 1.7, 0.85);
  c.restore();
  // a curl of tendril near the top
  c.beginPath();
  c.moveTo(-3, 16);
  c.bezierCurveTo(-20, 18, -22, 34, -12, 33);
  c.bezierCurveTo(-6, 32, -8, 25, -12, 27);
  line(c, '#3f9d3a', 1.8);
}

export function bakeGround(scene: Scene) {
  bake(scene, 'bg-ground', GW, H + EDGE - GROUND_TOP, EDGE, -GROUND_TOP, (c) => {
    const rand = seeded(3);
    drawSoil(c, rand);
    drawTurf(c, rand);
  });
  for (let i = 0; i < TUFT_KINDS; i++)
    bake(scene, `tuft-${i}`, 44, 34, 22, 31, (c) => drawTuft(c, seeded(60 + i)));
  for (let i = 0; i < FLOWER_KINDS; i++)
    bake(scene, `flower-${i}`, 30, 42, 15, 38, (c) => drawFlower(c, i, seeded(70 + i)));

  platforms.forEach((p, i) => {
    bake(scene, `platform-${i}`, p.w + 44, 48, p.w / 2 + 20, 15, (c) => drawLeafPlatform(c, p.w));
    const drop = GROUND - p.y - 8;
    bake(scene, `stalk-${i}`, 76, drop + 8, 38, 2, (c) => drawStalk(c, drop, i % 2 ? 12 : -10));
  });
  bake(scene, 'platform-shadow', 180, 20, 90, 10, (c) => glow(c, 0, 0, 86, '#173d1f', 0.32, 8), SOFT);

  // out-of-focus grass along the bottom of the screen, taller toward the corners
  const fw = W + FRONT_PAD * 2;
  bake(
    scene,
    'fg-grass',
    fw,
    84,
    FRONT_PAD,
    84,
    (c) => {
      const rand = seeded(90);
      for (let x = -FRONT_PAD; x < W + FRONT_PAD; x += 4 + rand() * 5) {
        const corner = Math.pow(Math.abs(x - W / 2) / (W / 2), 2.4),
          h = 14 + corner * 40 + rand() * 16;
        blade(c, x, 4, h, 7 + rand() * 4, (rand() - 0.5) * 16);
        c.fillStyle = linear(c, 0, 0, 0, -h, [
          mix('#12512f', '#1b6a3e', rand()),
          mix('#2a8850', '#44a765', rand()),
        ]);
        c.fill();
      }
      for (const [x, rot, len] of [
        [-14, -1.2, 62],
        [22, -0.75, 46],
        [W - 16, -1.95, 58],
        [W + 20, -2.3, 66],
      ] as const) {
        leaf(c, x, 6, len, len * 0.24, rot, 0.5);
        c.fillStyle = linear(c, x, 0, x, -len, ['#14562f', '#2f8f52']);
        c.fill();
      }
    },
    SOFT,
  );
  // a leafy branch hanging into the top right corner; (0, 0) is that corner
  bake(
    scene,
    'fg-branch',
    230,
    130,
    206,
    12,
    (c) => {
      const rand = seeded(91);
      c.beginPath();
      c.moveTo(26, -8);
      c.quadraticCurveTo(-50, 26, -172, 34);
      line(c, '#3a2a22', 6);
      for (let i = 0; i < 17; i++) {
        const u = i / 16,
          x = 14 - u * 180,
          y = 2 + Math.sin(u * 1.9) * 31,
          len = 28 + rand() * 20;
        leaf(c, x, y, len, len * 0.27, 1.1 + (rand() - 0.5) * 1.5 + (i % 2 ? 0.5 : -0.3), 0.5);
        c.fillStyle = linear(c, x, y, x, y + len, [
          mix('#1a6a3c', '#2d8a4e', rand()),
          mix('#12502e', '#1b6a3e', rand()),
        ]);
        c.fill();
      }
    },
    SOFT,
  );
}

export class Ground {
  private soil: GameObjects.Image;
  private tufts: GameObjects.Image[];
  private flowers: GameObjects.Image[];
  private grown: number[]; // 0 = not sprouted yet, 1 = fully out
  private leaves: GameObjects.Image[];
  private stalks: GameObjects.Image[];
  private leafShadows: GameObjects.Image[];
  private front: GameObjects.Image;
  private branch: GameObjects.Image;
  private tinted: GameObjects.Image[]; // everything here that takes the weather's tint
  private tint = 0xffffff; // the tint they have now

  constructor(scene: Scene, depth: { ground: number; platforms: number; front: number }) {
    this.soil = part(scene, 'bg-ground').setDepth(depth.ground);
    this.leafShadows = platforms.map((p) =>
      part(scene, 'platform-shadow', p.x + p.w / 2, GROUND + 4).setDepth(depth.ground),
    );
    this.tufts = TUFTS.map(({ x, kind, size }) =>
      part(scene, `tuft-${kind}`, x, GROUND - 2)
        .setScale(INV * size)
        .setDepth(depth.ground),
    );
    this.flowers = FLOWERS.map(({ x, kind, late }) =>
      part(scene, `flower-${kind}`, x, GROUND - 1)
        .setDepth(depth.ground)
        .setVisible(!late),
    );
    this.grown = FLOWERS.map(({ late }) => (late ? 0 : 1));
    this.stalks = platforms.map((p, i) =>
      part(scene, `stalk-${i}`, p.x + p.w / 2, p.y + 8).setDepth(depth.platforms),
    );
    this.leaves = platforms.map((_, i) => part(scene, `platform-${i}`).setDepth(depth.platforms));
    this.front = part(scene, 'fg-grass', 0, H + 6).setDepth(depth.front);
    this.branch = part(scene, 'fg-branch', W, 0).setDepth(depth.front);
    this.tinted = [
      this.soil,
      ...this.tufts,
      ...this.flowers,
      ...this.stalks,
      ...this.leaves,
      this.front,
      this.branch,
    ];
  }

  sync(t: number, dt: number, weather: Weather, pan: number) {
    const { look, weight } = weather,
      wind = look.wind,
      gust = 1 + wind * 2.5;
    // The weather only turns now and then: retint the seventy-odd parts when it does, not every frame.
    if (look.groundTint !== this.tint) {
      this.tint = look.groundTint;
      for (const img of this.tinted) img.setTint(this.tint);
    }

    const tuftSway = t * (1.6 + wind * 2),
      lean = wind * 0.22;
    for (let i = 0; i < TUFTS.length; i++)
      this.tufts[i].setRotation(Math.sin(tuftSway + TUFTS[i].x * 0.08) * 0.07 * gust - lean);

    // A few flowers are always out. The rest pop up, one after another, when the garden blooms.
    const ease = Math.min(1, dt * 7),
      flowerSway = t * (1.3 + wind * 2),
      droop = wind * 0.3 - weight.bloom * 0.05;
    for (let i = 0; i < FLOWERS.length; i++) {
      const f = FLOWERS[i],
        want = f.late && weight.bloom <= f.due ? 0 : 1;
      let g = this.grown[i];
      if (g === 0 && !want) continue; // still under the ground and staying there: nothing to move
      g += (want - g) * ease;
      if (!want && g < 0.02) g = 0; // gone back under
      this.grown[i] = g;
      this.flowers[i]
        .setVisible(g > 0)
        .setScale(INV * f.size * g * (1 + Math.sin(g * Math.PI) * 0.35)) // overshoots on the way up
        .setRotation(Math.sin(flowerSway + f.x * 0.11) * 0.09 * gust - droop);
    }

    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i],
        bob = Math.sin(t * 1.5 + p.x) * 2;
      this.leaves[i].setPosition(p.x + p.w / 2, p.y + bob).setRotation(Math.sin(t * 1.1 + p.x) * 0.012);
      this.leafShadows[i].setAlpha(0.8 + bob * 0.04);
    }
    // things in front of the fight slide the other way from things behind it
    this.front.setX(-pan * 20);
    this.branch.setX(W - pan * 26).setRotation(Math.sin(t * 0.8) * 0.02 * gust);
  }
}
