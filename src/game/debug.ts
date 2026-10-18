// Hitbox overlay: draws what the simulation actually collides with, over the art.
// Open the game with ?hitboxes, or call sprout.hitboxes(true) from the ?debug console.
import type { GameObjects, Scene } from 'phaser';
import type { Fight } from '../sim/fight';
import type { Circle, Rect } from '../sim/math';
import type { Stage } from '../sim/stage/stage';

const HURTS_PIP = 0xff3355,
  HURTS_BOSS = 0x22bb66,
  WEAK_SPOT = 0xffaa00,
  PIP = 0x3388ff,
  PICKUP = 0x00c8ff;

export class HitboxOverlay {
  private g: GameObjects.Graphics;

  constructor(scene: Scene, depth: number) {
    this.g = scene.add.graphics().setDepth(depth).setVisible(false);
  }
  get visible() {
    return this.g.visible;
  }
  set visible(on: boolean) {
    this.g.setVisible(on);
  }

  private shape(s: Circle | Rect, color: number) {
    const g = this.g;
    g.lineStyle(2, color, 1).fillStyle(color, 0.25);
    if ('r' in s) g.fillCircle(s.x, s.y, s.r).strokeCircle(s.x, s.y, s.r);
    else g.fillRect(s.x, s.y, s.w, s.h).strokeRect(s.x, s.y, s.w, s.h);
  }

  sync(fight: Fight) {
    const g = this.g;
    if (!g.visible) return;
    g.clear();
    const shape = (s: Circle | Rect, color: number) => this.shape(s, color);
    const boxes = fight.boss.hurtboxes();
    for (const r of boxes.body) shape(r, HURTS_BOSS);
    for (const c of boxes.weak) shape(c, WEAK_SPOT);
    for (const p of fight.platforms) shape({ x: p.x, y: p.y, w: p.w, h: 2 }, PIP);
    for (const h of fight.hazards) {
      const s = h.shape();
      if (s) shape(s, HURTS_PIP);
    }
    for (const d of fight.pickups) shape(d, PICKUP);
    for (const p of fight.projectiles) shape(p, p.owner === 'player' ? HURTS_BOSS : HURTS_PIP);
    shape(fight.player.hitbox, PIP);
  }

  // On a stage: the ground and logs Pip stands on, thorns, the enemies (with the mound a Snapper hides in),
  // pickups, projectiles and Pip.
  syncStage(stage: Stage) {
    const g = this.g;
    if (!g.visible) return;
    g.clear();
    for (const s of stage.solids) this.shape({ x: s.x, y: s.y, w: s.w, h: Math.min(s.h, 40) }, PIP);
    for (const p of stage.platforms) this.shape({ x: p.x, y: p.y, w: p.w, h: 2 }, PIP);
    for (const t of stage.thorns) this.shape(t, HURTS_PIP);
    for (const e of stage.enemies) {
      const box = e.hurtbox(),
        shield = e.shield();
      if (box) this.shape(box, HURTS_PIP);
      if (shield) this.shape(shield, 0xffffff);
    }
    for (const d of stage.pickups) this.shape(d, PICKUP);
    for (const p of stage.projectiles) this.shape(p, p.owner === 'player' ? HURTS_BOSS : HURTS_PIP);
    this.shape(stage.player.hitbox, PIP);
  }
}
