// What each simulation event looks and sounds like. This is the one place that turns "the boss was hit"
// into a sound, a puff of particles, a screen shake or a line of text. Whatever draws the game (the
// Phaser scenes in src/game) supplies a Presenter, and this table knows nothing about how it works.
import { GROUND, UP, W } from './config';
import type { SimEvent } from './sim/events';
import { SEEDS_PER_HEART } from './sim/stage/stage';
import type { TitleCue } from './sim/yard';

export type SfxName =
  | 'shoot'
  | 'jump'
  | 'land'
  | 'hurt'
  | 'bossHit'
  | 'faceHit'
  | 'block'
  | 'telegraph'
  | 'spit'
  | 'petal'
  | 'roar'
  | 'pickup'
  | 'win'
  | 'lose'
  | 'cheer'
  | 'snap'
  | 'fall'
  | 'seed'
  | 'clear'
  // the title and its menu
  | 'start' // "Press any key" pressed
  | 'boing' // the logo stamping down
  | 'menuMove'
  | 'menuPick'
  | 'menuBack';

export type ParticleShape =
  | 'circle'
  | 'soft' // a blurry dot
  | 'leaf'
  | 'petal'
  | 'heart'
  | 'star'
  | 'spark' // a streak, stretched along the way it flies
  | 'puff' // a little cloud that swells and thins: dust, steam
  | 'clod' // a lump of earth
  | 'confetti';
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
  glow?: boolean; // drawn as light rather than paint: sparks, sparkles
  alpha?: number; // starting opacity
  drag?: number; // 0-1: how quickly it loses speed
  radius?: number; // start anywhere within this distance of the point
}
// A circle of light spreading out from a point.
export interface Ring {
  color?: string;
  from?: number; // starting radius
  to?: number;
  life?: number;
}
// How a line of text is dressed: plain advice, a warning, or good news.
export type ToastTone = 'info' | 'alert' | 'good';

export interface Presenter {
  sfx(name: SfxName): void;
  music(on: boolean): void;
  burst(x: number, y: number, burst: Burst): void;
  ring(x: number, y: number, ring: Ring): void;
  shake(px: number): void;
  flash(alpha: number, color?: string): void; // a wash of light over the whole screen
  punch(amount: number): void; // the camera jolts in by this fraction and settles
  hitStop(seconds: number): void; // the fight holds still for a moment so a hit lands
  toast(text: string, seconds?: number, tone?: ToastTone): void;
}

// What each moment of the opening sounds like.
const CUE_SOUNDS: Record<TitleCue, SfxName> = {
  seed: 'land',
  sprout: 'seed',
  door: 'snap',
  logo: 'land',
  stamp: 'boing',
};
// The petals Sunny sheds when he leaves a phase: yellow, then orange, then red.
const PETAL_COLOR = ['#ffc62e', '#ff982c', '#f7622c'];
const CONFETTI = ['#ffd23f', '#ff8fb1', '#8fd8ff', '#b48cff', '#7ccf63', '#ffffff'];
const LEAVES = ['#7cc644', '#9ad85f', '#5aa83a'];
const CHEER = ['#ffd23f', '#ff8fb1', '#fff3b0', '#ffb3c7']; // the petals a cheered-up enemy pops into
// The puff of dust that anything landing, sliding or digging kicks up. Views reuse it for theirs.
export const DUST: Burst = {
  n: 5,
  shape: 'puff',
  color: '#f4ead0',
  speed: 70,
  size: 6,
  life: 0.4,
  gravity: -30,
  dir: UP,
  spread: 2.6,
  alpha: 0.7,
  drag: 0.8,
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// A seed that hit something that can't be hurt right now: a "tink", a glint, and the seed itself knocked
// back up the way it came, so a wasted shot can be seen to be wasted. No leaves fly and nothing flinches:
// that is what a hit looks like.
function bounce(p: Presenter, x: number, y: number) {
  p.sfx('block');
  p.ring(x, y, { color: '#ffffff', from: 6, to: 30, life: 0.2 });
  p.burst(x, y, {
    n: 1,
    color: '#7cc644',
    speed: 240,
    size: 7,
    life: 0.6,
    gravity: 800,
    shape: 'leaf',
    dir: -2.3, // up and back toward Pip
    spread: 0.5,
  });
  p.burst(x, y, {
    n: 4,
    color: '#ffffff',
    speed: 260,
    size: 4.5,
    life: 0.18,
    gravity: 0,
    shape: 'spark',
    glow: true,
    dir: Math.PI,
    spread: 1.6,
  });
}

export function present(e: SimEvent, p: Presenter, opts: { touch: boolean }) {
  switch (e.type) {
    case 'jump':
      p.sfx('jump');
      p.burst(e.x, e.y, DUST);
      break;
    case 'land':
      p.sfx('land');
      // dust kicked out to both sides
      p.burst(e.x - 8, e.y, { ...DUST, n: 3, dir: Math.PI + 0.35, spread: 0.7, speed: 110 });
      p.burst(e.x + 8, e.y, { ...DUST, n: 3, dir: -0.35, spread: 0.7, speed: 110 });
      break;
    case 'shoot':
      p.sfx('shoot');
      break;
    case 'playerHurt':
      p.sfx('hurt');
      p.shake(9);
      p.hitStop(0.07);
      p.flash(0.16, '#ff7f9c');
      p.ring(e.x, e.y, { color: '#ff9bb0', from: 10, to: 70, life: 0.35 });
      p.burst(e.x, e.y, {
        n: 6,
        color: '#ff8fa8',
        speed: 170,
        size: 6,
        life: 0.7,
        gravity: 260,
        shape: 'heart',
      });
      p.burst(e.x, e.y, {
        n: 7,
        color: '#ffffff',
        speed: 240,
        size: 5,
        life: 0.3,
        gravity: 0,
        shape: 'spark',
        glow: true,
      });
      break;
    case 'bossHit':
      p.sfx('bossHit');
      if (e.weak) {
        p.sfx('faceHit');
        p.ring(e.x, e.y, { color: '#fff3b0', from: 5, to: 30, life: 0.2 });
        p.burst(e.x, e.y, {
          n: 4,
          color: '#fff6c4',
          speed: 150,
          size: 7,
          life: 0.38,
          gravity: 0,
          shape: 'star',
          glow: true,
        });
        p.burst(e.x, e.y, {
          n: 5,
          color: '#ffe680',
          speed: 300,
          size: 4.5,
          life: 0.24,
          gravity: 0,
          shape: 'spark',
          glow: true,
        });
      } else {
        p.burst(e.x, e.y, {
          n: 4,
          colors: ['#b6ea7f', '#7ccf63'],
          speed: 130,
          size: 4.5,
          life: 0.45,
          gravity: 240,
          shape: 'leaf',
        });
        p.burst(e.x, e.y, {
          n: 3,
          color: '#eaffc8',
          speed: 200,
          size: 3.5,
          life: 0.2,
          gravity: 0,
          shape: 'spark',
          glow: true,
        });
      }
      break;
    case 'bossBlock':
    case 'enemyBlock':
      bounce(p, e.x, e.y);
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
      p.punch(0.03);
      break;
    case 'fightStart':
      p.toast(
        // a touch screen can't aim, but a straight seed from the high leaf reaches his face
        opts.touch
          ? 'Shoot his face from the high leaf: double damage!'
          : 'Hold ↑ to aim at his face for double damage!',
        4,
      );
      break;
    case 'phase': {
      const shed = PETAL_COLOR[e.phase - 2]; // he sheds the petals of the phase he just left
      p.sfx('roar');
      p.shake(12);
      p.hitStop(0.12);
      p.punch(0.045);
      p.flash(0.28, '#fff1c2');
      p.ring(e.x, e.y, { color: shed, from: 50, to: 300, life: 0.6 });
      p.ring(e.x, e.y, { color: '#ffffff', from: 30, to: 190, life: 0.4 });
      p.burst(e.x, e.y, {
        n: 20,
        color: shed,
        speed: 320,
        size: 8,
        life: 1.3,
        gravity: 260,
        shape: 'petal',
        radius: 50,
      });
      p.burst(e.x, e.y, {
        n: 14,
        color: '#fff3c4',
        speed: 420,
        size: 6,
        life: 0.4,
        gravity: 0,
        shape: 'spark',
        glow: true,
      });
      p.toast(e.phase === 2 ? 'Sunny is getting grumpier!' : 'Sunny is SUPER grumpy!', 2.4, 'alert');
      break;
    }
    case 'groundPuff':
      p.burst(e.x, GROUND, { ...DUST, n: 4, speed: 60 });
      if (e.kind === 'petal')
        // the petal tears into scraps on the grass
        p.burst(e.x, GROUND - 4, {
          n: 4,
          colors: ['#ffd23f', '#ff9a1f', '#fff0a0'],
          speed: 130,
          size: 4.5,
          life: 0.6,
          gravity: 320,
          shape: 'petal',
          dir: UP,
          spread: 2.2,
        });
      else
        // the seed digs in and kicks up earth
        p.burst(e.x, GROUND - 2, {
          n: 4,
          colors: ['#8a5530', '#b47a4c'],
          speed: 150,
          size: 3.5,
          life: 0.5,
          gravity: 520,
          shape: 'clod',
          dir: UP,
          spread: 1.8,
        });
      break;
    case 'pickup':
      p.sfx('pickup');
      p.toast(e.healed ? 'Dewdrop! +1 heart' : 'Dewdrop! Hearts already full', 2.4, 'good');
      p.ring(e.x, e.y, { color: '#bfeaff', from: 8, to: 62, life: 0.4 });
      p.burst(e.x, e.y, { n: 9, color: '#8fd8ff', speed: 150, size: 4, life: 0.5, gravity: 240 });
      p.burst(e.x, e.y, {
        n: 7,
        color: '#eafaff',
        speed: 110,
        size: 7,
        life: 0.6,
        gravity: -40,
        shape: 'star',
        glow: true,
      });
      if (e.healed)
        p.burst(e.x, e.y - 8, {
          n: 2,
          color: '#ff8fa8',
          speed: 60,
          size: 6,
          life: 0.9,
          gravity: -60,
          shape: 'heart',
          dir: UP,
          spread: 1,
        });
      break;
    case 'bossDefeated':
      p.shake(14);
      p.punch(0.06);
      p.flash(0.5, '#fff6d0');
      p.music(false);
      p.sfx('win');
      p.toast('Sunny is blooming!', 3, 'good');
      p.ring(e.x, e.y, { color: '#ffe680', from: 50, to: 420, life: 0.9 });
      p.ring(e.x, e.y, { color: '#ffffff', from: 30, to: 260, life: 0.6 });
      p.burst(e.x, e.y, {
        n: 34,
        colors: ['#ffd23f', '#ff8fb1', '#ffffff', '#ffb52e'],
        speed: 340,
        size: 8,
        life: 1.6,
        gravity: 200,
        shape: 'petal',
        radius: 40,
      });
      p.burst(e.x, e.y, {
        n: 22,
        color: '#fff6b8',
        speed: 260,
        size: 9,
        life: 0.9,
        gravity: 0,
        shape: 'star',
        glow: true,
        drag: 0.7,
      });
      break;
    case 'confetti': {
      const x = rand(100, W - 100),
        y = rand(60, 300);
      p.burst(x, y, {
        n: 14,
        colors: CONFETTI,
        speed: 230,
        size: 6,
        life: 1.8,
        gravity: 170,
        shape: 'confetti',
      });
      p.burst(x, y, {
        n: 5,
        color: '#ffffff',
        speed: 120,
        size: 8,
        life: 0.5,
        gravity: 0,
        shape: 'star',
        glow: true,
      });
      p.ring(x, y, { color: '#ffffff', from: 6, to: 46, life: 0.3 });
      break;
    }
    case 'playerDown':
      p.music(false);
      p.sfx('lose');
      break;
    // ---- on a stage ----
    case 'enemyHit':
      p.sfx('bossHit');
      p.burst(e.x, e.y, {
        n: 4,
        colors: LEAVES,
        speed: 150,
        size: 6,
        life: 0.5,
        gravity: 500,
        shape: 'leaf',
        dir: UP,
        spread: 2.4,
      });
      break;
    case 'enemyCheered':
      // out of its mood: a cheer, a shower of petals and sparkles, and the stage holds still for a beat
      p.sfx('cheer');
      p.hitStop(0.04);
      p.ring(e.x, e.y, { color: '#fff3b0', from: 8, to: 54, life: 0.35 });
      p.burst(e.x, e.y, {
        n: 12,
        colors: CHEER,
        speed: 190,
        size: 7,
        life: 0.8,
        gravity: 260,
        shape: 'petal',
      });
      p.burst(e.x, e.y, {
        n: 5,
        color: '#fffbe0',
        speed: 120,
        size: 6,
        life: 0.5,
        gravity: -30,
        shape: 'star',
        glow: true,
      });
      break;
    case 'enemyWarn':
      p.sfx('telegraph');
      break;
    case 'pea':
      p.sfx('spit');
      break;
    case 'snap':
      p.sfx('snap');
      p.burst(e.x, GROUND - 4, {
        n: 6,
        colors: ['#8a5530', '#b47a4c', '#6a3f22'],
        speed: 220,
        size: 4,
        life: 0.6,
        gravity: 700,
        shape: 'clod',
        dir: UP,
        spread: 1.4,
      });
      break;
    case 'pitFall':
      p.sfx('fall');
      p.burst(e.x, GROUND, { ...DUST, n: 6, speed: 90 });
      break;
    case 'goldenSeed':
      p.sfx('seed');
      if (e.healed === undefined) p.toast(`Golden seed! ${e.found} of ${SEEDS_PER_HEART}`, 2, 'good');
      else p.toast(e.healed ? 'Golden seeds! +1 heart' : 'Golden seeds! Hearts already full', 2.4, 'good');
      // the set that makes a heart: the dewdrop's chime and hearts too
      if (e.healed) {
        p.sfx('pickup');
        p.burst(e.x, e.y - 8, {
          n: 2,
          color: '#ff8fa8',
          speed: 60,
          size: 6,
          life: 0.9,
          gravity: -60,
          shape: 'heart',
          dir: UP,
          spread: 1,
        });
      }
      p.ring(e.x, e.y, { color: '#ffe27a', from: 8, to: 60, life: 0.4 });
      p.burst(e.x, e.y, {
        n: 10,
        color: '#ffe066',
        speed: 140,
        size: 6,
        life: 0.6,
        gravity: -20,
        shape: 'star',
        glow: true,
      });
      break;
    case 'stageClear':
      p.sfx('clear');
      p.toast('Stage clear!', 2.2, 'good');
      p.burst(e.x, e.y - 40, {
        n: 30,
        colors: CONFETTI,
        speed: 280,
        size: 7,
        life: 1.4,
        gravity: 300,
        shape: 'confetti',
        dir: UP,
        spread: 1.2,
      });
      break;
    case 'stageExit':
      break; // the app moves on to the boss
    // The opening's moments are only heard when the browser already lets the game play sound: until the
    // first key press it is silent. The title scene does their acting.
    case 'cue':
      p.sfx(CUE_SOUNDS[e.cue]);
      break;
    case 'win':
    case 'lose':
      break; // the app shows the result card
    default:
      e satisfies never; // a new event type must be given a case above
  }
}
