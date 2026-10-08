// Sunny the Grumpy Sunflower. Rooted on the right; the head (x, y, r) is the 2x-damage hurtbox,
// stemBox is the 1x-damage hurtbox reachable from the ground.
// Attacks are generator functions: `yield seconds` pauses the attack. Add a new attack by writing
// another *name() generator, calling this.endAttack() at its end, and listing it in POOLS.
import { ARENA_R, GROUND, TAU, clamp, circle, ellipse, roundRect, fillStroke, drawFace, pick, rand, qbez } from './utils.js';
import { Projectile, VineSweep, RootSpike, PollenDrop, Dewdrop } from './entities.js';
import { sfx } from './audio.js';

const POOLS = {
  1: ['seedSpit', 'petalFan'],
  2: ['seedSpit', 'petalFan', 'vineSweep', 'pollenRain'],
  3: ['seedSpit', 'petalFan', 'vineSweep', 'pollenRain', 'rootPop'],
};
const IDLE_TIME = [1.5, 1.1, 0.8];      // pause between attacks per phase
const SPEED_MUL = [1, 1.15, 1.35];      // projectile speed per phase
const PETAL_COLOR = ['#ffd23f', '#ffb52e', '#ff9a3c'];

export class Boss {
  constructor(game) {
    this.game = game; this.baseX = 790; this.baseY = 230; this.x = this.baseX; this.y = this.baseY; this.r = 58;
    this.maxHp = 400; this.hp = this.maxHp; this.phase = 1; this.alive = true;
    this.state = 'sleep'; // sleep (title) -> intro -> fight -> defeated | paused
    this.t = 0; this.introT = 0; this.flash = 0; this.inv = 0; this.telegraph = 0; this.puff = 0; this.lean = 0; this.happy = 0; this.blink = 3;
    this.co = null; this.coWait = 0; this.idle = 1.2; this.lastAttack = ''; this.mood = 'angry';
  }
  get stemBox() { return { x: this.baseX - 18, y: GROUND - 175, w: 36, h: 175 }; }

  hit(dmg) {
    if (this.inv > 0 || !this.alive || this.state !== 'fight') return false;
    this.hp = Math.max(0, this.hp - dmg); this.flash = 0.12; sfx.bossHit();
    if (this.hp <= 0) { this.defeat(); return true; }
    const ph = this.hp > this.maxHp * 0.66 ? 1 : this.hp > this.maxHp * 0.33 ? 2 : 3;
    if (ph !== this.phase) { this.phase = ph; this.startPhase(); }
    return true;
  }
  startPhase() {
    const g = this.game;
    this.co = null; this.inv = 1.4; this.telegraph = 0; this.mood = 'angry'; this.puff = 1; this.idle = 1.3; g.shake = 12; sfx.roar();
    g.pickups.push(new Dewdrop(rand(120, 600), -20));
    g.particles.burst(this.x, this.y, { n: 14, color: PETAL_COLOR[this.phase - 2], speed: 220, size: 7, life: 1.2, gravity: 250, shape: 'leaf' });
    g.showToast(this.phase === 2 ? 'Sunny is getting grumpier!' : 'Sunny is SUPER grumpy!');
  }
  defeat() {
    this.alive = false; this.state = 'defeated'; this.co = null; this.mood = 'happy';
    this.game.particles.burst(this.x, this.y, { n: 30, colors: ['#ffd23f', '#ff8fb1', '#fff'], speed: 300, size: 7, life: 1.5, gravity: 200, shape: 'leaf' });
    this.game.onBossDefeated();
  }

  update(dt) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.inv = Math.max(0, this.inv - dt); this.telegraph = Math.max(0, this.telegraph - dt);
    this.puff += (0 - this.puff) * Math.min(1, dt * 5);
    this.blink -= dt; if (this.blink < -0.12) this.blink = 2.5 + Math.random() * 3;
    const p = this.game.player, target = p && this.state === 'fight' ? (p.x - this.baseX) * 0.04 : 0;
    this.lean += (target - this.lean) * Math.min(1, dt * 2);
    const sway = this.state === 'sleep' ? 0.5 : 1;
    this.x = this.baseX + Math.sin(this.t * 0.7) * 14 * sway + this.lean;
    this.y = this.baseY + Math.sin(this.t * 1.3) * 18 * sway;
    if (this.state === 'intro') {
      const before = this.introT; this.introT += dt;
      if (before < 0.9 && this.introT >= 0.9) { sfx.roar(); this.game.shake = 8; }
      if (this.introT > 1.7) { this.state = 'fight'; this.mood = 'angry'; this.game.onFightStart(); }
      return;
    }
    if (this.state === 'defeated') { this.happy = Math.min(1, this.happy + dt * 0.5); return; }
    if (this.state !== 'fight') return;
    if (this.co) {
      this.coWait -= dt;
      while (this.co && this.coWait <= 0) { const r = this.co.next(); if (r.done) this.co = null; else this.coWait += r.value; }
    } else {
      this.idle -= dt;
      if (this.idle <= 0) { this.co = this.pickAttack(); this.coWait = 0; }
    }
  }
  pickAttack() {
    const pool = POOLS[this.phase]; let name;
    do { name = pick(pool); } while (name === this.lastAttack && pool.length > 1);
    this.lastAttack = name; return this[name]();
  }
  warn(t) { this.telegraph = t; this.mood = 'surprised'; sfx.telegraph(); }
  endAttack() { this.idle = IDLE_TIME[this.phase - 1]; this.mood = 'angry'; }
  get speedMul() { return SPEED_MUL[this.phase - 1]; }

  // Lob a seed that lands at tx after T seconds.
  spit(tx, T) {
    const g = 900, sx = this.x - 30, sy = this.y + 20;
    const vx = (tx - sx) / T, vy = ((GROUND - sy) - 0.5 * g * T * T) / T;
    this.game.projectiles.push(new Projectile({ x: sx, y: sy, vx, vy, gravity: g, r: 11, owner: 'boss', kind: 'bossSeed', life: 4 }));
    this.puff = 0.6; sfx.spit();
  }

  // ---------------- attacks ----------------
  *seedSpit() {
    this.warn(0.7); yield 0.7;
    const n = 2 + this.phase, p = this.game.player;
    for (let i = 0; i < n; i++) {
      this.spit(clamp(p.x + p.vx * 0.3, 40, ARENA_R), 1.1 - this.phase * 0.08);
      yield 0.34 / this.speedMul;
    }
    this.endAttack();
  }
  *petalFan() {
    this.warn(0.6); yield 0.6;
    const volleys = this.phase === 3 ? 2 : 1, count = 4 + this.phase, spread = 0.75;
    for (let v = 0; v < volleys; v++) {
      const p = this.game.player, sx = this.x - 40, sy = this.y, base = Math.atan2(p.y - 24 - sy, p.x - sx), s = 250 * this.speedMul;
      for (let i = 0; i < count; i++) {
        const a = base + (i / (count - 1) - 0.5) * spread + (v ? spread / (count - 1) / 2 : 0);
        this.game.projectiles.push(new Projectile({ x: sx, y: sy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 10, owner: 'boss', kind: 'petal', life: 5 }));
      }
      this.puff = 0.8; sfx.petal();
      yield 0.55;
    }
    this.endAttack();
  }
  *vineSweep() {
    this.warn(0.4); yield 0.4;
    this.game.hazards.push(new VineSweep(340 + this.phase * 40)); // has its own 0.7s rumble warning
    yield 1.4;
    if (this.phase === 3) { this.warn(0.5); yield 0.5; this.spit(clamp(this.game.player.x, 40, ARENA_R), 1.0); }
    yield 1.2;
    this.endAttack();
  }
  *pollenRain() {
    this.warn(0.5); yield 0.5;
    const n = 3 + this.phase, p = this.game.player;
    for (let i = 0; i < n; i++) this.game.hazards.push(new PollenDrop(i === 0 ? clamp(p.x, 60, 700) : rand(60, 700), i * 0.25));
    this.puff = 0.8;
    yield 1.6 + n * 0.25;
    this.endAttack();
  }
  *rootPop() {
    this.warn(0.5); yield 0.5;
    for (let i = 0; i < 3; i++) { const p = this.game.player; this.game.hazards.push(new RootSpike(clamp(p.x + p.vx * 0.35, 40, 700))); yield 0.85; }
    yield 0.8;
    this.endAttack();
  }

  draw(ctx) {
    const { x, y, t } = this;
    const cx = this.baseX + (x - this.baseX) * 0.3, cy = (GROUND + y) / 2 + 30;
    ctx.lineCap = 'round';
    for (const [col, w] of [['#3f8a33', 26], ['#6cc551', 17]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(this.baseX, GROUND + 6); ctx.quadraticCurveTo(cx, cy, x, y + 30); ctx.stroke();
    }
    for (const [u, side] of [[0.35, -1], [0.6, 1]]) { // two big stem leaves
      const px = qbez(this.baseX, cx, x, u), py = qbez(GROUND + 6, cy, y + 30, u);
      ctx.save(); ctx.translate(px, py); ctx.rotate(side * -0.9 + Math.sin(t * 1.6 + u * 5) * 0.12);
      ellipse(ctx, side * 34, 0, 36, 15); fillStroke(ctx, '#7ccf63', '#3f8a33', 3);
      ctx.strokeStyle = '#3f8a33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(side * 6, 0); ctx.lineTo(side * 62, 0); ctx.stroke();
      ctx.restore();
    }
    ellipse(ctx, this.baseX, GROUND + 4, 46, 12); fillStroke(ctx, '#b47a4c', '#7a4e2c', 3);

    ctx.save(); ctx.translate(x, y);
    const sc = 1 + this.puff * 0.08 + (this.flash > 0 ? 0.05 : 0); ctx.scale(sc, sc); ctx.rotate(Math.sin(t * 1.3) * 0.05);
    const petal = this.alive ? PETAL_COLOR[this.phase - 1] : '#ffe066', n = 14;
    for (let i = 0; i < n; i++) {
      const len = 46 * (1 + this.puff * 0.2) + Math.sin(t * 3 + i) * 4 * this.happy;
      ctx.save(); ctx.rotate(i / n * TAU + Math.sin(t * 2 + i) * 0.02);
      ellipse(ctx, this.r + len * 0.55, 0, len * 0.6, 17); fillStroke(ctx, petal, '#d98f1a', 3);
      ctx.restore();
    }
    circle(ctx, 0, 0, this.r); fillStroke(ctx, '#8a5a2b', '#5a381a', 4);
    circle(ctx, 0, 0, this.r - 12); fillStroke(ctx, '#a06a36', null);
    ctx.fillStyle = 'rgba(90,56,26,0.55)';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circle(ctx, Math.cos(a) * (this.r - 7), Math.sin(a) * (this.r - 7), 2.5); ctx.fill(); }
    const sleepy = this.state === 'sleep' || (this.state === 'intro' && this.introT < 0.9);
    const mood = this.flash > 0 ? 'hurt' : sleepy ? 'sleepy' : !this.alive ? 'happy' : this.mood;
    drawFace(ctx, 0, 4, 2.3, mood, this.blink < 0);
    if (this.flash > 0) { ctx.globalAlpha = this.flash / 0.12 * 0.6; ctx.fillStyle = '#fff'; circle(ctx, 0, 0, this.r + 4); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.telegraph > 0) { // "!" bubble = an attack is coming
      const bx = x - 75, by = y - 100 - Math.abs(Math.sin(t * 10)) * 6;
      roundRect(ctx, bx - 22, by - 24, 44, 48, 14); fillStroke(ctx, '#fff', '#ffb52e', 3);
      ctx.fillStyle = '#ff7f50'; ctx.font = 'bold 36px Fredoka, sans-serif'; ctx.fillText('!', bx, by + 2);
    }
    if (sleepy) { ctx.fillStyle = '#6b8fb5'; ctx.font = 'bold 26px Fredoka, sans-serif'; ctx.fillText('z', x + 75, y - 70 - (t % 1) * 20); }
    ctx.textBaseline = 'alphabetic';
  }
}
