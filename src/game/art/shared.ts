// Parts that more than one view uses. They are baked first, so every view can count on them.
import type { Scene } from 'phaser';
import { H, W } from '../../config';
import { bake, HAZY } from './bake';
import { radial } from './draw';

export function bakeShared(scene: Scene) {
  // A white square. Stretch and tint it for any flat wash or bar of colour.
  bake(scene, 'white', 4, 4, 0, 0, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 4, 4);
  });
  // Colour creeping in from the corners of the screen, clear in the middle. It is baked white so it can
  // be tinted: dark corners to suit the weather, red when Pip is on the last heart.
  bake(
    scene,
    'vignette',
    W / 2,
    H / 2,
    0,
    0,
    (c) => {
      c.translate(W / 4, H / 4);
      c.scale(1, H / W);
      c.fillStyle = radial(c, 0, 0, W * 0.3, [
        [0, 'rgba(255,255,255,0)'],
        [0.58, 'rgba(255,255,255,0)'],
        [0.82, 'rgba(255,255,255,0.42)'],
        [1, 'rgba(255,255,255,0.9)'],
      ]);
      c.fillRect(-W, -W, W * 2, W * 2);
    },
    HAZY,
  );
}
