// A sulky little mushroom sitting where Pip needs to go. It hurts to touch, and two seeds cheer it up: then it
// stays where it is as a happy bounce pad, for good (Stage.seedHits adds the Bouncer). It teaches the Mushroom
// Wood's one new idea, and what Mo's Sprout Caplings are for.
import { Enemy } from './enemy';

export class Capling extends Enemy {
  readonly kind = 'capling';

  constructor(x: number, y: number) {
    super(x, y, 2);
  }

  hurtbox() {
    return { x: this.x, y: this.y - 20, r: 22 };
  }
  override bloomY() {
    return null; // it stays, as a bounce pad
  }

  protected act() {}
}
