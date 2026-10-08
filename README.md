# Sprout & the Grumpy Sunflower 🌱🌻

A cute, kid-friendly boss-battle game in the style of Cuphead / Mega Man boss fights, themed around plants.
Little **Pip** the sprout must cheer up **Sunny**, a grumpy sunflower, by showering him with seeds.
Win by emptying Sunny's bar without losing all your hearts.

Built with TypeScript, Vite and Phaser 4. There are still no art or sound files: every picture is drawn in
code when the game starts, and every sound is synthesized with WebAudio.

## Run it

```bash
npm install
npm run dev        # play at http://localhost:5173
npm run build      # static site in dist/; upload that folder to any static host
npm run preview    # serve dist/ locally to check the build
npm run check      # type-check, tests and formatting; run it before committing
```

Needs Node 22 (22.12 or newer) or Node 24.

## Controls

| Action | Keyboard | Gamepad | Touch (tablet/phone) |
| --- | --- | --- | --- |
| Move | ← → or A D | left stick or d-pad | slide on the ◀ ▶ pad |
| Jump (hold = higher) | Space, Z or K | A | Jump button |
| Shoot | hold X, J or L | hold X, RB or RT | automatic |
| Aim diagonally up | hold ↑ or W | stick or d-pad up | tap ⬆ to toggle |
| Pause / resume | P or Esc | Start | ⏸ button |
| Sound on/off | M | | 🔊 button |

Face shots do 2 damage; stem shots do 1. The game auto-pauses when the tab loses focus.
**Easy mode** (checkbox on the title and lose screens) gives 8 hearts instead of 5.
A jump pressed a moment before landing still counts, and so does one pressed a moment after walking off an edge.

## How the fight works

- **Phases:** Sunny has 400 HP and three phases (at 66% and 33%). Each phase change roars, gives 1.4 s of
  invulnerability, drops a healing **Dewdrop** 💧, recolors his petals, and unlocks harder attacks.
- **Telegraphs:** every attack starts with a "!" bubble and a chime. Ground hazards also show their own warning
  (dirt rumble, "!" mound, pollen shadow) before they can hurt.
- **Attacks:**

| Attack | Phases | How to dodge |
| --- | --- | --- |
| Seed Spit: lobbed seeds aimed where Pip is heading | 1-3 | keep moving |
| Petal Fan: a fan of spinning petals | 1-3 (double volley in 3) | slip between them or jump |
| Vine Sweep: a vine slithers along the ground | 2-3 | jump over it or stand on a leaf |
| Pollen Rain: pollen balls fall on shadowed spots | 2-3 | step off the shadow |
| Root Pop: roots burst up under Pip | 3 | step away from the "!" |

- **Results:** the win screen gives 1-3 stars based on hits taken (0-1 = ★★★, 2-3 = ★★, 4+ = ★) and remembers
  your best time. The lose screen shows how far you got.

## How the code is organised

The game is split into a **simulation** that knows the rules and a **presentation** that shows them.

```
keyboard / gamepad / touch ─► Controls ─► App ──step(input)──► Fight (src/sim)
                                           │                      │ events
                                           │◄─────────────────────┘
                                           ├─► presentation.ts ─► sound, particles, shake, toasts
                                           └─► Phaser scenes read the Fight every frame and draw it
```

| Path | What it does |
| --- | --- |
| `src/sim/` | The game itself in plain TypeScript: no Phaser, no browser, no `Math.random`. Runs in tests as it runs in the game |
| `src/sim/fight.ts` | `Fight`: one boss fight. `step(input)` advances exactly 1/60 s; `drainEvents()` reports what happened |
| `src/sim/player.ts` | Pip: movement, jump, shooting, hurt and invulnerability |
| `src/sim/boss.ts` | What every boss shares: health, three phases, the intro, the attack scheduler |
| `src/sim/bosses/` | One file per boss (`sunny.ts`) and the registry of all of them (`index.ts`) |
| `src/sim/hazards.ts`, `projectile.ts`, `pickups.ts`, `arena.ts` | Vine, root and pollen; seeds and petals; the dewdrop; the leaf platforms |
| `src/sim/events.ts` | The list of things the simulation announces (`jump`, `bossHit`, `phase`, ...) |
| `src/presentation.ts` | The one table that turns each event into a sound, particles, a shake or a toast |
| `src/app.ts` | Screen flow (title, pause, mute, win, lose) and the fixed-step loop. Knows nothing about Phaser |
| `src/controls.ts`, `src/gamepad.ts` | Keyboard, touch and gamepad merged into one input per step |
| `src/audio.ts` | Synthesized sound effects and music |
| `src/save.ts` | Easy mode, mute and best times in one versioned `localStorage` entry |
| `src/game/art/` | `draw.ts`: Canvas 2D path helpers and the shared face. `bake.ts`: turns drawings into textures |
| `src/game/views/` | One view per thing on screen. Each file bakes its own parts and animates them from the simulation |
| `src/game/scenes/` | `BootScene` (font, baking), `FightScene` (syncs views every frame), `HudScene` (hearts, boss bar, toasts) |
| `src/game/fx.ts`, `debug.ts` | Particles and screen shake; the hitbox overlay |
| `index.html`, `src/style.css`, `src/ui/` | The HTML cards (title, win, lose, pause) and touch buttons layered over the canvas |
| `tests/` | Simulation tests, bot fights, and tests for the save, gamepad and music code |

Fight states: `title → play → ending (slow-mo bloom) → win`, or `play → down (Pip naps) → lose`.

### Things to know before changing it

- **Positions are always in the 960×540 world.** Phaser renders at 1920×1080 and every camera zooms by `RES`
  (2), so nothing in the simulation or the views deals with screen pixels.
- **Baked parts are shown at scale `INV`** (1/`RES`). When a view scales a part it multiplies:
  `petal.setScale(INV * 1.2, INV)`.
- **The simulation steps at a fixed 60 Hz** however fast the screen is. Every object keeps its previous position
  (`px`, `py`), and views draw `lerp(px, x, alpha)` so motion stays smooth on any display.
- **Randomness in the simulation comes from `fight.rng`**, which is seeded. The same seed and inputs replay the
  same fight. A test fails if `src/sim/` uses `Math.random`, Phaser or the DOM.
- **The simulation never draws or plays anything.** It calls `fight.emit({ type: ... })` and
  `src/presentation.ts` decides what that looks and sounds like.
- **Phaser 4 is not Phaser 3.** Most examples online are for v3 and some of its API is gone (`setTintFill`,
  `Geom.Point`). Phaser ships its own notes per topic in `node_modules/phaser/skills/*/SKILL.md`; read the
  relevant one before using an API.

## Extending

**Add a boss attack.** In `src/sim/bosses/sunny.ts`, write a generator method. `yield <seconds>` waits,
`this.warn(t)` shows the "!" telegraph, and the attack must end with `this.endAttack()`. Then add its name to
`ATTACKS`, and to `POOLS` for the phases that should use it:

```ts
*leafBoomerang(): Attack {
  this.warn(0.6);
  yield 0.6;
  // push a Projectile into this.fight.projectiles, or a hazard into this.fight.hazards;
  // use this.fight.rng for anything random
  yield 1.0;
  this.endAttack();
}
```

**Add a hazard.** Write a class in `src/sim/hazards.ts` that implements `Hazard`, and add its `kind` to the
interface. `shape()` returns the area that hurts right now and must return `null` while the warning is showing
(a kids' game should never hurt without warning). Then give it a view in `src/game/views/EntityViews.ts`: bake
its parts in `bakeEntities`, write a view class, and add it to the factory in `HazardViews`.

**Add a sound or an effect.** Add an event to `src/sim/events.ts` and emit it from the simulation. TypeScript
then points at `present()` in `src/presentation.ts` until the new event has a case there. A new sound is a
name in `SfxName` plus a recipe in `src/audio.ts`.

**Add a boss.** Write `src/sim/bosses/<name>.ts` extending `Boss` (its movement, hurtboxes and attacks) and
add it to `src/sim/bosses/index.ts`. TypeScript then asks for its view in `src/game/views/bossViews.ts`. The
toasts in `src/presentation.ts`, the lose text in `src/ui/overlay.ts` and the cards in `index.html` still
name Sunny, and the game always starts the `sunny` fight: choosing a boss needs a level-select screen.

**Tune difficulty.**

- Boss HP: the number passed to `super(fight, 400)` in `src/sim/bosses/sunny.ts`.
- Boss pacing: `idleTime` (pause between attacks) and `speedMuls` (projectile speed) per phase, in the same file.
- Pip's movement, jump and fire rate: the constants at the top of `src/sim/player.ts`.
- Invulnerability after a hit: `hurt()` in `src/sim/player.ts`.

**Replace the code-drawn art.** Every picture is a texture made by a `bake(...)` call with a key such as
`pip-body` or `sunny-petal-0`. Load an atlas that provides the same keys in `BootScene` instead of baking
them, and the views keep working. `part()` in `src/game/art/bake.ts` is where the origin and scale of each
part are set.

## Tests

`npm run check` type-checks the app, type-checks `src/sim/` a second time without browser types, runs the
tests and checks formatting.

The simulation tests compare this version with the original vanilla-JS game, using
`tests/fixtures/legacy-baseline.json`. That file was recorded from the original by a script; both were removed
once the port was verified and are still in git history (commit `0bdffb0`). The fixture holds:

- Pip's position for 689 frames of scripted input, which this version replays frame for frame;
- what each attack spawns, and when, in every phase;
- how long an invulnerable Pip takes to win when every shot hits the face (40.8 s);
- how long a Pip who never moves survives, averaged over many fights.

A fight needs no browser, which makes balancing with a bot quick:

```ts
const fight = new Fight({ seed: 1 });
while (fight.state === 'play') fight.step({ ...NO_INPUT, shoot: true, up: true });
console.log(fight.fightTime, fight.player.hp);
```

**In the browser**, open the game with `?debug` to get `window.sprout`. `step(n)` runs `n` whole frames
without `requestAnimationFrame`, so it also works in background tabs and scripts (in a hidden tab, call it
once before anything else so the scenes start):

```js
const S = window.sprout;
S.startGame(); S.step(120);                // skip the "Ready? GO!" intro
S.input.shoot = S.input.up = true;         // hold shoot + aim up
S.step(60 * 10);                           // simulate 10 seconds
console.log(S.game.boss.hp, S.game.player.hp, S.game.state);
```

Add `?hitboxes` (or call `S.hitboxes(true)`) to draw what the simulation actually collides with.

## Ideas for later

- A second boss (e.g. a cactus or a mushroom) and a small level-select map.
- A dash or a "Sunshine Super" meter that fills with hits.
- Hand-drawn sprite sheets and recorded sound to replace the code-drawn placeholders.
- An installable, offline version (PWA) for tablets.
