// Temporary Canvas 2D HUD, moved from the original game. Replaced by src/game/scenes/HudScene.ts in M2.
import { W, H, TAU } from '../config';
import { roundRect, circle, ellipse, heart, fillStroke } from '../game/art/draw';
import { clamp } from '../sim/math';

export function drawHUD(ctx, fight, view) {
  const p = fight.player,
    b = fight.boss;
  for (let i = 0; i < p.maxHp; i++) {
    const full = i < p.hp,
      pulse = full && p.hp <= 2 ? 1 + Math.sin(view.clock * 8) * 0.08 : 1;
    heart(ctx, 34 + i * (p.maxHp > 5 ? 30 : 34), 34, 12 * pulse);
    fillStroke(ctx, full ? '#ff6f91' : 'rgba(255,255,255,0.5)', full ? '#c9405f' : 'rgba(120,80,80,0.5)', 3);
  }
  const bw = 380,
    bx = W / 2 - bw / 2 + 30,
    by = 22,
    k = b.hp / b.maxHp;
  roundRect(ctx, bx, by, bw, 20, 10);
  fillStroke(ctx, 'rgba(255,255,255,0.7)', '#4d9a3f', 3);
  if (k > 0) {
    roundRect(ctx, bx + 3, by + 3, (bw - 6) * k, 14, 7);
    ctx.fillStyle = k > 0.66 ? '#ffd23f' : k > 0.33 ? '#ffb52e' : '#ff7f50';
    ctx.fill();
  }
  ctx.save();
  ctx.translate(bx - 22, by + 10);
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i / 8) * TAU);
    ellipse(ctx, 13, 0, 7, 4);
    fillStroke(ctx, '#ffd23f', '#d98f1a', 1.5);
    ctx.restore();
  }
  circle(ctx, 0, 0, 8);
  fillStroke(ctx, '#8a5a2b', '#5a381a', 2);
  ctx.restore();
  ctx.fillStyle = '#4b3b2f';
  ctx.font = '600 15px Fredoka, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(b.name, bx + 6, by + 37);
  if (view.toastT > 0) {
    ctx.globalAlpha = Math.min(1, view.toastT);
    ctx.font = '700 22px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#4d9a3f';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    // centered over the open sky left of Sunny, so it never covers his "!" warning bubble
    ctx.strokeText(view.toast, 400, 118);
    ctx.fillText(view.toast, 400, 118);
    ctx.globalAlpha = 1;
  }
  if (b.state === 'intro') {
    // "Ready?" while Sunny wakes up, then "GO!"
    const t = b.introT,
      go = t >= 0.9,
      k = go ? (t - 0.9) / 0.8 : t / 0.9,
      word = go ? 'GO!' : 'Ready?';
    const sc = go ? 1 + Math.max(0, 0.35 - k * 0.8) : 0.85 + 0.15 * Math.min(1, k * 2);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 50);
    ctx.scale(sc, sc);
    ctx.globalAlpha = clamp(go ? (1 - k) * 3 : k * 3, 0, 1);
    ctx.font = '700 64px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = go ? '#e0762e' : '#4d9a3f';
    ctx.fillStyle = '#fff';
    ctx.strokeText(word, 0, 0);
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }
  if (fight.state === 'down') {
    ctx.fillStyle = '#6b8fb5';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++)
      ctx.fillText('z', p.x + 30 + i * 16, p.y - 60 - ((fight.endT * 0.8 + i * 0.3) % 1) * 30);
  }
}
