// The land behind the fight, far to near: mountains, wooded hills with a cottage, a flowery meadow with the
// garden path Sunny is blocking, a few swaying trees, and the garden fence with its hedges.
// Far things are pale, bluish and outline-free on purpose: it pushes them back so the characters stand out.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, TAU, W } from '../../../config';
import { bake, INV, part, SOFT } from '../../art/bake';
import { mix, rgba } from '../../art/color';
import { circle, glow, inside, linear, roundRect, seeded, type Ctx } from '../../art/draw';
import { PAD } from './sky';
import type { Weather } from './weather';

const X0 = -PAD,
  X1 = W + PAD,
  WIDE = W + PAD * 2;

const mountainY = (x: number) =>
  318 -
  48 * Math.abs(Math.sin(x * 0.0057 + 0.7)) -
  20 * Math.abs(Math.sin(x * 0.0131 + 2)) -
  5 * Math.sin(x * 0.031);
const farY = (x: number) => 362 - 26 * Math.sin(x * 0.0052 + 1) - 12 * Math.sin(x * 0.013 + 0.4);
const meadowY = (x: number) => 404 - 22 * Math.sin(x * 0.0068 + 3.2) - 9 * Math.cos(x * 0.021);

// [x, y of the trunk's foot, size, kind]
const TREES = [
  [58, 453, 1.05, 0],
  [196, 448, 0.78, 1],
  [300, 447, 0.6, 0],
  [478, 446, 0.7, 2],
  [948, 455, 1.12, 2],
] as const;
const TREE_KINDS = [
  { leaves: ['#4a9e4f', '#6cbd5b', '#9bdc78'], dots: '#ff6b5e', trunk: ['#b58052', '#7d5233'] }, // apple
  { leaves: ['#ee93bb', '#ffb7d5', '#ffdbea'], dots: '#ffffff', trunk: ['#a5714d', '#6f4a34'] }, // blossom
  { leaves: ['#3d9160', '#59ae74', '#8dd197'], dots: null, trunk: ['#a97a55', '#74503a'] }, // tall
] as const;

type Lump = readonly [number, number, number];

// The outline of a hill: everything under y(x), down to `bottom`.
function ridge(c: Ctx, y: (x: number) => number, bottom: number) {
  c.beginPath();
  c.moveTo(X0, bottom);
  for (let x = X0; x <= X1; x += 8) c.lineTo(x, y(x));
  c.lineTo(X1, y(X1));
  c.lineTo(X1, bottom);
  c.closePath();
}

// Bushy leaves: the same lumps painted three times, each pass smaller, lighter and nudged toward the light.
function foliage(c: Ctx, lumps: readonly Lump[], [dark, mid, light]: readonly string[], rand: () => number) {
  const pass = (dx: number, dy: number, k: number, color: string) => {
    c.fillStyle = color;
    for (const [x, y, r] of lumps) {
      circle(c, x + dx, y + dy, r * k);
      c.fill();
    }
  };
  pass(0, 0, 1, dark);
  pass(-2.5, -3.5, 0.86, mid);
  pass(-6, -8, 0.56, light);
  c.lineWidth = 1.4;
  for (const [x, y, r] of lumps)
    for (let i = 0; i < r * 0.55; i++) {
      const a = rand() * TAU,
        d = Math.sqrt(rand()) * r * 0.82,
        px = x + Math.cos(a) * d,
        py = y + Math.sin(a) * d;
      c.strokeStyle = rgba(px - x + (py - y) < 0 ? light : dark, 0.55);
      c.beginPath();
      c.arc(px, py, 2.6 + rand() * 2.4, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
}

// A tree with its foot at (0, 0).
function drawTree(c: Ctx, kind: number, rand: () => number) {
  const k = TREE_KINDS[kind],
    tall = kind === 2,
    th = tall ? 50 : 58;
  // trunk, wider at the foot, with two branches reaching into the leaves
  c.beginPath();
  c.moveTo(-9, 2);
  c.quadraticCurveTo(-5, -th * 0.5, -6, -th);
  c.lineTo(6, -th);
  c.quadraticCurveTo(5, -th * 0.5, 10, 2);
  c.closePath();
  c.fillStyle = linear(c, -8, 0, 9, 0, [k.trunk[0], k.trunk[1]]);
  c.fill();
  c.strokeStyle = k.trunk[1];
  c.lineWidth = 5;
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(d * 2, -th + 8);
    c.quadraticCurveTo(d * 8, -th - 6, d * 17, -th - 18);
    c.stroke();
  }
  c.strokeStyle = rgba(k.trunk[1], 0.55);
  c.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(-3 + i * 3, -8 - i * 13);
    c.quadraticCurveTo(-1 + i * 3, -16 - i * 13, -3 + i * 3, -24 - i * 13);
    c.stroke();
  }

  const lumps: Lump[] = [];
  if (tall) {
    lumps.push([0, -66, 23], [-9, -84, 20], [9, -93, 21], [-2, -112, 20], [1, -131, 14]);
  } else {
    const cy = -94,
      R = kind === 0 ? 31 : 28;
    lumps.push([0, cy, R]);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand() * 0.4;
      lumps.push([Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.62, R * (0.55 + rand() * 0.2)]);
    }
  }
  foliage(c, lumps, k.leaves, rand);
  if (k.dots)
    for (let i = 0; i < 9; i++) {
      const [x, y, r] = lumps[Math.floor(rand() * lumps.length)],
        a = rand() * TAU,
        d = rand() * r * 0.7,
        px = x + Math.cos(a) * d,
        py = y + Math.sin(a) * d;
      circle(c, px, py, kind === 0 ? 3.3 : 2.4);
      c.fillStyle = k.dots;
      c.fill();
      circle(c, px - 1, py - 1, 1);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fill();
    }
  // soft shade where the leaves hang over the trunk
  glow(c, 2, -th + 2, 16, '#1d3b24', 0.3, 6);
}

// A rounded hedge sitting on the ground at (x, y).
function drawHedge(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  rand: () => number,
  flowers: string | null,
) {
  const lumps: Lump[] = [];
  const n = Math.max(3, Math.round(w / 22));
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1),
      r = h * (0.5 + 0.28 * Math.sin(u * Math.PI)) + rand() * 3;
    lumps.push([x + (u - 0.5) * (w - h * 0.8), y - r * 0.82, r]);
  }
  foliage(c, lumps, ['#3d9a4c', '#5cb85b', '#90da78'], rand);
  if (flowers)
    for (let i = 0; i < w / 9; i++) {
      const [lx, ly, r] = lumps[Math.floor(rand() * lumps.length)],
        a = Math.PI + rand() * Math.PI,
        d = rand() * r * 0.8;
      circle(c, lx + Math.cos(a) * d, ly + Math.sin(a) * d, 2.1);
      c.fillStyle = flowers;
      c.fill();
    }
}

function drawFence(c: Ctx, rand: () => number) {
  const gate = [736, 850]; // the garden path runs through here
  const post = '#f1e8cc',
    shade = '#cfc29b';
  const gap = (x: number) => x > gate[0] - 6 && x < gate[1] - 4;
  for (const y of [441, 455]) {
    c.fillStyle = shade;
    c.fillRect(X0, y + 3, gate[0] - X0, 2.5);
    c.fillRect(gate[1], y + 3, X1 - gate[1], 2.5);
    c.fillStyle = post;
    c.fillRect(X0, y, gate[0] - X0, 3.5);
    c.fillRect(gate[1], y, X1 - gate[1], 3.5);
  }
  for (let x = X0 + 4; x < X1; x += 17) {
    if (gap(x)) continue;
    const top = 431 + rand() * 4,
      w = 9;
    c.beginPath();
    c.moveTo(x, GROUND + 2);
    c.lineTo(x, top + 6);
    c.lineTo(x + w / 2, top);
    c.lineTo(x + w, top + 6);
    c.lineTo(x + w, GROUND + 2);
    c.closePath();
    c.fillStyle = linear(c, x, 0, x + w, 0, [post, shade]);
    c.fill();
  }
  for (const x of gate) {
    roundRect(c, x - 6, 421, 12, 50, 3);
    c.fillStyle = linear(c, x - 6, 0, x + 6, 0, ['#f8f0d6', '#cdbf97']);
    c.fill();
    circle(c, x, 418, 6.5);
    c.fillStyle = '#f3ead0';
    c.fill();
    circle(c, x - 2, 416, 2.2);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fill();
  }
}

export function bakeLand(scene: Scene) {
  const top = 236; // nothing in these layers reaches higher than this
  bake(
    scene,
    'bg-mountains',
    WIDE,
    GROUND - top,
    PAD,
    -top,
    (c) => {
      ridge(c, mountainY, GROUND);
      c.fillStyle = linear(c, 0, 245, 0, 400, ['#a5c5ea', '#cfe4f3', '#e6f3f4']);
      c.fill();
      // sunlit left faces of the peaks
      inside(
        c,
        () => ridge(c, mountainY, GROUND),
        () => {
          c.strokeStyle = 'rgba(255,255,255,0.5)';
          c.lineWidth = 5;
          c.beginPath();
          for (let x = X0; x <= X1; x += 8) c.lineTo(x, mountainY(x) + 1);
          c.stroke();
          for (let x = X0; x <= X1; x += 60) glow(c, x + 20, mountainY(x + 20) + 46, 70, '#ffffff', 0.22, 26);
        },
      );
    },
    SOFT,
  );

  bake(
    scene,
    'bg-far',
    WIDE,
    GROUND - top,
    PAD,
    -top,
    (c) => {
      const rand = seeded(21);
      // a far-off treeline along the ridge
      for (let x = X0; x < X1; x += 9 + rand() * 9) {
        const r = 5 + rand() * 6;
        circle(c, x, farY(x) - r * 0.25 + rand() * 3, r);
        c.fillStyle = mix('#86c2a4', '#74b596', rand());
        c.fill();
      }
      ridge(c, farY, GROUND);
      c.fillStyle = linear(c, 0, 326, 0, 440, ['#9bd0b1', '#b7dfc0', '#d2ecd0']);
      c.fill();
      inside(
        c,
        () => ridge(c, farY, GROUND),
        () => {
          for (let i = 0; i < 70; i++) {
            const x = X0 + rand() * WIDE,
              y = farY(x) + 6 + rand() * 46,
              r = 3 + rand() * 4;
            circle(c, x, y, r);
            c.fillStyle = rgba('#7fbe9d', 0.55);
            c.fill();
            circle(c, x - r * 0.3, y - r * 0.35, r * 0.55);
            c.fillStyle = rgba('#b9e6c4', 0.6);
            c.fill();
          }
        },
      );
      // a little cottage, far away
      const hx = 318,
        hy = farY(hx) + 3;
      c.fillStyle = '#fff4de';
      c.fillRect(hx - 10, hy - 12, 20, 12);
      c.fillStyle = 'rgba(190,170,140,0.5)';
      c.fillRect(hx + 3, hy - 12, 7, 12);
      c.beginPath();
      c.moveTo(hx - 13, hy - 11);
      c.lineTo(hx, hy - 23);
      c.lineTo(hx + 13, hy - 11);
      c.closePath();
      c.fillStyle = '#e8806a';
      c.fill();
      c.fillStyle = '#c96a58';
      c.fillRect(hx + 4, hy - 23, 4, 7);
      c.fillStyle = '#8a6a55';
      c.fillRect(hx - 2, hy - 7, 4, 7);
      for (let i = 0; i < 3; i++)
        glow(c, hx + 8 + i * 5, hy - 30 - i * 9, 6 + i * 2, '#ffffff', 0.5 - i * 0.12);
    },
    SOFT,
  );

  bake(scene, 'bg-meadow', WIDE, GROUND - 366, PAD, -366, (c) => {
    const rand = seeded(5);
    ridge(c, meadowY, GROUND);
    c.fillStyle = linear(c, 0, 374, 0, GROUND, ['#b6ea8e', '#98da75', '#84cd67']);
    c.fill();
    inside(
      c,
      () => ridge(c, meadowY, GROUND),
      () => {
        // sunlight catching the top of the hill
        c.strokeStyle = 'rgba(226,250,176,0.85)';
        c.lineWidth = 6;
        c.beginPath();
        for (let x = X0; x <= X1; x += 8) c.lineTo(x, meadowY(x));
        c.stroke();
        // patches of lighter and darker grass
        for (let i = 0; i < 16; i++) {
          const x = X0 + rand() * WIDE;
          glow(
            c,
            x,
            meadowY(x) + 14 + rand() * 46,
            60 + rand() * 80,
            i % 2 ? '#dff8ac' : '#5fb65a',
            i % 2 ? 0.3 : 0.22,
            12 + rand() * 14,
          );
        }
        // the garden path, winding down from the hilltop to the gate
        const left: [number, number][] = [],
          right: [number, number][] = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24,
            x = 792 - 205 * u + 30 * Math.sin(u * Math.PI * 1.5),
            y = GROUND + 2 - 94 * Math.pow(u, 0.9),
            w = 4 + 30 * Math.pow(1 - u, 1.7);
          left.push([x - w, y]);
          right.push([x + w, y]);
        }
        c.beginPath();
        left.forEach(([x, y]) => c.lineTo(x, y));
        right.reverse().forEach(([x, y]) => c.lineTo(x, y));
        c.closePath();
        c.fillStyle = linear(c, 0, 376, 0, GROUND, ['#f6ecc4', '#ecd9a4']);
        c.fill();
        c.strokeStyle = 'rgba(190,160,100,0.45)';
        c.lineWidth = 1.5;
        c.stroke();
        // flowers in drifts: tiny and pale near the hilltop (far away), bigger lower down
        const colors = ['#ff9ec2', '#ffe680', '#ffffff', '#c7a9ff', '#ffb38a'];
        for (let i = 0; i < 1500; i++) {
          const x = X0 + rand() * WIDE,
            d = Math.pow(rand(), 1.4) * 62,
            y = meadowY(x) + 5 + d,
            drift = Math.sin(x * 0.013 + 1.3) + Math.sin(x * 0.031 + y * 0.06);
          if (drift < 0.25) continue;
          circle(c, x, y, 0.8 + (d / 62) * 1.1);
          c.fillStyle = rgba(
            colors[Math.abs(Math.floor((x * 0.013 + 1.3) / Math.PI)) % colors.length],
            0.75 + rand() * 0.25,
          );
          c.fill();
        }
        // tufts of darker grass
        c.strokeStyle = 'rgba(78,160,84,0.5)';
        c.lineWidth = 1.2;
        for (let i = 0; i < 260; i++) {
          const x = X0 + rand() * WIDE,
            y = meadowY(x) + 8 + rand() * 60;
          c.beginPath();
          c.moveTo(x - 2, y);
          c.lineTo(x - 3, y - 4);
          c.moveTo(x, y);
          c.lineTo(x, y - 5);
          c.moveTo(x + 2, y);
          c.lineTo(x + 3.5, y - 4);
          c.stroke();
        }
      },
    );
  });

  TREE_KINDS.forEach((_, kind) =>
    bake(scene, `tree-${kind}`, 136, 172, 68, 166, (c) => drawTree(c, kind, seeded(40 + kind))),
  );

  bake(scene, 'bg-garden', WIDE, GROUND + 4 - 404, PAD, -404, (c) => {
    const rand = seeded(8);
    drawFence(c, rand);
    drawHedge(c, 4, GROUND, 96, 32, rand, '#ffffff');
    drawHedge(c, 150, GROUND, 64, 24, rand, null);
    drawHedge(c, 396, GROUND, 104, 34, rand, '#ffd0e4');
    drawHedge(c, 588, GROUND, 70, 26, rand, null);
    drawHedge(c, 908, GROUND, 110, 38, rand, '#fff3a8');
    // a breath of haze so the fence sits behind the fight
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(200,236,196,0.36)';
    c.fillRect(X0, 400, WIDE, 80);
    c.globalCompositeOperation = 'source-over';
  });

  // soft dark patch under a tree
  bake(scene, 'tree-shadow', 110, 22, 55, 11, (c) => glow(c, 0, 0, 52, '#23502e', 0.35, 9), SOFT);
}

export class Land {
  private mountains: GameObjects.Image;
  private far: GameObjects.Image;
  private meadow: GameObjects.Image;
  private garden: GameObjects.Image;
  private trees: GameObjects.Image[];
  private shadows: GameObjects.Image[];

  constructor(scene: Scene, layer: GameObjects.Container) {
    this.mountains = part(scene, 'bg-mountains');
    this.far = part(scene, 'bg-far');
    this.meadow = part(scene, 'bg-meadow');
    this.garden = part(scene, 'bg-garden');
    this.shadows = TREES.map(([x, y, s]) => part(scene, 'tree-shadow', x, y).setScale(s));
    this.trees = TREES.map(([x, y, s, kind]) => part(scene, `tree-${kind}`, x, y).setScale(INV * s));
    layer.add([this.mountains, this.far, this.meadow, ...this.shadows, ...this.trees, this.garden]);
  }

  sync(t: number, weather: Weather, pan: number) {
    const { look } = weather;
    this.mountains.setX(pan * 12).setTint(look.hillTint);
    this.far.setX(pan * 10).setTint(look.hillTint);
    this.meadow.setX(pan * 7).setTint(look.landTint);
    this.garden.setX(pan * 3).setTint(look.landTint);
    const gust = 1 + look.wind * 2.5;
    TREES.forEach(([x, , s], i) => {
      // trees lean with the wind (it blows from Sunny's side) and rock a little
      const sway = Math.sin(t * (1.1 + look.wind) + x * 0.05) * 0.022 * gust - look.wind * 0.05;
      this.trees[i]
        .setX(x + pan * 5)
        .setRotation(sway * (0.6 + s * 0.4))
        .setTint(look.landTint);
      this.shadows[i].setX(x + pan * 5);
    });
  }
}
