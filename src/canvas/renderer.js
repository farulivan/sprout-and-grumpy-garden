// Temporary Canvas 2D renderer: draws a Fight and plays its effects. Phaser scenes replace it in M2.
import { W, H } from '../config';
import { lerp } from '../sim/math';
import { drawBackground, drawGround, drawPlatforms } from './world';
import { drawPlayer, drawBoss, drawProjectile, drawHazard, drawDewdrop } from './entities';
import { Particles } from './particles';
import { drawHUD } from './hud';

export function createCanvasRenderer(canvas, audio) {
  const ctx = canvas.getContext('2d');
  const particles = new Particles();
  const view = { clock: 0, toast: '', toastT: 0 };
  const blink = { player: 3, boss: 3 };
  let scale = 1,
    shake = 0;

  // The simulation's events arrive here as sound, particles, shake and text (see src/presentation.ts).
  const presenter = {
    sfx: (name) => audio.play(name),
    music: (on) => (on ? audio.startMusic() : audio.stopMusic()),
    burst: (x, y, b) => particles.burst(x, y, b),
    shake: (px) => {
      shake = px;
    },
    toast: (text, seconds = 2.4) => {
      view.toast = text;
      view.toastT = seconds;
    },
  };

  return {
    presenter,
    // A new fight starts clean.
    reset() {
      particles.list.length = 0;
      shake = 0;
      view.toastT = 0;
    },
    // The canvas always shows the logical 960x540 world, scaled to the stage and the device pixel ratio.
    resize(cssScale) {
      scale = cssScale * (window.devicePixelRatio || 1);
      canvas.width = Math.round(W * scale);
      canvas.height = Math.round(H * scale);
      canvas.style.width = Math.round(W * cssScale) + 'px';
      canvas.style.height = Math.round(H * cssScale) + 'px';
    },
    // Advance everything that is only looks: particles, shake, toast and blinking.
    update(dt, fight, paused) {
      view.clock += dt;
      if (paused) return;
      const still = fight.state === 'title' || fight.state === 'win' || fight.state === 'lose';
      particles.update(still ? dt : dt * fight.timeScale);
      if (!still) {
        shake = Math.max(0, shake - dt * 40);
        view.toastT -= dt;
      }
      blink.player -= dt;
      if (blink.player < -0.12) blink.player = 2 + Math.random() * 3;
      blink.boss -= dt;
      if (blink.boss < -0.12) blink.boss = 2.5 + Math.random() * 3;
    },
    // alpha = how far we are between the previous simulation step (0) and the current one (1).
    render(fight, alpha) {
      const moving = [fight.player, fight.boss, ...fight.projectiles, ...fight.hazards, ...fight.pickups];
      const real = moving.map((e) => [e.x, e.y]);
      for (const e of moving) {
        e.x = lerp(e.px, e.x, alpha);
        e.y = lerp(e.py, e.y, alpha);
      }

      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
      drawBackground(ctx, view.clock);
      drawGround(ctx);
      drawBoss(ctx, fight.boss, blink.boss < 0);
      drawPlatforms(ctx, view.clock);
      for (const h of fight.hazards) drawHazard(ctx, h);
      for (const d of fight.pickups) drawDewdrop(ctx, d);
      drawPlayer(ctx, fight.player, blink.player < 0);
      for (const p of fight.projectiles) drawProjectile(ctx, p);
      particles.draw(ctx);
      ctx.restore();
      if (fight.state !== 'title') drawHUD(ctx, fight, view);

      moving.forEach((e, i) => {
        [e.x, e.y] = real[i];
      });
    },
  };
}
