// The rules of a stage (src/sim/stage/): the ground and its pits, the camera, the four small enemies, the
// pickups and the gate. The last tests check that the Garden Path can be played to its end and that every
// jump in it can be made.
import { describe, expect, it } from 'vitest';
import { GROUND, W } from '../../src/config';
import type { SimEvent } from '../../src/sim/events';
import { NO_INPUT, type InputFrame } from '../../src/sim/input';
import { BODY_HALF, Player, type PlayerWorld } from '../../src/sim/player';
import { PEA_WARN } from '../../src/sim/stage/enemies/peaPod';
import { SNAP_WARN } from '../../src/sim/stage/enemies/snapper';
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
    expect(stage.seeds).toEqual([true, false]);
    expect(events.find((e) => e.type === 'goldenSeed')).toMatchObject({ found: 1, total: 2 });
  });

  it('clears at the gate with the time, hits, hearts and seeds, then walks Pip through and moves on', () => {
    const stage = stageWith({ gateX: 800, seeds: [[600, GROUND - 36]] });
    const events = run(stage, 5, RIGHT, (e) => e.type === 'stageClear');
    const clear = events.find((e) => e.type === 'stageClear');
    expect(clear).toMatchObject({ result: { hits: 0, hearts: 5, seeds: 1, easy: false } });
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
