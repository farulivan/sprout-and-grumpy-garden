# Sprout & the Grumpy Sunflower 🌱🌻

A cute, kid-friendly boss-battle game in the style of Cuphead / Mega Man boss fights, themed around plants.
Little **Pip** the sprout must cheer up **Sunny**, a grumpy sunflower, by showering him with seeds.
Win by emptying Sunny's bar without losing all your hearts.

No build step, no dependencies, no asset files: vanilla JavaScript ES modules + HTML5 Canvas.
All art is drawn in code and all sound is synthesized with WebAudio.

## Run it

ES modules don't load from `file://`, so serve the folder:

```bash
npm start                  # = python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, VS Code Live Server, etc.). To publish, upload the folder to any static host.

## Controls

| Action | Keyboard | Touch (tablet/phone) |
| --- | --- | --- |
| Move | ← → or A D | slide on the ◀ ▶ pad |
| Jump (hold = higher) | Space, Z or K | Jump button |
| Shoot | hold X, J or L | automatic |
| Aim diagonally up | hold ↑ or W | tap ⬆ to toggle |
| Pause / resume | P or Esc | ⏸ button |
| Sound on/off | M | 🔊 button |

Face shots do 2 damage; stem shots do 1. The game auto-pauses when the tab loses focus.
**Easy mode** (checkbox on the title and lose screens) gives 8 hearts instead of 5.

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

## Code map

| File | What it does |
| --- | --- |
| `index.html` / `css/style.css` | page, overlay cards (title, win, lose, pause), HUD buttons, touch controls |
| `js/main.js` | game loop, state machine, collisions, HUD, screens, pause, mute, `?debug` hook |
| `js/boss.js` | Sunny: phases, attack scheduler, attack patterns, drawing |
| `js/player.js` | Pip: movement, jump, shooting, hurt/invulnerability, drawing |
| `js/entities.js` | projectiles, particles, Dewdrop pickup, and the hazards (VineSweep, RootSpike, PollenDrop) |
| `js/world.js` | background, ground, and the two one-way leaf platforms |
| `js/input.js` | keyboard mapping (held state + "just pressed" per frame) |
| `js/touch.js` | on-screen touch controls (auto-fire, aim toggle) |
| `js/audio.js` | synthesized sound effects and background music |
| `js/utils.js` | constants (`W`, `H`, `GROUND`, `ARENA_R`), math helpers, shape helpers, the shared cute `drawFace()` |

Game states in `main.js`: `title → play → ending (slow-mo bloom) → win`, or `play → down (Pip naps) → lose`.
The canvas always renders at a logical 960×540 and is scaled to the window (and device pixel ratio).

## Extending

**Add a boss attack.** In `js/boss.js`, write a generator method. `yield <seconds>` waits, `this.warn(t)` shows
the "!" telegraph, and the attack must end with `this.endAttack()`. Then add its name to `POOLS` for the phases
that should use it:

```js
*leafBoomerang() {
  this.warn(0.6); yield 0.6;
  // push Projectile(...) into this.game.projectiles, or a hazard into this.game.hazards
  yield 1.0;
  this.endAttack();
}
```

**Add a hazard.** Make a class in `js/entities.js` with `update(dt)`, `draw(ctx)`, `hits(circle)` and a `dead` flag.
Give it a visible warning before `hits()` can return true (a kids' game should never hurt without warning).

**Tune difficulty.**

- Boss HP: `maxHp` in `js/boss.js`.
- Boss pacing: `IDLE_TIME` (pause between attacks) and `SPEED_MUL` (projectile speed) per phase, also in `js/boss.js`.
- Pip's movement, jump and fire rate: the constants at the top of `js/player.js`.
- Invulnerability after a hit: `hurt()` in `js/player.js`.

**Test without playing.** Open `index.html?debug`. `window.sprout.step(n)` advances the simulation `n` frames
without `requestAnimationFrame`, so it also works in background tabs and scripts:

```js
const S = window.sprout;
S.startGame(); S.step(120);                // skip the "Ready? GO!" intro
S.input.shoot = S.input.up = true;         // hold shoot + aim up
S.step(60 * 10);                           // simulate 10 seconds
console.log(S.game.boss.hp, S.game.player.hp, S.game.state);
```

With the current tuning, a perfect face-shooter wins in about 42 s of fight time. A simple scripted dodging bot
wins in about 57-72 s with 2-3 hearts left.

## Ideas for later

- A second boss (e.g. a cactus or a mushroom) and a small level-select map.
- A dash or a "Sunshine Super" meter that fills with hits.
- Hand-drawn sprite sheets and recorded sound to replace the procedural placeholders.
