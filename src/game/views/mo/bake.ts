// Everything of Mo's, and everything his attacks draw. On atlas pages of their own, inside the wood's late bake: on the
// wood's page they would push the stage's art off it.
import type { Scene } from 'phaser';
import { bakeApart } from '../../art/bake';
import { bakeMoParts } from './art';
import { bakeMoFaces } from './face';
import { bakeRing } from './ring';
import { bakeSmoke } from './smoke';

export function bakeMo(scene: Scene) {
  bakeApart('mo', () => {
    bakeMoParts(scene);
    bakeMoFaces(scene);
    bakeSmoke(scene);
    bakeRing(scene);
  });
}
