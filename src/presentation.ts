// What each simulation event looks and sounds like. This is the one place that turns "the boss was hit"
// into a sound, a puff of particles, a screen shake or a line of text. Whatever draws the game (the
// Phaser scenes in src/game) supplies a Presenter, and this table knows nothing about how it works.
import { GROUND, W } from './config';
import type { SimEvent } from './sim/events';

export type SfxName =
  | 'shoot'
  | 'jump'
  | 'land'
  | 'hurt'
  | 'bossHit'
  | 'faceHit'
  | 'telegraph'
  | 'spit'
  | 'petal'
  | 'roar'
  | 'pickup'
  | 'win'
  | 'lose';

export type ParticleShape = 'circle' | 'leaf' | 'heart' | 'star';
export interface Burst {
  n?: number;
  color?: string;
  colors?: readonly string[]; // cycled through, one per particle
  speed?: number;
  size?: number;
  life?: number; // seconds
  gravity?: number;
  shape?: ParticleShape;
  spread?: number; // radians around dir; default is a full circle
  dir?: number;
}

export interface Presenter {
  sfx(name: SfxName): void;
  music(on: boolean): void;
  burst(x: number, y: number, burst: Burst): void;
  shake(px: number): void;
  toast(text: string, seconds?: number): void;
}

// Sunny's petals get angrier with each phase.
export const PETAL_COLOR = ['#ffd23f', '#ffb52e', '#ff9a3c'];
const CONFETTI = ['#ffd23f', '#ff8fb1', '#8fd8ff', '#b48cff', '#7ccf63'];
const UP = -Math.PI / 2;
const DUST: Burst = {
  n: 6,
  color: '#e8d6b3',
  speed: 80,
  size: 3,
  life: 0.35,
  gravity: 200,
  dir: UP,
  spread: Math.PI,
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function present(e: SimEvent, p: Presenter, opts: { touch: boolean }) {
  switch (e.type) {
    case 'jump':
      p.sfx('jump');
      p.burst(e.x, e.y, DUST);
      break;
    case 'land':
      p.sfx('land');
      p.burst(e.x, e.y, DUST);
      break;
    case 'shoot':
      p.sfx('shoot');
      break;
    case 'playerHurt':
      p.sfx('hurt');
      p.shake(9);
      p.burst(e.x, e.y, {
        n: 7,
        color: '#ff9bb0',
        speed: 150,
        size: 5,
        life: 0.6,
        gravity: 250,
        shape: 'heart',
      });
      break;
    case 'bossHit':
      p.sfx('bossHit');
      if (e.weak) {
        p.sfx('faceHit');
        p.burst(e.x, e.y, {
          n: 8,
          color: '#fff3b0',
          speed: 160,
          size: 5,
          life: 0.4,
          gravity: 0,
          shape: 'star',
        });
      } else {
        p.burst(e.x, e.y, {
          n: 5,
          color: '#b6ea7f',
          speed: 120,
          size: 4,
          life: 0.35,
          gravity: 200,
          shape: 'leaf',
        });
      }
      break;
    case 'telegraph':
      p.sfx('telegraph');
      break;
    case 'spit':
      p.sfx('spit');
      break;
    case 'petals':
      p.sfx('petal');
      break;
    case 'introRoar':
      p.sfx('roar');
      p.shake(8);
      break;
    case 'fightStart':
      p.toast(
        opts.touch
          ? 'Tap ⬆ to aim at his face for double damage!'
          : 'Hold ↑ to aim at his face for double damage!',
        4,
      );
      break;
    case 'phase':
      p.sfx('roar');
      p.shake(12);
      p.burst(e.x, e.y, {
        n: 14,
        color: PETAL_COLOR[e.phase - 2], // he sheds the petals of the phase he just left
        speed: 220,
        size: 7,
        life: 1.2,
        gravity: 250,
        shape: 'leaf',
      });
      p.toast(e.phase === 2 ? 'Sunny is getting grumpier!' : 'Sunny is SUPER grumpy!');
      break;
    case 'groundPuff':
      p.burst(e.x, GROUND, {
        n: 5,
        color: '#e8d6b3',
        speed: 70,
        size: 3,
        life: 0.3,
        gravity: 200,
        dir: UP,
        spread: Math.PI,
      });
      break;
    case 'pickup':
      p.sfx('pickup');
      p.toast('Dewdrop! +1 heart');
      p.burst(e.x, e.y, { n: 10, color: '#8fd8ff', speed: 140, size: 4, life: 0.5, gravity: 200 });
      break;
    case 'bossDefeated':
      p.shake(14);
      p.music(false);
      p.sfx('win');
      p.toast('Sunny is blooming!', 3);
      p.burst(e.x, e.y, {
        n: 30,
        colors: ['#ffd23f', '#ff8fb1', '#fff'],
        speed: 300,
        size: 7,
        life: 1.5,
        gravity: 200,
        shape: 'leaf',
      });
      break;
    case 'confetti':
      p.burst(rand(100, W - 100), rand(60, 300), {
        n: 12,
        colors: CONFETTI,
        speed: 200,
        size: 6,
        life: 1.6,
        gravity: 150,
        shape: 'leaf',
      });
      break;
    case 'playerDown':
      p.music(false);
      p.sfx('lose');
      break;
    case 'win':
    case 'lose':
      break; // the app shows the result card
    default:
      e satisfies never; // a new event type must be given a case above
  }
}
