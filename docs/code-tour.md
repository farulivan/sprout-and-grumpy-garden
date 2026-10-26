# A tour of the code

A short, plain-language map of how the game works, and why it is built this way. The README has the
details (see "How the code is organised"); this page is the version to read first.

## The one idea: the rules are kept apart from the pictures

The game is two programs that talk in one direction.

- **The simulation** (`src/sim/`, about 2,000 lines) is the game's rules: where Pip is, what hit what, how
  much health Sunny has left. It is plain TypeScript. It never draws, never plays a sound, and never asks
  the browser for anything, not even the time or a random number.
- **The presentation** (`src/game/` and the rest, about 11,000 lines) shows the rules: it draws everything
  with Phaser, plays the sounds and runs the menus. It reads the simulation, and the only thing it sends
  back is the player's input.

Think of a board game: the simulation is the rulebook and the referee, the presentation is the board, the
pieces and the sound effects. A test can play the whole game with the rulebook alone.

## What happens every frame

```
keys / gamepad / touch ─► Controls ─► App ──step(input)──► the level (src/sim)
                                       │◄──── events ────────┘
                                       ├─► presentation.ts ─► sounds, particles, shake
                                       └─► Phaser scenes draw the level
```

1. **Input.** `Controls` merges the keyboard, a gamepad and the touch buttons into one input: left, right,
   jump, shoot, aim.
2. **Steps.** `App` (`src/app.ts`) moves the level forward in fixed steps of exactly 1/60 s, as many as the
   time since the last frame covers. A 120 Hz screen runs a step every other frame, a slow one may run two in
   a frame; the game plays the same either way.
3. **Events.** Each step reports what just happened (`jump`, `bossHit`, `phase`, ...). `presentation.ts`
   turns every event into a sound, particles, a shake or a message.
4. **Drawing.** Each thing on screen has a view that reads the simulation and draws it, slightly blended
   between the last two steps so motion stays smooth on any screen.

## The levels

A level is one thing being played, and the next one replaces it:

- **`Yard`**: Pip's yard, behind the opening, "Press any key" and the menu.
- **`Stage`**: a scrolling stage, the Garden Path, with its small enemies, pits and pickups.
- **`Fight`**: a boss fight, Sunny the sunflower, in three phases.

Play goes Yard → Stage → Fight. All three speak the same small interface, so the loop, the events and the
drawing work the same for each.

## No image or sound files

Every picture is drawn with code when the game starts, then "baked" once onto a few large textures (an
atlas), so drawing it later is as fast as with ordinary sprites. Every sound and tune is made by WebAudio on the spot. The
whole game is one HTML page and a few scripts, and the engine has a file of its own, so after an update a
returning player downloads about 40 kB, not 400 kB.

## How it is tested

Because the rules are free of the browser and of chance, the same inputs always give the same game. The
109 tests use that:

- **Rules:** jumping, shooting, getting hurt, every boss attack, every enemy, the stage from start to gate.
- **Fidelity:** Pip's movement and Sunny's attacks are checked, frame by frame, against recordings of the
  original version of the game.
- **Bots:** simple scripted players fight Sunny, to check the fight stays as hard as it was tuned.
- **A guard test** fails if anyone brings Phaser, the browser or `Math.random` into `src/sim/`.

## How a change ships

1. Work happens on a branch, in small commits, and goes up as a pull request.
2. Four checks run on it: the tests, types, lint and formatting (**Check**), a scan for vulnerable new
   dependencies (**Dependency review**), GitHub's code scanning (**CodeQL**), and Cloudflare's build, which
   gives the pull request its own link to play the change at.
3. Merging is the only way into `main`, and only once the checks pass.
4. Cloudflare builds and deploys `main` by itself, in under a minute. Versions are tags: `v1.0.0` is the
   first game, still playable at sprout-v1.farulivan.com, and `v2.0.0` the visual overhaul that followed it.

## Why is it built this way?

**Why keep the simulation apart from Phaser?** So the rules can be tested without a browser, replayed
exactly, and changed without touching the drawing (or the other way round). It also keeps the engine
replaceable.

**Why a fixed step of 1/60 s?** Physics that steps by "however long the frame took" plays differently on
different screens, and jumps get higher or lower. A fixed step behaves the same everywhere; blending the
picture between steps keeps it smooth.

**Why seeded randomness?** A seed makes "random" attacks repeatable: a test or a bug report can replay the
exact same fight.

**Why events instead of the rules playing sounds?** All the feedback lives in one table
(`presentation.ts`), and TypeScript refuses to build until every event has an entry there. The rules stay
short, and the game's feel can be tuned in one place.

**Why draw the art in code?** No art pipeline and a tiny download, and every picture follows the same rules
of light, outline and colour. Each piece has a name, so drawn sprites could replace it later without
changing the views.

**How would you add a boss?** Write its rules as a class next to Sunny's in `src/sim/bosses/` and register
it; TypeScript then asks for its view. The README's "Extending" section walks through it, and through adding
an attack, a hazard, a stage or an enemy.

**How is the project kept safe?** Dependencies are updated by Dependabot a week after release, pnpm refuses
releases with weaker provenance than the last, and `main` only takes changes that pass the checks above. The
README's "Checks and security" lists it all.
