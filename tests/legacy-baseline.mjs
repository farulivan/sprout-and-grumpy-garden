// Records how the original game (legacy/) behaves, so the TypeScript port can be tested against it.
// Run: node tests/legacy-baseline.mjs   → writes tests/fixtures/legacy-baseline.json
// The fixture is committed; this script only needs re-running if the scenarios below change.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Player } from '../legacy/js/player.js';
import { Boss } from '../legacy/js/boss.js';
import { Particles } from '../legacy/js/entities.js';
import { platforms } from '../legacy/js/world.js';
import { input } from '../legacy/js/input.js';
import { GROUND, circleHit, rectCircleHit, prune } from '../legacy/js/utils.js';

const DT = 1 / 60;
const KEYS = ['left', 'right', 'up', 'jump', 'shoot'];
const round = (v) => Math.round(v * 1e6) / 1e6;

// The legacy code draws every random number from Math.random, so seeding it makes a run repeatable.
function seed(n) {
  let s = n >>> 0;
  Math.random = () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function applyInput(keys) {
  if (keys.jump && !input.jump) input.just.add('jump');
  for (const k of KEYS) input[k] = !!keys[k];
}

// The same object legacy/js/main.js builds, minus everything that needs a browser.
function makeGame() {
  const game = {
    state: 'play',
    t: 0,
    endT: 0,
    timeScale: 1,
    shake: 0,
    fightTime: 0,
    faceHits: 0,
    player: null,
    boss: null,
    projectiles: [],
    hazards: [],
    pickups: [],
    particles: new Particles(),
    platforms,
    showToast() {},
    onFightStart() {},
    onBossDefeated() {
      this.state = 'ending';
      this.endT = 0;
      this.timeScale = 0.25;
      for (const p of this.projectiles) if (p.owner !== 'player') p.dead = true;
      for (const h of this.hazards) h.dead = true;
    },
    onPlayerDown() {
      this.state = 'down';
      this.endT = 0;
      this.boss.state = 'paused';
      this.boss.co = null;
      for (const p of this.projectiles) p.dead = true;
      for (const h of this.hazards) h.dead = true;
    },
  };
  game.player = new Player(game);
  game.boss = new Boss(game);
  game.boss.state = 'intro';
  return game;
}

// update() + collide() from legacy/js/main.js for the 'play' state.
function step(g) {
  const sdt = DT * g.timeScale;
  g.t += sdt;
  if (g.state === 'play') g.fightTime += sdt;
  g.player.update(sdt);
  g.boss.update(sdt);
  for (const p of g.projectiles) {
    p.update(sdt);
    if (p.hitGround) g.particles.burst(p.x, GROUND, { n: 5 });
  }
  for (const h of g.hazards) h.update(sdt);
  for (const d of g.pickups) d.update(sdt);
  g.particles.update(sdt);
  if (g.state === 'play') collide(g);
  prune(g.projectiles);
  prune(g.hazards);
  prune(g.pickups);
  input.endFrame();
}

function collide(g) {
  const p = g.player,
    b = g.boss,
    hb = p.hitbox;
  for (const pr of g.projectiles) {
    if (pr.dead) continue;
    if (pr.owner === 'player') {
      if (!b.alive) continue;
      if (circleHit(pr, b)) {
        pr.dead = true;
        if (b.hit(2)) g.faceHits++;
      } else if (rectCircleHit(b.stemBox, pr)) {
        pr.dead = true;
        b.hit(1);
      }
    } else if (p.alive && circleHit(pr, hb)) {
      pr.dead = true;
      p.hurt();
    }
  }
  for (const h of g.hazards) if (!h.dead && p.alive && h.hits(hb)) p.hurt();
  for (const d of g.pickups)
    if (!d.dead && circleHit(d, hb)) {
      d.dead = true;
      if (p.hp < p.maxHp) p.hp++;
    }
  if (!p.alive) g.onPlayerDown();
}

// ---- 1. Pip's movement: inputs are recorded per frame, so the port replays exactly the same ones. ----
function pipTrace() {
  seed(1);
  const g = makeGame(),
    p = g.player;
  const inputs = [],
    states = [],
    shots = [],
    hurtFrames = [];
  let f = 0;
  const tick = (keys = {}) => {
    applyInput(keys);
    p.update(DT);
    for (const pr of g.projectiles) shots.push([f, round(pr.x), round(pr.y), round(pr.vx), round(pr.vy)]);
    g.projectiles.length = 0; // a shot is only recorded where it spawns
    input.endFrame();
    inputs.push(KEYS.reduce((m, k, i) => m | (keys[k] ? 1 << i : 0), 0));
    states.push([round(p.x), round(p.y), round(p.vx), round(p.vy), p.onGround ? 1 : 0]);
    f++;
  };
  const hold = (n, keys) => {
    for (let i = 0; i < n; i++) tick(keys);
  };
  const until = (cond, keys, max = 240) => {
    for (let i = 0; i < max && !cond(); i++) tick(keys);
  };

  hold(20); // stand still
  until(() => p.x >= 310, { right: true }); // run right
  hold(25); // slide to a stop
  hold(2, { jump: true });
  hold(45); // short hop
  hold(45, { jump: true });
  hold(10); // full jump, lands on the low leaf
  until(() => p.x >= 440, { right: true }); // walk along the leaf
  until(() => p.onGround && p.y === 292, { right: true, jump: true }); // jump across to the high leaf
  hold(10);
  hold(30, { shoot: true }); // shoot straight
  hold(30, { shoot: true, up: true }); // shoot diagonally up
  until(() => !p.onGround, { left: true }); // walk off the left edge
  hold(3, { left: true });
  hold(20, { left: true, jump: true }); // coyote jump
  until(() => p.onGround && p.y === GROUND, { left: true });
  hold(20, { left: true });
  hurtFrames.push(f);
  p.hurt(); // knocked back mid-run
  hold(60, { left: true });
  until(() => p.x <= 24, { left: true });
  hold(10, { left: true }); // left wall
  until(() => p.x >= 720, { right: true, shoot: true });
  hold(10, { right: true }); // arena limit
  hold(20);
  return { dt: DT, keys: KEYS, inputs, hurtFrames, states, shots };
}

// ---- 2. Damage dealt: an invulnerable Pip parks where diagonal shots hit Sunny's face. ----
function turret(n) {
  seed(n);
  const g = makeGame();
  for (let f = 0; f < 60 * 180 && g.state === 'play'; f++) {
    g.player.inv = 999;
    applyInput(g.player.x < 560 ? { right: true } : { shoot: true, up: true });
    step(g);
  }
  return {
    won: g.state === 'ending',
    fightTime: round(g.fightTime),
    faceHits: g.faceHits,
    x: round(g.player.x),
  };
}

// ---- 3. Damage taken: Pip stands still until he is out of hearts. ----
function idle(n, phase) {
  seed(n);
  const g = makeGame();
  g.boss.phase = phase; // nothing hits the boss here, so the phase stays as set
  for (let f = 0; f < 60 * 300 && g.state === 'play'; f++) {
    applyInput({});
    step(g);
  }
  return round(g.fightTime);
}

// ---- 4. Attack patterns: what each attack spawns and when, with Pip parked and invulnerable. ----
const HAZARD = { VineSweep: 'vine', RootSpike: 'root', PollenDrop: 'pollen' };
function attackLog(name, phase) {
  seed(7);
  const g = makeGame(),
    b = g.boss,
    seen = new Set(),
    log = [];
  b.state = 'fight';
  b.phase = phase;
  b.idle = 999;
  g.player.x = 300;
  b.co = b[name]();
  b.coWait = 0;
  for (let f = 0; f < 60 * 10 && b.co; f++) {
    g.player.inv = 999;
    applyInput({});
    step(g);
    for (const e of [...g.projectiles, ...g.hazards]) {
      if (seen.has(e)) continue;
      seen.add(e);
      const type = HAZARD[e.constructor.name] ?? e.kind;
      log.push([
        f,
        type,
        round(e.x),
        round(e.y),
        round(e.vx ?? 0),
        round(e.vy ?? 0),
        round(e.speed ?? e.warn ?? 0),
      ]);
    }
  }
  return log;
}

const seeds = (n) => Array.from({ length: n }, (_, i) => i + 1);
const mean = (a) => round(a.reduce((s, v) => s + v, 0) / a.length);
const idle1 = seeds(50).map((n) => idle(n, 1)),
  idle3 = seeds(50).map((n) => idle(n, 3));
const attacks = {};
for (const name of ['seedSpit', 'petalFan', 'vineSweep', 'pollenRain', 'rootPop'])
  for (const phase of [1, 2, 3]) attacks[`${name}@${phase}`] = attackLog(name, phase);

const data = {
  pipTrace: pipTrace(),
  turret: seeds(5).map(turret),
  idlePhase1: { mean: mean(idle1), times: idle1 },
  idlePhase3: { mean: mean(idle3), times: idle3 },
  attacks,
};

mkdirSync(new URL('./fixtures/', import.meta.url), { recursive: true });
const body = Object.entries(data)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  .join(',\n');
writeFileSync(new URL('./fixtures/legacy-baseline.json', import.meta.url), `{\n${body}\n}\n`);

const t = data.pipTrace;
console.log(`pip trace: ${t.states.length} frames, ${t.shots.length} shots, hurt at frame ${t.hurtFrames}`);
console.log(
  'turret:',
  data.turret
    .map((r) => `${r.won ? 'won' : 'NO WIN'} ${r.fightTime}s (${r.faceHits} face hits, x=${r.x})`)
    .join(' | '),
);
console.log(
  `idle phase 1: mean ${data.idlePhase1.mean}s  min ${Math.min(...idle1)}  max ${Math.max(...idle1)}`,
);
console.log(
  `idle phase 3: mean ${data.idlePhase3.mean}s  min ${Math.min(...idle3)}  max ${Math.max(...idle3)}`,
);
for (const [k, v] of Object.entries(attacks))
  console.log(`${k}: ${v.length} spawns, frames ${v.map((e) => e[0]).join(',')}`);
