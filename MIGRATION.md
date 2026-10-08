# Migrate "Sprout & the Grumpy Sunflower" to TypeScript + Vite + Phaser 4

## Context

The game is about 1,000 lines of vanilla JavaScript on Canvas 2D, with no build step, types or tests. It plays well, but everything on its own roadmap (second boss, level select, sprite art, recorded sound) needs scenes, an asset pipeline and code that can be changed safely. This plan moves it to TypeScript + Vite + Phaser 4, keeps how it plays today, and leaves it organised so that a second boss is one new file.

You said improvements are fine as long as the game stays good and fun, so the target is the same feel and balance, not a pixel-identical copy.

## Approach

The game is split into two layers:

- **Simulation** (`src/sim/`): plain TypeScript with no Phaser and no browser APIs. It holds movement, boss attacks, collisions, and the win and lose rules. This is today's gameplay code with the drawing and sound calls taken out, so the tuned feel carries over and it can be tested from the command line.
- **Presentation** (Phaser): scenes, sprites, particles, audio, input and scaling. It draws what the simulation says and reacts to events the simulation emits.

```ts
const fight = new Fight({ boss: 'sunny', easy, seed });
fight.step(input);                                // advances exactly 1/60 s
for (const e of fight.drainEvents()) present(e);  // sound, particles, shake, toast
```

## Key decisions

| Topic | Choice | Why |
| --- | --- | --- |
| Physics | Keep the game's own movement and hit tests; no Arcade Physics for now | The tuned jump and hitboxes carry over unchanged and run in tests without a browser. This differs from what I suggested earlier: Arcade only pays off if scrolling levels are added, and can be adopted then. |
| Art | Keep the current look. Run the existing canvas drawing code once at startup to bake sprite textures, then animate those parts with Phaser | No art files exist yet. Replacing the bake step with an atlas load later swaps in drawn art without touching the views. |
| Menus | Keep the HTML/CSS cards and touch buttons, layered over the Phaser canvas | They already work and scale; `index.html` and `style.css` barely change. |
| Resolution | Phaser renders at 1920×1080 with camera zoom 2; gameplay units stay 960×540 | Sharp on tablets and retina screens, and no gameplay constant needs retuning. |
| Timing | Simulation runs at a fixed 60 steps per second; views interpolate between steps | Jump height and timings are the same at any frame rate, and fights are reproducible. |
| Particles | Port the 30-line particle system onto pooled Phaser images | Same look with no mapping loss; Phaser's emitters stay available for new effects. |
| Versions | phaser 4.2.1, vite 8.3, typescript 7.0, vitest 5.0, prettier 3.9, @fontsource/fredoka 5.3 | Current on npm as of 2026-10-08. The installed Node 24 satisfies all of them. |

## Target layout

| New path | Comes from | Holds |
| --- | --- | --- |
| `index.html` | `index.html` | Cards and touch buttons as today; `<canvas>` becomes `<div id="game-root">`; Google Fonts link removed |
| `src/main.ts`, `src/app.ts` | `js/main.js` (`startGame`, `setPaused`, `toggleMute`, card code) | Boot and screen flow |
| `src/config.ts` | `js/utils.js` constants | `W`, `H`, `GROUND`, `ARENA_R`, `STEP`, `RES` |
| `src/sim/math.ts` | `js/utils.js` (`clamp`, `circleHit`, `rectCircleHit`, `qbez`, `prune`) | Math and hit tests |
| `src/sim/rng.ts`, `events.ts` | new | Seeded random numbers; the `SimEvent` type |
| `src/sim/player.ts` | `js/player.js` (`update`, `hurt`, `hitbox`) | Pip |
| `src/sim/projectile.ts`, `hazards.ts`, `pickups.ts` | `js/entities.js` (`update`, `hits`) | Seeds, vine, root, pollen, dewdrop |
| `src/sim/boss.ts` | `js/boss.js` (hp, phases, generator scheduler, `warn`, `endAttack`) | What any boss needs |
| `src/sim/bosses/sunny.ts` | `js/boss.js` (sway, `stemBox`, `spit`, five attacks, `POOLS`) | Everything specific to Sunny |
| `src/sim/arena.ts` | `js/world.js` `platforms` | Arena data |
| `src/sim/fight.ts` | `js/main.js` (`update`, `collide`, `resetFight`) | `Fight`: state machine, `step`, events |
| `src/presentation.ts` | `sfx`, `burst`, `shake`, `showToast` call sites across the legacy files | One table from sim event to sound, particles, shake and toast |
| `src/audio.ts` | `js/audio.js` | `tone`, sound recipes, music |
| `src/controls.ts` | `js/input.js` | Keyboard, touch and gamepad merged into one input frame |
| `src/ui/overlay.ts`, `touch.ts`, `layout.ts` | `js/main.js`, `js/touch.js`, `resize()` | Cards, touch pad, stage sizing and `--ui` |
| `src/save.ts` | `store` in `js/main.js` | Versioned save data |
| `src/game/createGame.ts`, `scenes/` | new | Phaser config; `BootScene`, `FightScene`, `HudScene` |
| `src/game/art/draw.ts` | `js/utils.js` (`circle`, `ellipse`, `roundRect`, `heart`, `sparkle`, `fillStroke`, `drawFace`) | Path helpers used for baking |
| `src/game/art/bake.ts`, `views/` | `draw()` bodies in `player.js`, `boss.js`, `entities.js`, `world.js` | Baked part textures and the views that animate them |
| `src/game/fx.ts` | `Particles` in `js/entities.js`, shake in `js/main.js` | Particles and screen shake |
| `tests/` | new | Sim tests, bot fights, legacy baseline |
| `legacy/` | the current `index.html`, `js/`, `css/` | Frozen original for comparison; deleted in M4 |

## Milestones

Each milestone ends with a local commit (no remote, no push) and an updated "Status" section in the README, so work can stop or change hands at any boundary. M1 and M2 steps 1–3 need the most design judgment; the rest follows patterns those steps establish.

### M0. Safety net (small)

1. `git init`, add `.gitignore`, commit the game as it is.
2. Move `index.html`, `js/` and `css/` into `legacy/`. `npm run legacy` serves it.
3. Add `tests/legacy-baseline.mjs`, a Node script that imports the legacy modules (none touch the DOM at import), seeds `Math.random`, and writes `tests/fixtures/legacy-baseline.json` with:
   - a frame-by-frame trace of Pip for a scripted input sequence (run, hop, full jump, both platform landings);
   - time to win for an invulnerable bot standing near x=570 holding shoot and aim-up (the README says about 42 s);
   - survival time of an idle player over 50 seeds, in phase 1 and with the boss forced to phase 3.

### M1. TypeScript + Vite + simulation, still drawn with Canvas 2D (large)

1. Tooling: Vite, TypeScript (strict), Vitest, Prettier. Scripts: `dev`, `build`, `preview`, `test`, `format`, and `check` (type-check, tests, format check). `vite.config.ts` uses `base: './'`. Copy the legacy modules into `src/` and confirm the unchanged game runs under `vite` before refactoring.
2. Port gameplay into `src/sim/` in dependency order, under these rules:
   - No drawing, sound, DOM or `Math.random` inside `sim/`. A second `tsconfig` without the DOM library and a test that scans for Phaser imports enforce it.
   - Each legacy `sfx.*`, `particles.burst`, `shake` and `showToast` call becomes `fight.emit(...)`.
   - Update order and constants stay as they are, so the Pip trace matches the baseline.
   - State that only affects looks and uses randomness (blink timers, projectile spin) moves to the views.
   - `Fight.step` saves each entity's previous position before updating, for interpolation.
3. Move the legacy `draw()` bodies into `src/canvas/*.js` as functions that take a sim object. They stay plain JavaScript because M2 deletes them.
4. `src/presentation.ts` maps every event to calls on a small `Presenter` interface (`sfx`, `burst`, `shake`, `toast`). M1 implements it with canvas; M2 swaps in Phaser and keeps the table.
5. Port the glue to TypeScript: `app.ts` (fixed-step `requestAnimationFrame` loop and screen flow), `ui/`, `controls.ts` (keyboard and touch), `audio.ts`, `save.ts`, and the `?debug` hook.
6. Tests: Pip trace equals the baseline; bot results within tolerance; one test per attack for spawn counts and timing; phase changes at 66% and 33%; invulnerability windows; one-way platforms; easy mode.

Done when `npm run dev` plays like `npm run legacy` and `npm run check` passes.

### M2. Phaser presentation (large)

1. Add `phaser` and `@fontsource/fredoka`. Create the Phaser game (`Scale.FIT` into `#game-root`, camera zoom `RES` centred on the 960×540 world), `BootScene`, and a `FightScene` that runs the fixed-step loop and draws a **hitbox overlay** only. The game is playable in Phaser from this step, and the overlay stays as a `?debug` feature.
2. `art/bake.ts` and `PlayerView` as the reference view. Parts are baked at 2x, and a `part()` factory creates each image at scale 1/`RES` with its recorded origin. The view assembles them in a container and animates from sim state (facing, squash, run cycle, leaf wiggle, recoil, blink, hurt flicker).
3. `SunnyView`: petals, head, face per mood, stem leaves, soil, warning bubble and hit flash, with the stem redrawn each frame along the same curve.
4. Remaining views: world (sky, sun, clouds, hills, trees, ground, platforms), projectiles, hazards and dewdrop.
5. `fx.ts`: particles and decaying screen shake, slowed by `fight.timeScale` during the win slow-motion.
6. `HudScene` as a parallel scene so shake doesn't move it: hearts, boss bar, toast, Ready/GO.
7. Wire the rest: audio through Phaser's audio context and master mute; `app.ts` and the DOM overlay driving the scenes (start, pause with `scene.pause`, auto-pause on blur and hidden tab, mute, win and lose cards).
8. Delete `src/canvas/`.

Done when a full session (title, fight, win, lose, pause, touch) works in Phaser and looks right next to `npm run legacy`, and `npm run check` and `npm run build` pass.

### M3. Improvements (small, one commit each)

- **Gamepad:** stick or d-pad to move, A to jump, X or right trigger to shoot, up to aim, Start to pause.
- **Jump buffering:** a jump pressed up to 0.1 s before landing still happens.
- **Music timing:** notes scheduled on the audio clock instead of `setInterval`.
- **Save data:** one versioned object with a best time per boss; it imports the three existing `sprout.*` keys so nothing is lost.

### M4. Cleanup (small)

- Delete `legacy/` and the baseline script; the fixture file stays as the reference.
- Rewrite the README: run, build, test, code map, and how to add an attack, hazard, effect or boss.

## What will be different for players

- Movement and timings no longer depend on frame rate.
- Gamepad support and jump buffering.
- Steadier music timing.
- The font ships with the game, so there is no request to Google Fonts.

Everything else is meant to play and look the same.

## Not in this plan

- New art, recorded audio, a second boss, level select, dash or super meter.
- Offline install (PWA), deployment, browser smoke tests in CI.

## Verification

- **Every milestone:** `npm run check`.
- **Feel:** the Pip trace test shows movement is unchanged; the bot tests show damage in both directions stays in the same range as the legacy game.
- **In a browser (M1 and M2):** drive the game through Chrome and confirm the console is clean while going through title, win, lose, pause by key, button and tab switch, mute and easy mode surviving a reload, touch layout in device emulation, and window resizing. Compare screenshots against `npm run legacy` at the title, mid-fight and win.
- **Scripted:** `/?debug` keeps `window.sprout.step(n)`, so the README's ten-second simulation snippet still works.
- **Build:** `npm run build && npm run preview` runs from `dist/`. Expect roughly 380 KB of gzipped JavaScript, up from 17 KB.

## Risks and fallbacks

- **TypeScript 7 with Phaser's types** is untested here. `skipLibCheck` is on; if type-checking still fails, pin `typescript@~5.9`.
- **Vite 8 bundles with Rolldown.** The official Phaser template targets Vite 6, so its Vite config is not copied.
- **Phaser 4 differs from Phaser 3** in ways models often get wrong (`setTintFill` is gone, `Phaser.Math.TAU` changed meaning). The package ships a doc per subsystem at `node_modules/phaser/skills/*/SKILL.md`; read the relevant one before using an API.
- **`Scale.FIT` needs a parent with a real size.** `#game-root` fills `#stage`, which `layout.ts` sizes as `resize()` does today.
- **Canvas text needs the font first.** `BootScene` waits for `document.fonts.load` before baking or creating text, and text objects use `resolution: 2`.
- **Thick Graphics strokes** may show joints on the stem. The fallback is a Phaser `Rope` with a baked stem texture.
