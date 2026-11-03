// The warning every attack shows before it can hurt.
import type { GameObjects } from 'phaser';
import { INV } from '../art/bake';
import { easeOutBack } from '../motion';

// The "!" badge pops in, then bounces. Every badge is drawn on the marks layer, in front of Pip, so a
// warning can never hide behind the hero. A stage's small enemies use it too (EnemyViews.ts).
export function showMark(mark: GameObjects.Image, x: number, y: number, t: number) {
  mark
    .setVisible(true)
    .setPosition(x, y - Math.abs(Math.sin(t * 8.5)) * 7)
    .setScale(INV * 1.3 * easeOutBack(Math.min(1, t / 0.18)));
}
