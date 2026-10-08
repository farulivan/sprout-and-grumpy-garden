// Game loop, state machine, collisions, HUD and screens.
// States: title -> play -> ending (boss blooms) -> win | play -> down (Pip naps) -> lose
import { W, H, GROUND, TAU, clamp, circleHit, rectCircleHit, roundRect, circle, ellipse, heart, fillStroke, prune, rand } from './utils.js';
import { input, initInput } from './input.js';
import { initAudio, sfx, startMusic, stopMusic, setMuted, isMuted, setAudioPaused } from './audio.js';
import { initTouch } from './touch.js';
import { Player } from './player.js';
import { Boss } from './boss.js';
import { Particles } from './entities.js';
import { platforms, drawBackground, drawGround, drawPlatforms } from './world.js';

const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const stage = document.getElementById('stage'), overlay = document.getElementById('overlay');
const cards = { title: 'title-card', win: 'win-card', lose: 'lose-card', pause: 'pause-card' };
for (const k in cards) cards[k] = document.getElementById(cards[k]);
const store = { // localStorage can throw (private mode, blocked storage): never let it break the game
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};
const CONFETTI = ['#ffd23f', '#ff8fb1', '#8fd8ff', '#b48cff', '#7ccf63'];

export const game = {
  state: 'title', paused: false, t: 0, clock: 0, endT: 0, timeScale: 1, shake: 0, fightTime: 0, faceHits: 0,
  player: null, boss: null, projectiles: [], hazards: [], pickups: [], particles: new Particles(), platforms,
  toast: '', toastT: 0,
  showToast(msg, dur = 2.4) { this.toast = msg; this.toastT = dur; },
  onFightStart() { this.showToast(input.touch ? 'Tap ⬆ to aim at his face for double damage!' : 'Hold ↑ to aim at his face for double damage!', 4); },
  onBossDefeated() {
    this.state = 'ending'; this.endT = 0; this.timeScale = 0.25; this.shake = 14;
    for (const p of this.projectiles) if (p.owner !== 'player') p.dead = true;
    for (const h of this.hazards) h.dead = true;
    stopMusic(); sfx.win(); this.showToast('Sunny is blooming!', 3);
  },
  onPlayerDown() {
    this.state = 'down'; this.endT = 0; this.boss.state = 'paused'; this.boss.co = null; this.boss.telegraph = 0; this.boss.mood = 'angry';
    for (const p of this.projectiles) p.dead = true;
    for (const h of this.hazards) h.dead = true;
    stopMusic(); sfx.lose();
  },
};

function resetFight() {
  game.player = new Player(game); game.boss = new Boss(game); game.boss.state = 'intro';
  game.projectiles = []; game.hazards = []; game.pickups = []; game.particles.list.length = 0;
  game.t = 0; game.fightTime = 0; game.faceHits = 0; game.shake = 0; game.timeScale = 1; game.toastT = 0;
}
function showCard(name) {
  overlay.classList.toggle('hidden', !name);
  for (const k in cards) cards[k].classList.toggle('hidden', k !== name);
}
const easyToggles = [...document.querySelectorAll('.easy-toggle')];
const isEasy = () => easyToggles[0].checked;
for (const el of easyToggles) {
  el.checked = store.get('sprout.easy') === '1';
  el.addEventListener('change', () => { for (const o of easyToggles) o.checked = el.checked; store.set('sprout.easy', el.checked ? '1' : '0'); });
}
function startGame() {
  initAudio(); resetFight(); game.state = 'play';
  if (isEasy()) game.player.hp = game.player.maxHp = 8;
  setPaused(false); showCard(null); startMusic(); input.just.clear();
}
function setPaused(p) {
  if (p && game.state !== 'play') return;
  game.paused = p; setAudioPaused(p);
  if (game.state === 'play') showCard(p ? 'pause' : null);
}
function toggleMute() {
  setMuted(!isMuted()); store.set('sprout.muted', isMuted() ? '1' : '0');
  document.getElementById('btn-mute').textContent = isMuted() ? '🔇' : '🔊';
  if (game.state === 'play' && !game.paused) game.showToast(isMuted() ? 'Sound off' : 'Sound on', 1.2);
}

function update(dt) {
  const g = game;
  if (input.pressed('mute')) toggleMute();
  if (g.paused) { if (input.pressed('pause') || input.pressed('start')) setPaused(false); return; }
  if (g.state === 'play' && input.pressed('pause')) { setPaused(true); return; }
  if (g.state === 'title') {
    g.boss.update(dt); g.particles.update(dt);
    if (input.pressed('start') || input.pressed('jump') || input.pressed('shoot')) startGame();
    return;
  }
  if (g.state === 'win' || g.state === 'lose') {
    g.boss.update(dt); g.particles.update(dt);
    if (input.pressed('start')) startGame();
    return;
  }
  const sdt = dt * g.timeScale; g.t += sdt;
  if (g.state === 'play') g.fightTime += sdt;
  g.player.update(sdt); g.boss.update(sdt);
  for (const p of g.projectiles) {
    p.update(sdt);
    if (p.hitGround) g.particles.burst(p.x, GROUND, { n: 5, color: '#e8d6b3', speed: 70, size: 3, life: 0.3, gravity: 200, dir: -Math.PI / 2, spread: Math.PI });
  }
  for (const h of g.hazards) h.update(sdt);
  for (const d of g.pickups) d.update(sdt);
  g.particles.update(sdt);
  if (g.state === 'play') collide();
  prune(g.projectiles); prune(g.hazards); prune(g.pickups);
  g.shake = Math.max(0, g.shake - dt * 40); g.toastT -= dt;

  if (g.state === 'ending') {
    g.endT += dt; g.timeScale = g.endT < 1.2 ? 0.25 : 1;
    if (g.endT > 1.2 && Math.floor(g.endT * 5) !== Math.floor((g.endT - dt) * 5))
      g.particles.burst(rand(100, W - 100), rand(60, 300), { n: 12, colors: CONFETTI, speed: 200, size: 6, life: 1.6, gravity: 150, shape: 'leaf' });
    if (g.endT > 4.5) {
      g.state = 'win';
      const hp = g.player.hp, hits = g.player.hits, stars = hits <= 1 ? 3 : hits <= 3 ? 2 : 1;
      const best = parseFloat(store.get('sprout.best')), isBest = !(best <= g.fightTime);
      if (isBest) store.set('sprout.best', g.fightTime.toFixed(1));
      document.getElementById('win-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      document.getElementById('win-stats').textContent = `Time: ${g.fightTime.toFixed(1)}s${isBest ? ' (new best!)' : `  ·  Best: ${best.toFixed(1)}s`}  ·  Bonks: ${hits}${isEasy() ? '  ·  Easy mode' : ''}`;
      showCard('win');
    }
  } else if (g.state === 'down') {
    g.endT += dt;
    if (g.endT > 2.2) {
      g.state = 'lose';
      const pct = Math.max(1, Math.round((1 - g.boss.hp / g.boss.maxHp) * 100));
      document.getElementById('lose-progress').textContent = `You cheered Sunny up ${pct}% of the way!`;
      showCard('lose');
    }
  }
}

function collide() {
  const g = game, p = g.player, b = g.boss, hb = p.hitbox;
  for (const pr of g.projectiles) {
    if (pr.dead) continue;
    if (pr.owner === 'player') {
      if (!b.alive) continue;
      if (circleHit(pr, b)) {
        pr.dead = true;
        if (b.hit(2)) { g.faceHits++; sfx.faceHit(); g.particles.burst(pr.x, pr.y, { n: 8, color: '#fff3b0', speed: 160, size: 5, life: 0.4, gravity: 0, shape: 'star' }); }
      } else if (rectCircleHit(b.stemBox, pr)) {
        pr.dead = true;
        if (b.hit(1)) g.particles.burst(pr.x, pr.y, { n: 5, color: '#b6ea7f', speed: 120, size: 4, life: 0.35, gravity: 200, shape: 'leaf' });
      }
    } else if (p.alive && circleHit(pr, hb)) { pr.dead = true; p.hurt(); }
  }
  for (const h of g.hazards) if (!h.dead && p.alive && h.hits(hb)) p.hurt();
  for (const d of g.pickups) if (!d.dead && circleHit(d, hb)) {
    d.dead = true; if (p.hp < p.maxHp) p.hp++; sfx.pickup(); g.showToast('Dewdrop! +1 heart');
    g.particles.burst(d.x, d.y, { n: 10, color: '#8fd8ff', speed: 140, size: 4, life: 0.5, gravity: 200 });
  }
  if (!p.alive) g.onPlayerDown();
}

function drawHUD() {
  const g = game, p = g.player, b = g.boss;
  for (let i = 0; i < p.maxHp; i++) {
    const full = i < p.hp, pulse = full && p.hp <= 2 ? 1 + Math.sin(g.clock * 8) * 0.08 : 1;
    heart(ctx, 34 + i * (p.maxHp > 5 ? 30 : 34), 34, 12 * pulse); fillStroke(ctx, full ? '#ff6f91' : 'rgba(255,255,255,0.5)', full ? '#c9405f' : 'rgba(120,80,80,0.5)', 3);
  }
  const bw = 380, bx = W / 2 - bw / 2 + 30, by = 22, k = b.hp / b.maxHp;
  roundRect(ctx, bx, by, bw, 20, 10); fillStroke(ctx, 'rgba(255,255,255,0.7)', '#4d9a3f', 3);
  if (k > 0) { roundRect(ctx, bx + 3, by + 3, (bw - 6) * k, 14, 7); ctx.fillStyle = k > 0.66 ? '#ffd23f' : k > 0.33 ? '#ffb52e' : '#ff7f50'; ctx.fill(); }
  ctx.save(); ctx.translate(bx - 22, by + 10);
  for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i / 8 * TAU); ellipse(ctx, 13, 0, 7, 4); fillStroke(ctx, '#ffd23f', '#d98f1a', 1.5); ctx.restore(); }
  circle(ctx, 0, 0, 8); fillStroke(ctx, '#8a5a2b', '#5a381a', 2); ctx.restore();
  ctx.fillStyle = '#4b3b2f'; ctx.font = '600 15px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Sunny the Sunflower', bx + 6, by + 37);
  if (g.toastT > 0) {
    ctx.globalAlpha = Math.min(1, g.toastT); ctx.font = '700 22px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4d9a3f'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    // centered over the open sky left of Sunny, so it never covers his "!" warning bubble
    ctx.strokeText(g.toast, 400, 118); ctx.fillText(g.toast, 400, 118); ctx.globalAlpha = 1;
  }
  if (b.state === 'intro') { // "Ready?" while Sunny wakes up, then "GO!"
    const t = b.introT, go = t >= 0.9, k = go ? (t - 0.9) / 0.8 : t / 0.9, word = go ? 'GO!' : 'Ready?';
    const sc = go ? 1 + Math.max(0, 0.35 - k * 0.8) : 0.85 + 0.15 * Math.min(1, k * 2);
    ctx.save(); ctx.translate(W / 2, H / 2 - 50); ctx.scale(sc, sc);
    ctx.globalAlpha = clamp(go ? (1 - k) * 3 : k * 3, 0, 1);
    ctx.font = '700 64px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeStyle = go ? '#e0762e' : '#4d9a3f'; ctx.fillStyle = '#fff';
    ctx.strokeText(word, 0, 0); ctx.fillText(word, 0, 0);
    ctx.restore();
  }
  if (g.state === 'down') {
    ctx.fillStyle = '#6b8fb5'; ctx.font = 'bold 24px Fredoka, sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) ctx.fillText('z', p.x + 30 + i * 16, p.y - 60 - ((g.endT * 0.8 + i * 0.3) % 1) * 30);
  }
}

let scale = 1;
function render() {
  const g = game;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.save();
  if (g.shake > 0) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake));
  drawBackground(ctx, g.clock);
  drawGround(ctx);
  g.boss.draw(ctx);
  drawPlatforms(ctx, g.clock);
  for (const h of g.hazards) h.draw(ctx);
  for (const d of g.pickups) d.draw(ctx);
  g.player.draw(ctx);
  for (const p of g.projectiles) p.draw(ctx);
  g.particles.draw(ctx);
  ctx.restore();
  if (g.state !== 'title') drawHUD();
}

function resize() {
  const dpr = window.devicePixelRatio || 1, s = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.97;
  scale = s * dpr; canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
  canvas.style.width = stage.style.width = Math.round(W * s) + 'px';
  canvas.style.height = stage.style.height = Math.round(H * s) + 'px';
  stage.style.setProperty('--ui', clamp(s, 0.45, 1.6).toFixed(3)); // cards + touch buttons scale with the game
}
window.addEventListener('resize', resize); resize();
initInput(initAudio);
for (const id of ['btn-start', 'btn-again', 'btn-retry']) document.getElementById(id).addEventListener('click', startGame);
document.getElementById('btn-resume').addEventListener('click', () => setPaused(false));
document.getElementById('btn-pause').addEventListener('click', (e) => { e.currentTarget.blur(); setPaused(true); });
document.getElementById('btn-mute').addEventListener('click', (e) => { e.currentTarget.blur(); initAudio(); toggleMute(); });
window.addEventListener('blur', () => setPaused(true)); // auto-pause when the tab/window loses focus
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
if (store.get('sprout.muted') === '1') { setMuted(true); document.getElementById('btn-mute').textContent = '🔇'; }
initTouch(initAudio);
game.player = new Player(game); game.boss = new Boss(game); // sleepy garden scene behind the title card
showCard('title');

// Test hook: open index.html?debug to get window.sprout. step() advances the simulation without
// requestAnimationFrame, so it works in hidden/background tabs and automated tests.
if (new URLSearchParams(location.search).has('debug')) {
  window.sprout = {
    game, input, startGame, setPaused,
    step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { game.clock += dt; update(dt); input.endFrame(); } render(); },
  };
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  game.clock += dt;
  update(dt); render(); input.endFrame();
  const st = game.paused ? 'paused' : game.state; // CSS uses this to show/hide the touch + HUD buttons
  if (stage.dataset.state !== st) stage.dataset.state = st;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
