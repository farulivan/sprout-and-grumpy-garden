// Mo's attacks, as placeholders until their art is drawn. They are baked with the rest of the wood.
import type { Scene } from 'phaser';
import { bake } from '../../art/bake';
import { circle, glow, line, radial, type Ctx } from '../../art/draw';

function drawBubble(c: Ctx) {
  circle(c, 0, 0, 15);
  c.fillStyle = radial(c, 0, 0, 16, ['#fff6d0', '#d8e88a', '#9ab84a'], -5, -5);
  c.fill();
  line(c, '#3c5a1c', 2.4);
  for (const [x, y] of [
    [-5, 3],
    [5, -3],
    [4, 6],
  ] as const) {
    circle(c, x, y, 2);
    c.fillStyle = '#6a8a2a';
    c.fill();
  }
  glow(c, -5, -6, 5, '#ffffff', 0.9);
}

export function bakeMoAttacks(scene: Scene) {
  bake(scene, 'spore-bubble', 40, 40, 20, 20, drawBubble);
}
