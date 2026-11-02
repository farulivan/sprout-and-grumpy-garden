// The rules of a stage (src/sim/stage/): the ground and its pits, the camera, the small enemies, the pickups
// and the gate, bounce pads and glades. The last tests check that each stage can be played to its end, that
// every jump in it can be made, and that the Mushroom Wood's bounces can't be done without.
import { describe, expect, it } from 'vitest';
import { GROUND, W } from '../../src/config';
import type { SimEvent } from '../../src/sim/events';
import { NO_INPUT, type InputFrame } from '../../src/sim/input';
import { Bouncer } from '../../src/sim/bouncer';
import { BODY_HALF, Player, type PlayerWorld } from '../../src/sim/player';
import { Burr, BURR_DIZZY, BURR_WARN } from '../../src/sim/stage/enemies/burr';
import { Dropcap, DROP_WARN } from '../../src/sim/stage/enemies/dropcap';
import { PEA_WARN } from '../../src/sim/stage/enemies/peaPod';
import { SNAP_WARN } from '../../src/sim/stage/enemies/snapper';
import { Toadlet } from '../../src/sim/stage/enemies/toadlet';
import { Stage, type StageData } from '../../src/sim/stage/stage';
import { STAGES } from '../../src/sim/stage/stages';

type Input = InputFrame | ((stage: Stage) => InputFrame);
// Steps the stage, collecting events, for that many seconds or until `until` says stop.
function run(stage: Stage, seconds: number, input: Input = NO_INPUT, until?: (e: SimEvent) => boolean) {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    stage.step(typeof input === 'function' ? input(stage) : input);
    const now = stage.drainEvents();
    events.push(...now);
    if (until && now.some(until)) break;
  }
  return events;
}
const RIGHT = { ...NO_INPUT, right: true };
const SHOOT = { ...NO_INPUT, shoot: true };
const has = (events: SimEvent[], type: SimEvent['type']) => events.some((e) => e.type === type);

// A flat stretch with nothing on it: each test puts down only what it is about.
const FLAT: StageData = {
  name: 'Test',
  length: 3000,
  startX: 200,
  gateX: 2800,
  ground: [[-40, 3040]],
  logs: [],
  platforms: [],
  thorns: [],
  enemies: [],
  dewdrops: [],
  seeds: [],
};
const stageWith = (more: Partial<StageData>) => new Stage({ seed: 1, data: { ...FLAT, ...more } });

// How far and how high Pip can jump at full speed, holding the button: the measure for the layout tests.
function longestJump() {
  const world: PlayerWorld = { minX: -1e6, maxX: 1e6, platforms: [], projectiles: [], emit() {} };
  const pip = new Player(world);
  pip.vx = 290;
  pip.update(1 / 60, { ...RIGHT, jump: true, jumpPressed: true });
  const x0 = pip.x;
  let apex = 0;
  for (let i = 0; i < 300 && !pip.onGround; i++) {
    pip.update(1 / 60, { ...RIGHT, jump: true });
    apex = Math.max(apex, GROUND - pip.y);
  }
  return { distance: pip.x - x0, apex };
}

describe('ground', () => {
  it('stops Pip at the side of a log, and lets him hop up and walk across it', () => {
    const stage = stageWith({ logs: [{ x: 400, w: 66, h: 30 }] });
    const pip = stage.player;
    run(stage, 2, RIGHT);
    expect(pip.x).toBeCloseTo(400 - BODY_HALF, 6);
    let stoodOnIt = false;
    run(stage, 1.5, (s) => {
      if (s.player.onGround && s.player.y === GROUND - 30) stoodOnIt = true;
      return { ...RIGHT, jump: true, jumpPressed: s.player.onGround && s.player.y === GROUND };
    });
    expect(stoodOnIt || pip.x > 466).toBe(true);
    run(stage, 1, RIGHT);
    expect(pip.x).toBeGreaterThan(500);
    expect(pip.y).toBe(GROUND);
  });

  it('takes a heart for a fall into a pit, even while Pip flashes from a hit, and brings him back', () => {
    const stage = stageWith({
      ground: [
        [-40, 600],
        [740, 3040],
      ],
    });
    const pip = stage.player;
    pip.inv = 1; // still protected from an earlier hit
    const events = run(stage, 4, RIGHT, (e) => e.type === 'pitFall');
    expect(has(events, 'pitFall')).toBe(true);
    expect(pip.hp).toBe(4);
    expect(pip.x).toBeLessThanOrEqual(600 - 48); // on safe ground before the pit
    expect(pip.inv).toBeGreaterThan(1.5);
    expect(stage.state).toBe('play');
  });

  it('loses the stage when a pit takes the last heart', () => {
    const stage = stageWith({
      ground: [
        [-40, 600],
        [740, 3040],
      ],
    });
    stage.player.hp = 1;
    run(stage, 4, RIGHT, (e) => e.type === 'pitFall');
    expect(stage.state).toBe('down');
    const events = run(stage, 2.4);
    expect(stage.state).toBe('lose');
    expect(events.find((e) => e.type === 'lose')).toMatchObject({ type: 'lose' });
  });

  it('lets Pip run and jump across a pit as wide as the stages use', () => {
    const stage = stageWith({
      ground: [
        [-40, 600],
        [740, 3040],
      ],
    });
    const events = run(stage, 4, (s) => ({
      ...RIGHT,
      jump: true,
      jumpPressed: s.player.x > 570 && s.player.onGround,
    }));
    expect(has(events, 'pitFall')).toBe(false);
    expect(stage.player.x).toBeGreaterThan(740);
  });
});

describe('camera', () => {
  it('follows Pip, looks ahead of him, and never shows past either end', () => {
    const stage = stageWith({});
    expect(stage.camX).toBe(0);
    let lowest = Infinity,
      highest = -Infinity;
    run(stage, 13, (s) => {
      lowest = Math.min(lowest, s.camX);
      highest = Math.max(highest, s.camX);
      return RIGHT;
    });
    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(highest).toBeLessThanOrEqual(stage.length - W);
    expect(stage.camX).toBeCloseTo(stage.length - W, 0);
  });
});

describe('enemies', () => {
  it('Grumbud walks toward Pip and turns back at the edge of its leaf pad', () => {
    const stage = stageWith({
      platforms: [{ x: 780, y: 360, w: 150, h: 22 }],
      enemies: [{ kind: 'grumbud', x: 900, y: 360 }],
    });
    const bud = stage.enemies[0];
    let turned = false;
    run(stage, 8, () => {
      expect(bud.x).toBeGreaterThanOrEqual(780);
      expect(bud.x).toBeLessThanOrEqual(930);
      if (bud.facing > 0) turned = true;
      return NO_INPUT;
    });
    expect(turned).toBe(true);
  });

  it('Puffball hangs just in front of Pip, clear of him while he stands, out of reach of straight shots', () => {
    const stage = stageWith({ enemies: [{ kind: 'puffball', x: 320, y: 300 }] });
    run(stage, 8);
    const puff = stage.enemies[0];
    expect(stage.player.hp).toBe(5);
    expect(puff.x - stage.player.x).toBeGreaterThan(30); // ahead of him, where a seed aimed up goes
    const events = run(stage, 1.5, SHOOT);
    expect(has(events, 'enemyHit') || has(events, 'enemyCheered')).toBe(false);
    const aimed = run(stage, 1.5, { ...SHOOT, up: true });
    expect(has(aimed, 'enemyCheered')).toBe(true);
  });

  it('Puffball is cheered up by one seed aimed up as it comes', () => {
    const stage = stageWith({ enemies: [{ kind: 'puffball', x: 760, y: 300 }] });
    const events = run(stage, 12, { ...SHOOT, up: true }, (e) => e.type === 'enemyCheered');
    expect(has(events, 'enemyCheered')).toBe(true);
    expect(stage.enemies.length).toBe(0);
  });

  it('Pea Pod shows the "!" for 0.9 s before each pea, and spits only at Pip in front of it', () => {
    const fresh = stageWith({ enemies: [{ kind: 'peaPod', x: 700 }] });
    let warnAt = -1,
      peaAt = -1;
    for (let i = 0; i < 6 * 60 && peaAt < 0; i++) {
      fresh.step(NO_INPUT);
      for (const e of fresh.drainEvents()) {
        if (e.type === 'enemyWarn' && warnAt < 0) warnAt = fresh.t;
        if (e.type === 'pea') peaAt = fresh.t;
      }
    }
    expect(warnAt).toBeGreaterThan(0);
    expect(peaAt - warnAt).toBeCloseTo(PEA_WARN, 1);
    run(fresh, 3);
    expect(fresh.player.hp).toBe(4); // it flew at a standing Pip and hit him

    const behind = stageWith({ enemies: [{ kind: 'peaPod', x: 700 }] });
    behind.player.x = behind.player.px = 900;
    expect(has(run(behind, 5), 'enemyWarn')).toBe(false);
  });

  it('a level-2 Pea Pod spits two peas, a beat apart, after one "!"', () => {
    const stage = stageWith({ enemies: [{ kind: 'peaPod', x: 700, level: 2 }] });
    stage.player.inv = 999;
    const peas: number[] = [];
    let warns = 0;
    for (let i = 0; i < 4 * 60 && peas.length < 2; i++) {
      stage.step(NO_INPUT);
      for (const e of stage.drainEvents()) {
        if (e.type === 'enemyWarn') warns++;
        if (e.type === 'pea') peas.push(stage.t);
      }
    }
    expect(warns).toBe(1);
    expect(peas.length).toBe(2);
    expect(peas[1] - peas[0]).toBeCloseTo(0.45, 1);
  });

  it("Snapper can't be hurt while hidden; it warns, snaps up, and can be cheered up while it is up", () => {
    const stage = stageWith({ enemies: [{ kind: 'snapper', x: 420 }] });
    stage.player.x = stage.player.px = 300; // close enough to stir it, too far to be bitten
    const events = run(stage, 6, SHOOT, (e) => e.type === 'enemyCheered');
    const snapAt = events.findIndex((e) => e.type === 'snap'),
      warnAt = events.findIndex((e) => e.type === 'enemyWarn');
    expect(warnAt).toBeGreaterThanOrEqual(0);
    expect(snapAt).toBeGreaterThan(warnAt);
    expect(events.slice(0, snapAt).some((e) => e.type === 'enemyBlock')).toBe(true);
    expect(events.slice(0, snapAt).some((e) => e.type === 'enemyHit')).toBe(false);
    expect(events.slice(snapAt).some((e) => e.type === 'enemyCheered')).toBe(true);
    expect(stage.player.hp).toBe(5);
    expect(SNAP_WARN).toBeGreaterThanOrEqual(0.8);
  });

  it('hurts Pip on touch and knocks him away from the enemy', () => {
    const stage = stageWith({ enemies: [{ kind: 'grumbud', x: 270 }] });
    const events = run(stage, 2, NO_INPUT, (e) => e.type === 'playerHurt');
    expect(has(events, 'playerHurt')).toBe(true);
    expect(stage.player.vx).toBeLessThan(0); // the Grumbud came from the right
  });
});

describe('pickups and the gate', () => {
  it('heals a heart with a dewdrop, never above the most, and counts golden seeds', () => {
    const stage = stageWith({
      dewdrops: [[400, GROUND - 30]],
      seeds: [
        [600, GROUND - 36],
        [900, 250],
      ],
    });
    stage.player.hp = 3;
    const events = run(stage, 2.5, RIGHT);
    expect(stage.player.hp).toBe(4);
    expect(stage.goldenSeeds).toBe(1);
    expect(events.find((e) => e.type === 'goldenSeed')).toEqual({
      type: 'goldenSeed',
      x: 600,
      y: GROUND - 36,
      found: 1,
    });
  });

  it('turns every third golden seed into a heart, unless the hearts are full, and starts counting again', () => {
    const three: Partial<StageData> = {
      seeds: [
        [500, GROUND - 36],
        [600, GROUND - 36],
        [700, GROUND - 36],
      ],
    };
    const seedsOf = (events: SimEvent[]) =>
      events.flatMap((e) => (e.type === 'goldenSeed' ? [{ found: e.found, healed: e.healed }] : []));

    const hurt = stageWith(three);
    hurt.player.hp = 3;
    expect(seedsOf(run(hurt, 3, RIGHT))).toEqual([
      { found: 1, healed: undefined },
      { found: 2, healed: undefined },
      { found: 3, healed: true },
    ]);
    expect([hurt.player.hp, hurt.goldenSeeds]).toEqual([4, 0]);

    const full = stageWith(three);
    expect(seedsOf(run(full, 3, RIGHT)).at(-1)).toEqual({ found: 3, healed: false });
    expect([full.player.hp, full.goldenSeeds]).toEqual([5, 0]);
  });

  it('clears at the gate with the time, hits and hearts, then walks Pip through and moves on', () => {
    const stage = stageWith({ gateX: 800 });
    const events = run(stage, 5, RIGHT, (e) => e.type === 'stageClear');
    const clear = events.find((e) => e.type === 'stageClear');
    expect(clear).toMatchObject({ result: { hits: 0, hearts: 5, easy: false } });
    expect(stage.state).toBe('clear');
    expect(stage.cheering).toBe(true);
    const after = run(stage, 2.4);
    expect(has(after, 'stageExit')).toBe(true);
    expect(stage.state).toBe('exit');
    expect(stage.player.x).toBeGreaterThan(800 + 50);
  });

  it('replays identically from the same seed and inputs', () => {
    const play = () => {
      const stage = new Stage({ seed: 9 });
      let f = 0;
      run(stage, 30, () => ({
        ...RIGHT,
        shoot: true,
        up: f % 90 < 30,
        jump: f % 70 < 20,
        jumpPressed: f++ % 70 === 0,
      }));
      return [
        stage.stageTime,
        stage.player.x,
        stage.player.hp,
        stage.enemies.length,
        stage.camX,
        stage.state,
      ];
    };
    expect(play()).toEqual(play());
  });
});

describe('the Garden Path', () => {
  const data = STAGES.gardenPath;

  it('can be played to the end by an untouchable Pip who runs, shoots and jumps what is in his way', () => {
    const stage = new Stage({ seed: 1 });
    const obstacles = [
      ...data.logs.map((l) => l.x),
      ...data.thorns.map((t) => t.x),
      ...data.ground.slice(1).map(([x0]) => x0 - 160), // each pit begins where the last stretch of ground ends
    ];
    run(
      stage,
      60,
      (s) => {
        s.player.inv = 999;
        const ahead = obstacles.some((x) => x - s.player.x > 20 && x - s.player.x < 70);
        return { ...RIGHT, shoot: true, jump: true, jumpPressed: ahead && s.player.onGround };
      },
      (e) => e.type === 'stageClear',
    );
    expect(stage.state).toBe('clear');
  });

  it('has no pit wider than three quarters of Pip longest jump, and every log and leaf pad can be reached', () => {
    const { distance, apex } = longestJump();
    expect(distance).toBeGreaterThan(200);
    for (let i = 1; i < data.ground.length; i++) {
      const gap = data.ground[i][0] - data.ground[i - 1][1];
      expect(gap).toBeLessThanOrEqual(distance * 0.75);
    }
    for (const l of data.logs) expect(l.h).toBeLessThan(apex / 2);
    // a pad is reached from the ground, or from another pad below it and near enough across
    for (const pad of data.platforms) {
      const from = [
        GROUND,
        ...data.platforms.filter((o) => o.y > pad.y && Math.abs(o.x - pad.x) < 400).map((o) => o.y),
      ];
      expect(Math.min(...from.map((y) => y - pad.y))).toBeLessThan(apex - 10);
    }
  });

  it('hides three golden seeds and two dewdrops', () => {
    expect(data.seeds.length).toBe(3);
    expect(data.dewdrops.length).toBe(2);
  });
});

// ---- the Mushroom Wood's new rules ----

// Pip's best bounce off a pad on flat ground: how high above the ground, and how far across.
function bounceFrom(hold: boolean) {
  const pad = new Bouncer(0, GROUND),
    world: PlayerWorld = {
      minX: -1e6,
      maxX: 1e6,
      platforms: [],
      bouncers: [pad],
      projectiles: [],
      emit() {},
    };
  const pip = new Player(world);
  pip.x = 0;
  pip.y = pad.top - 1;
  pip.vy = 10;
  pip.vx = 290;
  const input = { ...RIGHT, jump: hold };
  pip.update(1 / 60, input); // comes down on it
  const x0 = pip.x;
  let apex = 0;
  for (let i = 0; i < 300 && !pip.onGround; i++) {
    pip.update(1 / 60, input);
    apex = Math.max(apex, GROUND - pip.y);
  }
  return { apex, distance: pip.x - x0 };
}

describe('bounce pads', () => {
  it('throw Pip higher than a jump, and higher still with the button held', () => {
    const held = bounceFrom(true),
      let_go = bounceFrom(false),
      jump = longestJump();
    // measured from the pad's top, about the plan's figures (a stepped arc tops out a few px under the formula)
    expect(held.apex - 36).toBeGreaterThan(245);
    expect(held.apex - 36).toBeLessThan(265);
    expect(let_go.apex - 36).toBeGreaterThan(140);
    expect(let_go.apex - 36).toBeLessThan(160);
    expect(held.distance).toBeGreaterThan(jump.distance + 60);
    expect(held.apex).toBeGreaterThan(jump.apex + 100);
  });

  it('only bounce him when he comes down on them, not walking through or rising through', () => {
    const stage = stageWith({ enemies: [{ kind: 'capling', x: 480 }] });
    stage.player.x = stage.player.px = 300;
    run(stage, 1, SHOOT);
    expect(stage.bouncers.length).toBe(1);
    const walked = run(stage, 1, RIGHT);
    expect(stage.player.x).toBeGreaterThan(480);
    expect(has(walked, 'bounce')).toBe(false);

    stage.player.x = stage.player.px = 480;
    const rising = run(stage, 0.1, { ...NO_INPUT, jump: true, jumpPressed: true });
    expect(has(rising, 'bounce')).toBe(false);
    expect(stage.player.vy).toBeLessThan(0); // through the pad on the way up...
    const falling = run(stage, 1.5, NO_INPUT, (e) => e.type === 'bounce');
    expect(has(falling, 'bounce')).toBe(true); // ...and thrown back up on the way down
  });

  it('count the button pressed just after the bounce as held, and no later', () => {
    const fly = (pressAfter: number) => {
      const stage = stageWith({ enemies: [{ kind: 'capling', x: 480 }] });
      stage.player.x = stage.player.px = 300;
      run(stage, 1, SHOOT);
      stage.player.x = stage.player.px = 480;
      stage.player.y = stage.player.py = stage.bouncers[0].top - 30;
      run(stage, 1, NO_INPUT, (e) => e.type === 'bounce');
      let top = stage.player.y;
      run(stage, 1, () => {
        top = Math.min(top, stage.player.y);
        return { ...NO_INPUT, jump: stage.t > pressAfter };
      });
      return GROUND - top;
    };
    const base = (() => {
      const stage = stageWith({ enemies: [{ kind: 'capling', x: 480 }] });
      stage.player.x = stage.player.px = 300;
      run(stage, 1, SHOOT);
      return stage.t;
    })();
    expect(fly(base + 0.05)).toBeGreaterThan(250); // within a few frames of the bounce: a high one
    expect(fly(base + 0.6)).toBeLessThan(220); // long after: too late
  });

  it('leave a Pip who is down alone', () => {
    const stage = stageWith({});
    stage.bouncers.push(new Bouncer(300, GROUND));
    stage.player.x = stage.player.px = 300;
    stage.player.y = stage.player.py = 300;
    stage.player.hp = 1;
    stage.player.hurt();
    expect(stage.player.alive).toBe(false);
    expect(has(run(stage, 1), 'bounce')).toBe(false);
  });
});

describe('the Mushroom Wood enemies', () => {
  it('Capling sits still and hurts to touch; two seeds make it a pad for good, and say so once', () => {
    const touched = stageWith({ enemies: [{ kind: 'capling', x: 420 }] });
    const x0 = touched.enemies[0].x;
    expect(has(run(touched, 2, RIGHT), 'playerHurt')).toBe(true);
    expect(touched.enemies[0].x).toBe(x0);

    const stage = stageWith({
      enemies: [
        { kind: 'capling', x: 480 },
        { kind: 'capling', x: 620 },
      ],
    });
    stage.player.x = stage.player.px = 300;
    const events = run(stage, 2.5, SHOOT);
    expect(events.flatMap((e) => (e.type === 'padReady' ? [e.first] : []))).toEqual([true, false]);
    expect(stage.enemies.length).toBe(0);
    expect(stage.bouncers.map((b) => b.x)).toEqual([480, 620]);
    run(stage, 30);
    expect(stage.bouncers.length).toBe(2);
    expect(stage.player.hp).toBe(5);
  });

  it('Burr warns, rolls at Pip with seeds bouncing off, and stops dizzy at a wall, when three seeds land', () => {
    const stage = stageWith({
      logs: [{ x: 360, w: 40, h: 30 }],
      enemies: [{ kind: 'burr', x: 620 }],
    });
    stage.player.x = stage.player.px = 300; // behind the log, out of its way
    const burr = stage.enemies[0] as Burr;
    const events = run(stage, 0.1, NO_INPUT).concat(run(stage, BURR_WARN + 0.1, SHOOT));
    expect(has(events, 'enemyWarn')).toBe(true);
    expect(burr.state).toBe('roll');
    const rolling = run(stage, 3, SHOOT, (e) => e.type === 'thud');
    expect(has(rolling, 'enemyBlock')).toBe(true);
    expect(has(rolling, 'enemyHit')).toBe(false);
    expect(burr.state).toBe('dizzy');
    expect(burr.x - 20).toBeCloseTo(400, -1); // at the log
    const dizzy = run(stage, BURR_DIZZY - 0.1, SHOOT, (e) => e.type === 'enemyCheered');
    expect(has(dizzy, 'enemyCheered')).toBe(true);
    expect(stage.player.hp).toBe(5);
  });

  it('Burr stops at the edge of a pit, can be jumped, and stays behind Pip once he is past', () => {
    const edge = stageWith({
      ground: [
        [-40, 400],
        [540, 3040],
      ],
      enemies: [{ kind: 'burr', x: 600 }],
    });
    edge.player.x = edge.player.px = 300;
    edge.player.inv = 99;
    run(edge, 4);
    expect((edge.enemies[0] as Burr).x).toBeGreaterThan(530);

    const past = stageWith({ enemies: [{ kind: 'burr', x: 400 }] });
    past.player.x = past.player.px = 700;
    expect(has(run(past, 4), 'enemyWarn')).toBe(false);

    const jumped = stageWith({ enemies: [{ kind: 'burr', x: 520 }] });
    run(jumped, 5, (s) => {
      const b = s.enemies[0] as Burr,
        near = b.state === 'roll' && Math.abs(b.x - s.player.x) < 150;
      return { ...NO_INPUT, jump: true, jumpPressed: near && s.player.onGround };
    });
    expect(jumped.player.hp).toBe(5);
  });

  it('Dropcap hangs out of reach of straight shots, and lands on a Pip who keeps running', () => {
    const shot = stageWith({ enemies: [{ kind: 'dropcap', x: 580, y: 170 }] }); // where a seed aimed up crosses
    shot.player.x = shot.player.px = 300;
    const straight = run(shot, 1, SHOOT);
    expect(has(straight, 'enemyCheered')).toBe(false);
    expect(has(run(shot, 1.5, { ...SHOOT, up: true }), 'enemyCheered')).toBe(true);

    const ran = stageWith({ enemies: [{ kind: 'dropcap', x: 800, y: 170 }] });
    const events = run(ran, 4, RIGHT);
    const warned = events.findIndex((e) => e.type === 'enemyWarn'),
      hurt = events.findIndex((e) => e.type === 'playerHurt');
    expect(warned).toBeGreaterThanOrEqual(0);
    expect(hurt).toBeGreaterThan(warned);

    // one who looks up and stops is safe, and it sits there for a seed
    const looked = stageWith({ enemies: [{ kind: 'dropcap', x: 800, y: 170 }] });
    const cap = looked.enemies[0] as Dropcap;
    run(looked, 4, () => (cap.state === 'hang' ? RIGHT : NO_INPUT));
    expect(cap.state).toBe('down');
    expect(looked.player.hp).toBe(5);
    expect(cap.bloomY()).toBe(GROUND);
    expect(has(run(looked, 2, SHOOT), 'enemyCheered')).toBe(true);
    expect(DROP_WARN).toBeGreaterThanOrEqual(0.4);
  });

  it('Toadlet hops at Pip over straight shots, lands where it said, and he can run under it', () => {
    const stage = stageWith({ enemies: [{ kind: 'toadlet', x: 620 }] });
    stage.player.x = stage.player.px = 300;
    stage.player.inv = 99;
    const toad = stage.enemies[0] as Toadlet;
    let landedAt = 0,
      aimedAt = 0;
    run(
      stage,
      3,
      () => {
        if (toad.state === 'hop') aimedAt = toad.landX;
        if (toad.state === 'sit' && aimedAt) landedAt = toad.x;
        return NO_INPUT;
      },
      () => false,
    );
    expect(aimedAt).toBeGreaterThan(0);
    expect(landedAt).toBeCloseTo(aimedAt, 0);

    // at the top of a hop it is out of a straight seed's way and over Pip's head
    const top = stageWith({ enemies: [{ kind: 'toadlet', x: 700 }] });
    const flying = top.enemies[0] as Toadlet;
    for (let i = 0; i < 600 && !(flying.state === 'hop' && flying.y < GROUND - 90); i++) top.step(NO_INPUT);
    const box = flying.hurtbox();
    expect(box.y + box.r).toBeLessThan(GROUND - 28 - 7); // clear of a straight seed
    expect(box.y + box.r).toBeLessThan(GROUND - 22 - 14); // clear of his head
  });

  it('Toadlet hops across a pit and never comes down in one', () => {
    const stage = stageWith({
      ground: [
        [-40, 500],
        [660, 3040],
      ],
      enemies: [{ kind: 'toadlet', x: 800 }],
    });
    stage.player.x = stage.player.px = 300;
    stage.player.inv = 99;
    const toad = stage.enemies[0] as Toadlet;
    run(stage, 8);
    expect(toad.dead).toBe(false);
    expect(toad.x).toBeLessThan(500); // it has crossed
    expect(toad.y).toBe(GROUND);
  });

  it('every one warns before it can hurt a Pip who stands still', () => {
    for (const enemy of [
      { kind: 'burr', x: 420 },
      { kind: 'dropcap', x: 300, y: 170 },
      { kind: 'peaPod', x: 420 },
      { kind: 'snapper', x: 320 },
    ] as const) {
      const stage = stageWith({ enemies: [enemy] });
      stage.player.x = stage.player.px = 300;
      const events = run(stage, 6);
      const warned = events.findIndex((e) => e.type === 'enemyWarn'),
        hurt = events.findIndex((e) => e.type === 'playerHurt');
      expect(warned, enemy.kind).toBeGreaterThanOrEqual(0);
      expect(hurt, enemy.kind).toBeGreaterThan(warned);
    }
  });
});

const GLADE: Partial<StageData> = {
  glades: [{ x0: 500, x1: 1460 }],
  enemies: [
    { kind: 'grumbud', x: 1000, glade: 0 },
    { kind: 'grumbud', x: 1100, glade: 0 },
    { kind: 'grumbud', x: 1200, glade: 0, wave: 1 },
  ],
};
const shutIn = () => {
  const stage = stageWith(GLADE);
  run(stage, 4, RIGHT, (e) => e.type === 'gladeClose');
  return stage;
};

describe('glades', () => {
  it('shut once Pip is inside: the camera stops and the brambles hold him in', () => {
    const stage = shutIn();
    expect(stage.player.x).toBeGreaterThan(500);
    expect(stage.closed).toBe(true);
    stage.player.inv = 999;
    run(stage, 5, RIGHT);
    expect(stage.player.x).toBeLessThan(1460);
    expect(stage.camX).toBeCloseTo(500, 0);
    run(stage, 6, { ...NO_INPUT, left: true });
    expect(stage.player.x).toBeGreaterThan(500);
    expect(stage.camX).toBeCloseTo(500, 0);
  });

  it("can't open until every plant of every wave is cheered up, and each wave waits for the last", () => {
    const stage = shutIn();
    const [a, b] = stage.enemies;
    expect(stage.enemies.length).toBe(2); // the second wave isn't there yet
    const hit = (e: (typeof stage.enemies)[number]) => {
      e.hp = 1;
      e.hit();
      return run(stage, 0.1);
    };
    expect(has(hit(a), 'gladeWave')).toBe(false);
    expect(stage.closed).toBe(true);
    const events = hit(b);
    expect(has(events, 'gladeOpen')).toBe(false);
    expect(events.find((e) => e.type === 'gladeWave')).toMatchObject({ wave: 2 });
    expect(stage.closed).toBe(true);
    const last = stage.enemies.find((e) => e.x === 1200)!;
    expect(last.entering).toBeGreaterThan(0);
    const opened = hit(last);
    expect(has(opened, 'gladeOpen')).toBe(true);
    expect(stage.closed).toBe(false);
    stage.player.inv = 999;
    run(stage, 6, RIGHT);
    expect(stage.player.x).toBeGreaterThan(1500);
  });

  it("gives a later wave's plants a warning: until they arrive they can't hurt or be hurt", () => {
    const stage = stageWith({
      glades: [{ x0: 200, x1: 1160 }],
      enemies: [
        { kind: 'grumbud', x: 900, glade: 0 },
        { kind: 'grumbud', x: 460, glade: 0, wave: 1 },
      ],
    });
    stage.player.x = stage.player.px = 460;
    run(stage, 0.1);
    expect(stage.closed).toBe(true);
    stage.enemies[0].hp = 1;
    stage.enemies[0].hit();
    run(stage, 0.1);
    const late = stage.enemies.find((e) => e.x === 460)!;
    expect(late.entering).toBeGreaterThan(0.5);
    const hp = stage.player.hp;
    run(stage, 0.5, SHOOT);
    expect(stage.player.hp).toBe(hp);
    expect(late.hp).toBe(2);
    expect(has(run(stage, 1.5), 'playerHurt')).toBe(true); // it has arrived
  });

  it("can't trap Pip: anything that wandered off is brought back inside the walls", () => {
    const stage = stageWith({
      glades: [{ x0: 500, x1: 1460 }],
      enemies: [{ kind: 'grumbud', x: 600, glade: 0 }],
    });
    stage.enemies[0].x = 300; // somehow out on the wrong side
    stage.player.x = stage.player.px = 660;
    stage.player.inv = 999;
    run(stage, 0.1);
    expect(stage.closed).toBe(true);
    run(stage, 0.1);
    expect(stage.enemies[0].x).toBeGreaterThanOrEqual(stage.minX);
    expect(stage.enemies[0].awake).toBe(true);
    // and it can still be reached: a Pip who goes after it cheers it up
    const opened = run(stage, 20, (s) => {
      const e = s.enemies[0],
        dx = e ? e.x - s.player.x : 0;
      return { ...SHOOT, left: dx < 0, right: dx > 0 };
    });
    expect(has(opened, 'gladeOpen')).toBe(true);
  });
});

// Plays the Mushroom Wood untouchable, by a simple plan: cheer up what's in the way, go round by the bounce
// pads, and in a glade go for each plant in turn. Without aim, as on a touch screen, it hops to reach what hangs
// above straight shots.
function routeBot(data: StageData, opts: { aim: boolean }) {
  const pits = data.ground.slice(1).map(([x1], i) => ({ x0: data.ground[i][1], x1 })),
    wide = pits.filter((p) => p.x1 - p.x0 > longestJump().distance * 0.75),
    walls = [...(data.trunks ?? []).map((t) => t.x), ...wide.map((p) => p.x0)].sort((a, b) => a - b),
    hops = [...data.logs.map((l) => l.x), ...data.thorns.map((t) => t.x)],
    edges = pits.filter((p) => !wide.includes(p)).map((p) => p.x0);
  const used = new Set<Bouncer>();
  return (s: Stage): InputFrame => {
    const p = s.player;
    p.inv = 999;
    for (const b of s.bouncers) if (b.sprung > 0) used.add(b);
    const glade = s.glade;
    if (glade) {
      const live = s.enemies.filter((e) => glade.here.includes(e) && e.entering <= 0);
      const near = live.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (!near) return { ...NO_INPUT, shoot: true };
      const dx = near.x - p.x,
        high = near.kind === 'puffball' || (near instanceof Dropcap && near.y < GROUND - 60),
        under = near.kind === 'dropcap' || near.kind === 'snapper';
      // right on top of a plant a seed flies past it, so back off; otherwise close in and face it
      const reach = under ? 40 : 110,
        away = !under && Math.abs(dx) < 40,
        room = dx === 0 ? 1 : p.x < (glade.x0 + glade.x1) / 2 ? 1 : -1; // which way there is more of it
      return {
        ...NO_INPUT,
        shoot: true,
        up: opts.aim && high,
        left: away ? room < 0 : dx < -reach || (dx < 0 && p.facing > 0),
        right: away ? room > 0 : dx > reach || (dx > 0 && p.facing < 0),
        jump: true,
        jumpPressed: !opts.aim && high && p.onGround,
      };
    }
    // the next thing only a bounce gets past, and the pad or Capling just before it
    const wall = walls.find((x) => p.x < x + 40 && x - p.x < 420 && p.y > GROUND - 150),
      pad = wall === undefined ? undefined : s.bouncers.find((b) => b.x < wall && wall - b.x < 300),
      capling =
        wall === undefined
          ? undefined
          : s.enemies.find((e) => e.kind === 'capling' && e.x < wall && wall - e.x < 300);
    if (wall !== undefined && capling && !pad) {
      // walk up within range and cheer it up
      return { ...NO_INPUT, shoot: true, right: capling.x - p.x > 220 };
    }
    if (pad && p.x < pad.x + 40 && (p.onGround || !used.has(pad))) {
      const dist = pad.x - p.x;
      const air = !p.onGround;
      return {
        ...NO_INPUT,
        shoot: true,
        jump: true,
        jumpPressed: p.onGround && Math.abs(dist) < 70,
        right: air ? dist > 3 : dist > 40,
        left: air ? dist < -3 : dist < 20,
      };
    }
    const hop =
      hops.some((x) => x - p.x > 10 && x - p.x < 70) || edges.some((x) => x - p.x > 0 && x - p.x < 30);
    return { ...RIGHT, shoot: true, jump: true, jumpPressed: hop && p.onGround };
  };
}

const HELD = { ...RIGHT, jump: true };

describe('the Mushroom Wood', () => {
  const data = STAGES.mushroomWood,
    wood = () => new Stage({ seed: 1, stage: 'mushroomWood' });

  it('can be played to the end by an untouchable Pip, aiming or not, and not quickly', () => {
    for (const aim of [true, false]) {
      const stage = wood();
      run(stage, 180, routeBot(data, { aim }), (e) => e.type === 'stageClear');
      expect(stage.state, `aim: ${aim}, stuck at ${stage.player.x}`).toBe('clear');
      expect(stage.stageTime).toBeGreaterThan(45);
    }
  });

  it("can't be cleared by holding right and shoot, jumping only at what's in the way", () => {
    const pits = data.ground.slice(1).map(([x1], i) => ({ x0: data.ground[i][1], x1 })),
      obstacles = [
        ...data.logs.map((l) => l.x),
        ...data.thorns.map((t) => t.x),
        ...(data.trunks ?? []).map((t) => t.x),
        ...pits.map((p) => p.x0 - 20),
      ];
    const stage = wood();
    run(stage, 240, (s) => {
      const ahead = obstacles.some((x) => x - s.player.x > 10 && x - s.player.x < 70);
      return { ...RIGHT, shoot: true, jump: true, jumpPressed: ahead && s.player.onGround };
    });
    expect(stage.state).not.toBe('exit');
    expect(stage.state).not.toBe('clear');
  });

  it("can't be cleared by holding right and shoot and jumping blindly either", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const stage = new Stage({ seed, stage: 'mushroomWood' });
      let f = 0;
      run(stage, 240, () => ({ ...RIGHT, shoot: true, jump: true, jumpPressed: f++ % 30 === 0 }));
      expect(stage.state, `seed ${seed}`).not.toBe('exit');
      expect(stage.state, `seed ${seed}`).not.toBe('clear');
    }
  });

  it('has trunks that only a held bounce gets over, each with a Capling before it', () => {
    const jump = longestJump(),
      low = bounceFrom(false),
      high = bounceFrom(true);
    expect(data.trunks?.length).toBeGreaterThan(0);
    for (const t of data.trunks ?? []) {
      expect(t.h).toBeGreaterThan(jump.apex);
      expect(t.h).toBeGreaterThan(low.apex);
      expect(t.h).toBeLessThan(high.apex - 30);
      const capling = data.enemies.find((e) => e.kind === 'capling' && e.x < t.x && t.x - e.x < 240);
      expect(capling, `trunk at ${t.x}`).toBeDefined();
    }
  });

  // Whether Pip gets over a pit this wide, with `play` saying how he goes about it: the pit's edge is at x 600.
  const EDGE = 600;
  const gets = (width: number, setup: (s: Stage) => void, play: (s: Stage) => InputFrame) => {
    const stage = stageWith({
      ground: [
        [-40, EDGE],
        [EDGE + width, 3040],
      ],
    });
    setup(stage);
    const events = run(stage, 4, play, (e) => e.type === 'pitFall' || e.type === 'land');
    return !has(events, 'pitFall') && stage.player.x > EDGE + width;
  };
  // ...by a jump, however close to the edge or past it he presses it,
  const jumpsIt = (width: number) => {
    for (let press = -30; press <= 70; press++) {
      let pressed = false;
      const made = gets(
        width,
        (s) => (s.player.x = s.player.px = EDGE - 200),
        (s) => {
          const go = !pressed && s.player.x >= EDGE + press;
          if (go) pressed = true;
          return { ...HELD, jumpPressed: go };
        },
      );
      if (made) return true;
    }
    return false;
  };
  // ...or by a held bounce off a pad this far from the edge, coming down on the middle of it.
  const bouncesIt = (width: number, fromEdge: number, speed: number) =>
    gets(
      width,
      (s) => {
        const pad = new Bouncer(EDGE - fromEdge, GROUND);
        s.bouncers.push(pad);
        s.player.x = s.player.px = pad.x;
        s.player.y = s.player.py = pad.top - 2;
        s.player.vy = 60;
        s.player.vx = speed;
      },
      () => HELD,
    );

  it('has pits that only a held bounce crosses, each with a Capling at its edge, and the rest can be jumped', () => {
    const pits = data.ground.slice(1).map(([x1], i) => ({ x0: data.ground[i][1], x1 }));
    const wide = pits.filter((p) => !jumpsIt(p.x1 - p.x0));
    expect(wide.length).toBeGreaterThan(0);
    for (const pit of wide) {
      const width = pit.x1 - pit.x0,
        capling = data.enemies.find((e) => e.kind === 'capling' && e.x < pit.x0 && pit.x0 - e.x < 60);
      expect(capling, `pit at ${pit.x0}`).toBeDefined();
      const fromEdge = pit.x0 - capling!.x;
      expect(bouncesIt(width, fromEdge, 290), `pit at ${pit.x0}, at a run`).toBe(true);
      expect(bouncesIt(width, fromEdge, 0), `pit at ${pit.x0}, from a hop`).toBe(true);
    }
    // the others are for jumping, with room to spare
    for (const pit of pits.filter((p) => !wide.includes(p)))
      expect(pit.x1 - pit.x0).toBeLessThan(longestJump().distance * 0.75);
  });

  it('bounces Pip off a pad even where it hangs over the edge of a pit', () => {
    const stage = stageWith({
      ground: [
        [-40, EDGE],
        [EDGE + 300, 3040],
      ],
    });
    const pad = new Bouncer(EDGE - 10, GROUND);
    stage.bouncers.push(pad);
    stage.player.x = stage.player.px = pad.x + 22; // over the pit, on the pad's far side
    stage.player.y = stage.player.py = pad.top - 2;
    stage.player.vy = 60;
    stage.player.vx = 290;
    const events = run(stage, 3, HELD);
    expect(has(events, 'bounce')).toBe(true);
    expect(has(events, 'pitFall')).toBe(false);
    expect(stage.player.x).toBeGreaterThan(EDGE + 300);
  });

  it('can reach every leaf pad: the first of the high road by a bounce only, the rest by jumps along it', () => {
    const jump = longestJump(),
      high = bounceFrom(true);
    const road = [...data.platforms].sort((a, b) => a.x - b.x);
    expect(GROUND - road[0].y).toBeGreaterThan(jump.apex);
    expect(GROUND - road[0].y).toBeLessThan(high.apex - 30);
    const capling = data.enemies.find(
      (e) => e.kind === 'capling' && e.x < road[0].x && road[0].x - e.x < 240,
    );
    expect(capling).toBeDefined();
    for (let i = 1; i < road.length; i++) {
      const gap = road[i].x - (road[i - 1].x + road[i - 1].w);
      expect(gap).toBeLessThan(jump.distance * 0.8);
    }
  });

  it('keeps every glade on flat ground with room to move, and everything placed in it inside its walls', () => {
    for (const [i, g] of (data.glades ?? []).entries()) {
      expect(g.x1 - g.x0).toBeGreaterThanOrEqual(W);
      expect(data.ground.some(([x0, x1]) => x0 <= g.x0 && x1 >= g.x1)).toBe(true);
      expect((data.trunks ?? []).some((t) => t.x < g.x1 && t.x + t.w > g.x0)).toBe(false);
      const here = data.enemies.filter((e) => e.glade === i);
      expect(here.length).toBeGreaterThan(0);
      for (const e of here) {
        expect(e.x).toBeGreaterThan(g.x0 + 60);
        expect(e.x).toBeLessThan(g.x1 - 60);
      }
    }
    expect(data.enemies.some((e) => e.glade === 1 && e.wave === 1)).toBe(true);
  });

  it('hides three golden seeds and two dewdrops, the last seed only on a held bounce', () => {
    expect(data.seeds.length).toBe(3);
    expect(data.dewdrops.length).toBe(2);
    const [x, y] = data.seeds[2],
      high = bounceFrom(true),
      low = bounceFrom(false),
      seedHeight = GROUND - y;
    expect(seedHeight - 36 - 14).toBeLessThan(high.apex); // his head reaches it...
    expect(seedHeight - 36 - 14).toBeGreaterThan(low.apex); // ...only at the top of a held bounce
    expect(data.enemies.some((e) => e.kind === 'capling' && x - e.x < 260 && x - e.x > 100)).toBe(true);
  });

  it('replays identically from the same seed and inputs', () => {
    const play = () => {
      const stage = wood(),
        bot = routeBot(data, { aim: true });
      run(stage, 60, bot);
      return [stage.stageTime, stage.player.x, stage.camX, stage.enemies.length, stage.bouncers.length];
    };
    expect(play()).toEqual(play());
  });
});
