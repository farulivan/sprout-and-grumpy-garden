# Sprout & the Grumpy Garden 🌱🌻

A cute, kid-friendly run 'n gun game in the style of Cuphead and Mega Man, themed around plants. Little
**Pip** the sprout cheers up the garden's grumpy plants by showering them with seeds: the small ones along a
scrolling stage, then its boss.

The game is named after the garden and each chapter after its boss. So far there is one chapter, **The
Grumpy Sunflower**: walk the Garden Path to Sunny's meadow, then win by emptying **Sunny**'s bar without
losing all your hearts.

Built with TypeScript, Vite and Phaser 4. There are still no art or sound files: every picture is drawn in
code when the game starts, and every sound is synthesized with WebAudio.

## Run it

```bash
pnpm install
pnpm dev        # play at http://localhost:5173
pnpm build      # static site in dist/; upload that folder to any static host
pnpm preview    # serve dist/ locally to check the build
pnpm check      # type-check, tests and formatting; run it before committing
```

Needs Node 22 (22.12 or newer) or Node 24, and [pnpm](https://pnpm.io). The pnpm version is pinned in
`package.json`; run `corepack enable` once and the right one is fetched for you. pnpm is the only package
manager for this project: `pnpm-lock.yaml` is the one lockfile, npm refuses to install here, and other
managers' lockfiles are ignored by git so a second one can never be committed.

## Putting it online

`pnpm build` writes a static site to `dist/`: an `index.html` and an `assets/` folder. Any static host
serves it; where the host builds for you, the build command is `pnpm build` and the output folder is `dist`.

The game has no server, no account and no cookie, and its page asks for nothing outside its own folder
(the font is bundled), so it works at the top of a domain or in any subfolder. A host can still add things
of its own to the pages it serves; what this one adds is listed under "On Cloudflare". File names in
`assets/` are made from their contents, so they can be cached for good, and the engine has a file of its
own that only changes when Phaser is upgraded: after an update to the game, returning players fetch about
40 kB, not the whole 400 kB. `index.html` is the one file that must not be cached for long.

### More than one version online

To keep an old version playable beside a new one, build each from its own tag or branch and give each its
own site.

- **On separate domains** (`v1.example.com` and `v2.example.com`, or two projects on a host that gives
  each its own address) the copies cannot see each other. There is nothing to set.
- **In two folders of one domain** (`example.com/v1/` and `example.com/v2/`, or two project sites on
  GitHub Pages, which share `you.github.io`) both run, but they share one save, because a browser keeps
  one `localStorage` per domain: easy mode, mute and best times set in one show up in the other. To give
  a copy a save of its own, build it with a slot: `VITE_SAVE_SLOT=v2 pnpm build` stores under
  `sprout.save.v2` and touches nothing else. Builds from before this option existed always use the main
  save, so give the slot to the newer copy.

Build each version with the tools it was written with. Up to tag `v1.0.0` (commit `06e2972`), the last
one before the visual overhaul, that is npm (`npm ci && npm run build`); from the overhaul on, tag
`v2.0.0`, it is pnpm. Most hosts pick the right one from the lockfile. The older version does not say
which Node it needs (the newer one does, in `.nvmrc`): if its build fails on a host, set that site's Node
version to 22 or 24.

### On Cloudflare

The game is hosted on Cloudflare as two Workers that serve only files, which is free with no limit on
visits. Each has a subdomain of its own, so their saves stay apart:

| Address                   | Worker      | What                             | How it gets there                         |
| ------------------------- | ----------- | -------------------------------- | ----------------------------------------- |
| `sprout.farulivan.com`    | `sprout`    | the game, from `main`            | Cloudflare builds and deploys every merge |
| `sprout-v1.farulivan.com` | `sprout-v1` | the first version, tag `v1.0.0`  | uploaded once by hand                     |

**The game.** `wrangler.jsonc` says what the site is (the `dist/` folder), what the Worker is called and
which address it answers on, and `public/_headers` sets the caching described above. The build is set up
once in the Cloudflare dashboard, under the Worker's **Settings → Build**, and these values live only
there:

| Setting         | Value                                                            |
| --------------- | ---------------------------------------------------------------- |
| Git branch      | `main`                                                           |
| Build command   | `corepack pnpm install --frozen-lockfile && corepack pnpm build` |
| Deploy command  | `./node_modules/.bin/wrangler deploy`                            |
| Preview command | `./node_modules/.bin/wrangler preview`                           |
| Build variable  | `SKIP_DEPENDENCY_INSTALL` = `1`                                  |

They differ from Cloudflare's defaults for two reasons. Its builder comes with an older pnpm than the one
pinned here and would install with that, so the variable turns its own install off and the build command
fetches the pinned pnpm through Corepack instead. And its default commands start with `npx`, which this
project refuses (see "Run it"), so they call the installed wrangler directly.

With **Enable Preview Builds** ticked there, every pull request is built too and gets an address of its
own to try the change at. Those addresses are public.

To serve a build locally the way Cloudflare will, headers included: `pnpm build && pnpm exec wrangler dev`.

**The first version** never changes, so nothing builds it automatically. To upload it:

```bash
git worktree add ../sprout-v1 v1.0.0 && cd ../sprout-v1
npm ci && npm run build
npx wrangler@4 deploy --name sprout-v1 --assets ./dist --compatibility-date 2026-10-01 \
  --domain sprout-v1.farulivan.com
```

**What the domain adds.** Two settings of `farulivan.com` each put a small script on every page it serves,
on both sites. They are Cloudflare's, not the game's, and nothing in this repo switches them on or off:

- **Web Analytics** counts visits and measures loading. Its script comes from
  `static.cloudflareinsights.com` and reports each page view to `/cdn-cgi/rum` on the same domain: the
  page's address, how long it took to load, and the browser and system version. It sets no cookie and
  keeps nothing in the browser. The figures are in the Cloudflare dashboard under **Web Analytics**, and
  **Manage Site** there switches it off.
- **The bot check** (Cloudflare calls it JavaScript Detections; with Bot Fight Mode it is always on) runs a
  short test from `/cdn-cgi/challenge-platform/` to tell browsers from bots, and keeps the result in a
  `cf_clearance` cookie on `.farulivan.com`. The check itself never blocks or challenges a visitor. It is
  set for the whole domain, under **Security Settings → Bot traffic**, and cannot be left out for these
  two addresses alone.

Both were checked on the live site in October 2026 and deliberately left on: the first shows how many
people play each version, and the second guards the rest of the domain.

## The opening and the menu

The game opens the way cartoons and console games of old did, in about nine seconds, and any key, click,
tap or button skips straight to the title:

1. **The studio's sting**, on the loading screen's cream paper: "farulivan" pops in letter by letter, one of
   Pip's seeds drops onto the i, bounces, and sprouts as its dot, and "presents" fades in.
2. **The cold open.** An iris opens from the sprout onto Pip's yard at dawn. The camera starts close on the
   sky as the sleepy sun rises and the last stars go out, then pulls back onto the yard as the morning
   light comes and the flowers along the path open. The cottage door swings open, Pip hops out, and the
   logo drops in: its first line falls, the second stamps down under it, and a sprout grows out of the
   first.
3. **The title**, held until a press: "Press any key" ("Tap to start" on a touch screen, "Press Start" with
   a gamepad). Pip waits on the path, now and then hopping, strolling, or cheering.
4. **The main menu**: a signpost by the path, with boards for **Play**, **How to play** (the controls),
   **Options** (sound, music and effects volumes, Easy mode) and **Credits**. Play sends Pip running off
   down the path, an iris closes on him, and the stage opens on him the same way, with the chapter's title
   over its name.

The yard is Pip's home, not any boss's, so it stays the title however many chapters the game gets.

**The opening is silent on a first visit, on purpose.** A browser lets a page play sound only after the
player has pressed a key, clicked or tapped, so the press that passes the title is where the sound begins:
a chime, then the title's tune. If the browser already allows sound (some do for sites people come back
to), the opening has its sounds too. A gamepad's buttons don't count as such a press, so after Start on a
gamepad a note under the signpost says that sound starts with any key or tap. Don't add a second "click to
begin" screen before the sting: Press any key already is that click.

## Controls

| Action | Keyboard | Gamepad | Touch (tablet/phone) |
| --- | --- | --- | --- |
| Move | ← → or A D | left stick or d-pad | ◀ ▶ buttons (bottom left) |
| Jump (hold = higher) | Space, Z or K | A | the smaller button, up and to the right of Shoot |
| Shoot | hold X, J or L | hold X, RB or RT | hold the big seed button (bottom right) |
| Aim diagonally up | hold ↑ or W | stick or d-pad up | no aiming: seeds fly straight |
| Pause / resume | P or Esc | Start | ⏸ button |
| Sound on/off | M | | 🔊 button |
| Back, on a menu page | Esc or Backspace | B | the Back button |

How to play keeps this short: one key for each of the four actions (Move ←→, Jump Space, Shoot X,
Aim ↑), or a gamepad's or touch screen's own buttons once the game sees one. Everything else in the table
still works; it is just not listed there, and pause and sound have buttons on screen during play.

On a touch screen the buttons are icons, as in other mobile action games: arrowheads, an arrow up, and one
of Pip's seeds. Shoot is the biggest, as the main action. A thumb can slide from button to button without
lifting, and resting it between Shoot and Jump presses both, to jump while shooting. There is no aiming on a
touch screen: Sunny's face is still in reach of a straight seed from the high leaf.

The pause card has **Keep playing**, **Start over** (the stage or the boss fight again from its start, with
the same Easy setting, for one of Pip's lives) and **Main menu** (back to the signpost, where Easy mode can
be changed in Options). The win card and the Game over card have a Main menu button too.

Every card works the same way: click or tap a button, or choose one with the arrow keys, the d-pad or the
stick and press it with Space, Enter or A. With nothing chosen, Enter or Start presses the card's main button
(Play, Try again, Play again, Keep playing, or Back on a menu page), and so does Space or A on the menu and
pause cards. On a volume slider, ◀ ▶ turn it instead of moving off it. A menu page opens on its first
control, and going back returns to the board that opened it. Pausing from the keyboard or a gamepad starts
on Keep playing, so pressing A or Space right away just resumes.

Face shots do 2 damage; stem shots do 1. The game auto-pauses when the tab loses focus.
With ← and → both held, the one pressed last wins, so turning round never stops Pip. Some keyboards can't
send certain three-key combinations at all (arrows with Space is a common one), and the game never sees the
third key. If a key seems to drop out, try the other keys in the table (A D, W, K or Z, J or L).
**Easy mode** (a checkbox in Options and on the lose card) gives 8 hearts instead of 5. With only a keyboard,
Tab to it and press Space, or move to it with the arrow keys. A gamepad reaches it with the d-pad and ticks it
with A. Enter or Start never ticks it, so on the lose card it starts the game right after.
A jump pressed a moment before landing still counts, and so does one pressed a moment after walking off an edge.

## How the stage works

Play starts **Stage 1, the Garden Path**: about 7,300 px of garden (7½ screens) from the cottage gate to
Sunny's meadow, a minute or two of walking. Sunny's mood has spread to the little plants along it, and each
one Pip cheers up pops into petals and leaves a flower where it stood. Sunny stands on the horizon all the
way, growing as Pip gets closer, and the bar at the top shows how far along the path Pip is.

- **On to Sunny:** walking through his gate clears the stage, and Pip goes into the boss fight with the
  hearts he has left. There is no other way to him: every game walks the path, as in Mega Man, where a new
  try at a stage never skips it.
- **Lives:** a game has three, as in Super Mario Bros., shown by Pip's head under the hearts. Losing a level
  costs one, and so does Start over. While Pip has lives left, Try again restarts the level that was lost:
  the stage from its start, or Sunny at his gate with full hearts, so the gate is a checkpoint. With the last
  life gone it's Game over, and Start again begins a new game from the first stage. Easy mode has the same
  lives.
- **Small enemies:** each one teaches something Sunny will test. None comes from behind, there are at most
  three on screen, and every attack is announced by the same orange "!" as Sunny's.

| Enemy | What it does | Seeds to cheer it up |
| --- | --- | --- |
| Grumbud, a flower bud on root feet | waddles along the ground or a leaf pad and turns back at its edges | 2 |
| Puffball, a dandelion clock | drifts over and hangs just above Pip's head, in front of him: aim up | 1 |
| Pea Pod | swells under a "!" for 0.9 s, then spits a pea at chest height: hop over it | 3 |
| Snapper, a snapdragon in a mound | seeds bounce off the mound; it rumbles under a "!" for 0.8 s, then snaps up for 0.7 s | 2, while it is up |

- **Obstacles:** logs to hop over (seeds fly over them), thorns that hurt to touch, one-way leaf pads, and
  pits. A fall into a pit costs a heart, even while Pip is still flashing from a hit, and he comes back on
  the last safe ground. A fall on his last heart ends the run.
- **Pickups:** two dewdrops, a heart each (the second on a leaf pad just before the gate), and three
  **golden seeds**: one in plain sight, one over the higher leaf pad and one over the pit. They fill the
  slots under the hearts, and every third one flies up and heals a heart, as a dewdrop does. Then the count
  starts again. At full hearts a set fills nothing and says "Hearts already full", just as a dewdrop does.
- **Results:** the lose card says how far along the path Pip got, and a win over Sunny adds the stage's time
  to the win card. The save keeps the stage's best time, ready for a level map.

It is a warm-up for Sunny. The bot from `docs/future-improvements.md` ("About the numbers"), playing at a
young child's reaction time (0.6 s), clears it every time and is hurt about once in two runs.

## How the fight works

- **Phases:** Sunny has 400 HP and three phases (at 66% and 33%). Each phase change roars, gives 1.4 s of
  invulnerability, drops a healing **Dewdrop** 💧, recolors his petals, and unlocks harder attacks. Seeds
  that hit him while he can't be hurt (then, and during "Ready? GO!") bounce off with a *tink*.
- **Telegraphs:** every attack starts with a "!" bubble and a chime. Ground hazards also show their own warning
  (a rumbling mound, cracks in the ground, an orange ring with a beam of light) before they can hurt.
- **Attacks:**

| Attack | Phases | How to dodge |
| --- | --- | --- |
| Seed Spit: lobbed seeds aimed where Pip is heading | 1-3 | keep moving |
| Petal Fan: a fan of spinning petals | 1-3 (double volley in 3) | slip between them or jump |
| Vine Sweep: a vine slithers along the ground | 2-3 | jump over it or stand on a leaf |
| Pollen Rain: pollen balls fall on ringed spots | 2-3 | step off the ring |
| Root Pop: roots burst up under Pip | 3 | step away from the "!" |

- **Results:** the win screen gives 1-3 stars based on hits taken (0-1 = ★★★, 2-3 = ★★, 4+ = ★) and remembers
  your best time. The lose screen shows how far you got.

## How it looks

There are no image files. Every picture is drawn in code at startup, and these rules keep it reading as
one world:

- **Depth.** The garden is layered from far to near: sky, mountains, wooded hills, a meadow with the path
  Sunny is blocking, trees, the fence, the turf the fight stands on, and out-of-focus grass in front. The
  layers slide a little as Pip crosses the arena.
- **Background soft, characters bold.** Far things are pale, hazy and have no outlines. Pip, Sunny and
  everything that can hurt have dark outlines and strong colour, so they stand out from any backdrop.
- **One light.** The sun hangs top left, so highlights sit on the upper left of things and shadows on the
  lower right.
- **The weather follows Sunny's mood.** A clear morning while he sleeps or is only a little grumpy, clouds
  rolling in for phase 2, a stormy dusk for phase 3, and the sun bursting back out with a rainbow (and the
  garden blooming) once he is cheered up.
- **Warnings speak one language.** An attack is announced by an orange "!" (the bubble over Sunny, a badge
  over the ground) or an orange ring where something will land. Things thrown at Pip carry a pale halo.
  The one helpful thing, the dewdrop, glows blue and sends out rings.
- **Nothing covers the fight.** The only scenery drawn in front of it sits below the line everyone stands on.
- **The stage is the same garden, walked.** Its layers repeat and slide past at their own speeds (the far
  hills barely move, the fence hurries by), Sunny grows on the horizon as Pip gets closer, and every plant he
  cheers up leaves a flower behind.
- **The title is Pip's yard, and belongs to no boss.** It is made from the path's and the arena's own parts
  (the sky, the far hills, the cottage, hedges and fence), with the dawn as a weather of its own. Its
  opening is staged like a cartoon's: an iris in, a camera move, things that drop, squash and settle, and an
  iris out on Pip. Each moment is worked out from how far into the opening the yard is, so a skip lands
  everything in its final place. People who ask their device for less motion get fades instead.

## How the code is organised

The game is split into a **simulation** that knows the rules and a **presentation** that shows them.

```
keyboard / gamepad / touch ─► Controls ─► App ──step(input)──► Fight, Stage or Yard (src/sim)
                                           │                      │ events
                                           │◄─────────────────────┘
                                           ├─► presentation.ts ─► sound, particles, shake, toasts
                                           └─► Phaser scenes read the level every frame and draw it
```

| Path | What it does |
| --- | --- |
| `src/sim/` | The game itself in plain TypeScript: no Phaser, no browser, no `Math.random`. Runs in tests as it runs in the game |
| `src/sim/fight.ts` | `Fight`: one boss fight. `step(input)` advances exactly 1/60 s; `drainEvents()` reports what happened |
| `src/sim/player.ts` | Pip: movement, jump, shooting, hurt and invulnerability. He asks the level he is in for its edges, platforms and projectile list (`PlayerWorld`), so he isn't tied to a boss fight |
| `src/sim/level.ts` | What the views need from the level being played (`Level`); `Fight` is one |
| `src/sim/yard.ts` | `Yard`: Pip's yard behind the opening, the title and the menu. Its beats (`sting`, `intro`, `press`, `menu`, `leave`), the opening's timings, and the real Pip walked by a script: out of the door, idle hops and strolls, and off down the path after Play |
| `src/sim/boss.ts` | What every boss shares: health, three phases, the intro, the attack scheduler |
| `src/sim/bosses/` | One file per boss (`sunny.ts`) and the registry of all of them (`index.ts`) |
| `src/sim/hazards.ts`, `projectile.ts`, `pickups.ts`, `arena.ts` | Vine, root and pollen; seeds and petals; the dewdrop; the leaf platforms |
| `src/sim/events.ts` | The list of things the simulation announces (`jump`, `bossHit`, `phase`, the opening's `cue`s, ...) |
| `src/sim/stage/stage.ts` | `Stage`: one scrolling stage, the way `Fight` is one boss fight. Ground in solid boxes with pits between, logs, thorns, leaf pads, the camera, pickups and the gate, and the rules that advance it |
| `src/sim/stage/enemies/` | The small enemies a stage places (Grumbud, Puffball, Pea Pod, Snapper), one file each, and their registry (`index.ts`) |
| `src/sim/stage/stages/` | The stages, as data: where everything goes. `gardenPath.ts` is Stage 1 |
| `src/presentation.ts` | The one table that turns each event into a sound, particles, rings, a shake, a flash or a toast |
| `src/app.ts` | Screen flow (the opening, the title and the menu in the yard; pause, mute, win, lose; a stage, then its boss through the stage's gate; three lives a game), the chapter (`CHAPTER`), the fixed-step loop and hit-stop. Knows nothing about Phaser |
| `src/controls.ts`, `src/gamepad.ts` | Keyboard, touch and gamepad merged into one input per step |
| `src/audio.ts` | Synthesized sound effects and music, each on a bus with its own volume |
| `src/save.ts` | Easy mode, mute, the music and effects volumes, and the best time for each boss and each stage, in one versioned `localStorage` entry (or in a slot of its own: see "More than one version online") |
| `src/game/art/` | `draw.ts`: Canvas 2D paths, gradients and shading helpers. `face.ts`: the small shared face. `color.ts`: colour maths and the shared outline pens. `bake.ts`: turns drawings into textures, packs them into an atlas, and bends one along a curve (`Ribbon`). `shared.ts`: parts several views use |
| `src/game/views/` | One view per thing on screen. Each bakes its own parts and animates them from the simulation: `PlayerView`, `SunnyView`, `ProjectileViews`, `HazardViews`, `PickupViews`, `WorldView`, and on a stage `EnemyViews` (parts in `enemies/art.ts`). `pool.ts` reuses the views of things that come and go |
| `src/game/views/title/` | Pip's yard (`YardView`), the logo in parts (`Logo`), the studio's sting (`Sting`), and their art (`art.ts`) |
| `src/game/views/Iris.ts` | The round hole that opens on a scene and closes on it, as old cartoons do: the title's, and each stage's start |
| `src/game/views/stage/` | A stage's world: `StageWorldView` (the sky that stays put, landscape strips that repeat and slide by how far away they are, the ground with its pits, logs, thorns and leaf pads, the sign, the gate, and the flowers cheered-up plants leave) and its parts (`art.ts`) |
| `src/game/views/world/` | The arena, one file per layer: `sky.ts`, `land.ts`, `ground.ts`, `air.ts`, and `weather.ts`, which blends between the moods (Sunny's four, and the title's dawn) |
| `src/game/views/sunny/`, `hazards/` | The bigger views keep their drawing code beside them: Sunny's parts (`art.ts`) and layered face (`face.ts`), the hazards' parts (`art.ts`) |
| `src/game/scenes/`, `src/game/hud/` | `BootScene` (font, baking), `TitleScene`, `FightScene` and `StageScene` (sync the views every frame; only the one for what is being played runs; `TitleScene` also stages the opening), `HudScene` (hearts, the boss's bar or the stage's path bar and golden seeds, toasts, the chapter and stage names); `hud/art.ts` bakes the HUD's parts |
| `src/game/fx.ts`, `motion.ts`, `debug.ts` | Particles, rings, the screen flash, shake and camera punch; small helpers for moving things (`rand`, `easeOutBack`); the hitbox overlay |
| `index.html`, `src/style.css`, `src/ui/` | The loading screen, the HTML cards ("Press any key", the signpost and its pages, win, lose, pause) and the touch buttons layered over the canvas |
| `tests/` | Simulation tests (the boss fight and the stages), bot fights, and tests for the save, gamepad, music and weather code and for moving between a card's buttons |

Yard beats: `sting → intro → press → menu → leave` (any press during the first two skips to `press`).
Fight states: `play → ending (slow-mo bloom) → win`, or `play → down (Pip naps) → lose`. Stage states:
`play → clear (Pip walks through the gate) → exit` (on to the boss), or `play → down → lose`.

A new level replaces the old one rather than resetting it. The game opens on a `Yard` at its sting. Play
(once Pip has run off), Play again and Start again make the chapter's stage (`CHAPTER` in `src/app.ts`) and
give Pip all his lives (`LIVES`); its gate makes the boss fight with the hearts Pip has left; Try again and
Start over make the level being played again (a boss fight with full hearts) for a life, or a new game when
none are left; and Main menu makes a `Yard` straight at its menu.

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
  `src/presentation.ts` decides what that looks and sounds like. A few of its fields exist only so the
  views can draw (`player.aimUp`, `player.recoil`, `boss.attackName`, `boss.puff`...); they never feed back
  into the rules.
- **Views do the acting.** The simulation says where things are and what just happened. A view adds what
  the rules don't need: Sunny's head recoiling from a hit, Pip's sprout trailing behind a run, the wind-up
  before an attack. That state lives in the view and uses `Math.random` freely.
- **Small parts share one atlas texture.** `bake()` only queues a small part; `finishBaking()` (called
  once in `BootScene`) packs them onto a 2048-pixel page, which is about 75% full (it warns in the console
  if a second page is ever needed). Art that only a stage draws is baked inside `bakeApart('stage', ...)`
  and goes on a page of its own: it doesn't crowd the shared page, and a boss fight never switches between
  pages because of it. Make images with `part()` and swap them with `show()`; never call `setTexture`
  yourself. Parts longer than 512 texture pixels keep their own texture. Big soft glows are baked small
  (`SOFT`, `HAZY`) so they fit: scale those with `unit(key)`, not `INV`.
- **One texture per draw batch, on purpose.** `BootScene` sets this for every device (Phaser's default on
  phones and tablets). Otherwise Phaser compiles a new shader the first time a batch uses a new number of
  textures, which drops frames mid-fight. Thanks to the atlas a frame is still only about 20-35 draw calls.
- **Light gets a layer of its own.** A sprite drawn as light (`BlendModes.ADD`) cannot share a draw call
  with one drawn as paint, so interleaving them (halo, petal, halo, petal) costs a draw for each. Give
  glows a depth a hair under or over the things they belong to, as the shots, pollen and particles do, and
  only make something light if it has to be.
- **Nothing is drawn as a shape each frame.** A curve that keeps changing (Sunny's stem, the vine) is a
  strip baked once and bent with `Ribbon`; a bar that grows is a stretched sprite. `Graphics` is cut into
  triangles again on every frame it changes, so it is kept for the debug overlay.
- **`sync()` runs every frame, so it should not make things.** Views keep their images, the particles a
  whole fight needs are made at startup and recycled (`READY` in `src/game/fx.ts`), and work that only
  matters when something changes (tinting the ground to the weather) waits for the change.
- **Changing a line of text is the most expensive thing the HUD does.** Each change of words or style
  redraws that text's own canvas and sends it to the graphics card again. So each style of toast has a
  line of its own that only ever changes its words, and only text that is drawn once ("Ready?", the boss's
  name) has a drop shadow, which is slow to draw on a canvas.
- **Anything drawn in front of the fight** (depth `front` in `FightScene`) must stay below the line Pip
  stands on, or it will hide feet and ground warnings.
- **The page works before the script arrives.** On a slow connection the 1.4 MB script takes seconds, and
  the page shows long before it. So the stage is sized by `style.css` (`src/ui/layout.ts` only keeps `--ui`
  in step with it), and the loading screen (`#loading` in `index.html`) is plain HTML and CSS. It covers
  the stage, with the cards hidden under it, until the title has been drawn once; then `src/ui/loading.ts`
  fades it out onto the studio's sting, printed on the same cream paper. Keep it free of anything the
  script makes.
- **A sound asked for before the player's first press is dropped,** not saved up: the browser holds the
  audio back until then (`GameAudio.canPlay`), and notes scheduled meanwhile would all play at once.
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
(a kids' game should never hurt without warning). Then give it a view: bake its parts in `bakeHazards`
(`src/game/views/hazards/art.ts`), write a view class in `src/game/views/HazardViews.ts`, and add it to the
factory in `HazardViews`. Use the shared `warn-mark` badge (`showMark` draws it in front of Pip) or an
orange ring for its warning, so it reads like the others.

**Add a sound or an effect.** Add an event to `src/sim/events.ts` and emit it from the simulation. TypeScript
then points at `present()` in `src/presentation.ts` until the new event has a case there. A new sound is a
name in `SfxName` plus a recipe in `src/audio.ts`. For the picture, `present()` can call `burst` (particles),
`ring`, `shake`, `flash`, `punch` (a camera jolt), `hitStop` and `toast`. A new particle shape is a name in
`ParticleShape` plus a drawing in `SHAPES` in `src/game/fx.ts`. Effects that belong to one view (dust at
Pip's heels, steam from Sunny) are made by that view, which is handed the same `fx`.

**Add a boss.** Write `src/sim/bosses/<name>.ts` extending `Boss` (its movement, hurtboxes and attacks) and
add it to `src/sim/bosses/index.ts`. TypeScript then asks for its view in `src/game/views/bossViews.ts`. The
toasts in `src/presentation.ts`, the lose text in `src/ui/overlay.ts` and How to play in `index.html` still
name Sunny, and the game always plays one chapter (`CHAPTER` in `src/app.ts`: its title, "Chapter 1 · The
Grumpy Sunflower", shown as its stage begins, then the Garden Path and `sunny`): choosing one needs a
level-select screen, which Play on the menu would open. The title (Pip's yard) belongs to no boss and needs
nothing. The portrait on the boss bar (`bar-icon-*` in
`src/game/hud/art.ts`), the shed-petal colours in `src/presentation.ts` and the sunflower garden itself are
Sunny's too. The weather already follows any boss's phase (`moodOf` in `src/game/views/world/weather.ts`).

**Add a stage.** Write its layout as data in `src/sim/stage/stages/<name>.ts`, a `StageData`: its length,
ground and pits, logs, thorns, leaf pads, enemies, dewdrops, golden seeds and gate. Add it to `STAGES` in
`src/sim/stage/stages/index.ts`, and give it the Garden Path's checks in `tests/sim/stage.test.ts` (it can be
played to the end, every pit can be jumped, every log and pad can be reached). `CHAPTER` in `src/app.ts`
names the stage and the boss that Play runs. `StageWorldView` draws any layout, but always as the garden
path: a stage somewhere else needs strips and pieces of its own (`src/game/views/stage/art.ts`).

**Add a small enemy.** Write a class extending `Enemy` (`src/sim/stage/enemies/enemy.ts`) next to the others,
add its `kind` to `EnemyKind` and a line to `ENEMIES` in `index.ts`. TypeScript then asks for its view in
`EnemyViews` (`src/game/views/EnemyViews.ts`, parts in `enemies/art.ts`). Like a hazard, it must warn before
it hurts: draw its "!" with `showMark`.

**Tune difficulty.**

- Boss HP: the number passed to `super(fight, 400)` in `src/sim/bosses/sunny.ts`.
- Boss pacing: `idleTime` (pause between attacks) and `speedMuls` (projectile speed) per phase, in the same file.
- Pip's movement, jump and fire rate: the constants at the top of `src/sim/player.ts`.
- Invulnerability after a hit: `hurt()` in `src/sim/player.ts`.
- A stage: where everything goes, in its data file; each enemy's speed and timing at the top of its file,
  and `level` for a harder one (so far a level-2 Pea Pod spits two peas after each "!").

**Replace the code-drawn art.** Every picture is made by a `bake(...)` call with a key such as `pip-body` or
`sunny-petal-front-0`. `bake.ts` keeps a table of where each key lives (texture, frame, pivot, scale) and
`part()` reads it. To use drawn sprites, load an atlas in `BootScene` and fill that table from its frames
instead of baking; the views keep working.

## Tests

`pnpm check` type-checks the app, type-checks `src/sim/` a second time without browser types, runs the
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
S.startBoss(); S.step(120);                // Sunny's fight; skip the "Ready? GO!" intro
S.input.shoot = S.input.up = true;         // hold shoot + aim up
S.step(60 * 10);                           // simulate 10 seconds
console.log(S.game.boss.hp, S.game.player.hp, S.game.state);
```

Add `?hitboxes` (or call `S.hitboxes(true)`) to draw what the simulation actually collides with, and
`?skipintro` to open on the menu instead of watching the opening on every reload. `S.startGame()` is Play
(the Garden Path, then Sunny through its gate); `S.startStage()` and `S.startBoss(hearts)` start either one
directly; `S.skipIntro()` skips to "Press any key" and `S.toMenu()` goes back to the menu.

Two things to know when scripting it. Hit-stop (see `App.hitStop`) holds the simulation for a few frames
after Pip is hurt or Sunny changes phase, so `step(n)` can advance the fight by a little less than `n`
steps. And timing a tight `step()` loop does not measure frame time: WebGL calls queue up, so it measures
how fast the graphics card drains the queue. To check for stutter, let the game's own loop run and record
the gaps between `requestAnimationFrame` callbacks. To see what a frame costs, count `drawElements` calls
on `S.phaser.renderer.gl` and take a CPU profile while the loop runs. For reference, a phase-3 fight on an
M4 Mac at 1920x1080 is about 30 draw calls, 0.2 ms of script and 140 kB of short-lived memory per frame,
and the Garden Path about 35 draw calls. The title takes 20–26 draw calls through the opening and on the
menu.

## Ideas for later

[`docs/future-improvements.md`](docs/future-improvements.md) lists what could come next, from small fixes to a
second boss, with what each change would take. It also lists the ideas that were decided against, and why.
