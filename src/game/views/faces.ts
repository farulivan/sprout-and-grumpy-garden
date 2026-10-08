// The shared cute face, baked once per size, mood and blink.
import type { Scene } from 'phaser';
import { bake } from '../art/bake';
import { drawFace, type FaceMood } from '../art/draw';

export const faceKey = (who: string, mood: FaceMood, blink = false) =>
  `face-${who}-${mood}${blink ? '-blink' : ''}`;

// s = face scale (1 is about Pip's size).
export function bakeFaces(scene: Scene, who: string, s: number, moods: readonly FaceMood[]) {
  for (const mood of moods)
    for (const blink of [false, true])
      bake(scene, faceKey(who, mood, blink), 46 * s, 31 * s, 23 * s, 16 * s, (ctx) =>
        drawFace(ctx, 0, 0, s, mood, blink),
      );
}
