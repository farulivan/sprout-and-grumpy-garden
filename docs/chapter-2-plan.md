# Chapter 2: The Moody Mushroom

## Context

The game has one chapter: the Garden Path, then Sunny. Farul wants a second, harder chapter: Stage 2 and its boss. Sunny may stay easy as the first boss; the November review's other findings are saved in the backlog (PR #24).

**Farul's decisions (2026-11-01):**

- **Boss and setting:** the Moody Mushroom, in a shady wood that goes from dusk to night.
- **New mechanic:** cheer a plant, then bounce on it. No new button.
- **Game over:** back to the very beginning, with +1 life for each boss beaten. Play always starts at Chapter 1, with no level select.
- **Stage peak:** bramble glades, where the path closes until every plant there is cheered up.

## The design

### The idea players will remember

**Cheer it, then bounce on it.** A grumpy mushroom hurts to touch. A few seeds turn it into a happy bounce pad, so shooting now builds Pip's path as well as clearing it. As with a jump, holding the button goes higher. It needs no new button on any device, and it gives "cheering up" a real effect.

Starting values, to tune by playing:

| | Normal jump | Bounce |
| --- | --- | --- |
| Height, button held | about 152 px | about 261 px |
| Height, button not held | about 89 px | about 153 px |
| Longest distance | about 240 px | about 320 px |

So a pit 290–300 px wide or a wall 190 px tall can only be passed with a bounce.

### Stage 2: The Mushroom Wood

About 9,000 px (Stage 1 is 7,300), going from dusk to deeper dusk as Pip walks. Mo's glowing cap grows on the horizon, as Sunny does. Every plant Pip cheers up leaves a small glowing mushroom, so the path behind him lights up.

| Section | What it asks |
| --- | --- |
| 1. The way in | One Capling, then a trunk too tall to jump. The only way on is to cheer it and bounce. One short message, once: "Bounce on it! Hold jump to go higher." |
| 2. First wide pit | A Capling at the edge of a pit too wide to jump |
| 3. Burr alley | Burrs roll under a "!"; jump them. Seeds bounce off until they stop. First golden seed |
| 4. First glade | Brambles close the path. Grumbuds and Puffballs must all be cheered up |
| 5. The canopy | Dropcaps fall from above. A low route with Snappers and thorns, and a high route by bounce with a golden seed and a dewdrop |
| 6. Pit run | Toadlets hop across pits. A level-2 Pea Pod. The last golden seed sits on the arc of a held bounce |
| 7. Second glade | Two waves, everything so far mixed together |
| 8. Last dash | No stops, then the gate: "Mo's Hollow" |

**New enemies.** Each one is built so that holding shoot and walking can't solve it, which was Stage 1's weakness. Each also teaches something Mo tests. Grumbuds, Puffballs, Pea Pods and Snappers return.

| Enemy | What it does | Seeds | Teaches |
| --- | --- | --- | --- |
| Capling | Sits still and hurts to touch. Cheered up, it becomes a bounce pad for good | 2 | Bouncing |
| Burr | Curls under a "!" (seeds bounce off), rolls at Pip and stops dizzy at a wall, when it can be hit | 3 | Jumping his acid smoke |
| Dropcap | Hangs in the canopy, out of reach of straight shots. Drops after a "!", timed to land in front of a running Pip | 1 | Watching the ground under Pip (his Fairy Ring) |
| Toadlet | Hops at Pip in arcs that clear straight shots, and crosses pits | 2 | Passing under a hop |

**Glades:** the camera stops and Pip can't leave until every plant there is cheered up, then the brambles wither in a burst of flowers.

**Pickups:** three golden seeds (every third still heals a heart) and two or three dewdrops.

### Stage 2's boss: Mo the Moody Mushroom

Sunny stands still on the right. **Mo moves**, so the fight has no fixed spot: he hops around the whole arena, and his cap colour and the weather change with his mood.

| Phase | Mood | Cap | Weather | New attacks |
| --- | --- | --- | --- | --- |
| 1 | Sulky | Blue | Dusk | Big Hop, Fairy Ring |
| 2 | Cross | Orange-red | Dark | Spore Puffs, Sprout Caplings |
| 3 | Furious | Purple | Night, glowing | Cap Spin |
| Cheered up | Happy | Bright | The whole wood lights up with glowing mushrooms and fireflies | |

All attacks start with the usual "!" (and an orange ring where something will land).

| Attack | What happens | Answer |
| --- | --- | --- |
| Big Hop (1, 2, then 3 hops by phase) | He lands on a ringed spot near Pip and acid smoke rolls out each way | Pass under him, jump the smoke |
| Fairy Ring | A root follows Pip through the soil, stops, toadstools pop up, then the ring erupts straight up, even through platforms | Keep moving. This is what stops safe spots |
| Spore Puffs | Slow bubbles drift at Pip | Dodge them, or spend shots popping them |
| Sprout Caplings | Caplings pop up at ringed spots. Cheered up, they bounce for about 8 s, then wilt | A bounce gives height, time in the air and a way over him |
| Cap Spin | He spins from wall to wall, then sits dizzy | Jump him, then punish him: his face is open for a long window |

**How damage works:**

- Between attacks he sulks and his cap covers his face: seeds on the cap bounce off, and his stalk takes normal damage.
- When he rears up to attack, his face is open for double damage. That means the most damage comes when it's most dangerous.
- His face can be hit by aiming up from the ground, or by a straight shot during any jump or bounce. So touch players keep the same fight without an aim button.
- Touching him hurts, but his cap is bouncy: landing on it while he sulks bounces Pip over him, so he can never pin Pip against a wall.

**Arena:** Pip can use the full width, and there are two low shelf fungi at the sides. Nothing there is out of the Fairy Ring's reach.

### Difficulty targets, measured with bots

| Check | Target |
| --- | --- |
| Stage 2, "hold right and shoot, jump at obstacles" (cleared Stage 1 in 24 s) | Can't clear it. Locked in as a repo test |
| Stage 2, dodging bot at 0.25 s reactions | At least 95% clear, at most 1 hit |
| Stage 2, dodging bot at 0.6 s reactions | 60–80% clear, reaching the gate with 2–3 hearts (Stage 1: 100%, 4.9 hearts) |
| Stage 2, fastest possible clear | At least 45 s (Stage 1: 24 s) |
| Mo, dodging bot at 0.25 s reactions | At least 60% wins |
| Mo, dodging bot at 0.6 s reactions | 10–20% wins (Sunny: 33%) |
| Mo, each attack alone, 0.15 s bot | No hits, which shows every attack can be dodged |
| Mo, any fixed spot, hold shoot and hop at "!" | Under 5% wins (Sunny's leaf: 33–66%). Locked in as a repo test |

Bots aren't people, so Farul's own play decides the feel. Each sim PR can be played before any final art is drawn.

### The run

- A boss win gives +1 life. The win card says so, and its main button becomes **Next chapter**. After the last chapter it's **Play again**.
- Each new chapter starts with full hearts. Hearts still carry from a stage to its boss.
- Try again restarts the lost level (the boss at his gate, with full hearts). Game over returns to Chapter 1 with 3 lives.
- Main menu ends the run, and Play starts from Chapter 1.

### My own calls, easy to change

- The names: Mo, the Mushroom Wood, Mo's Hollow, Capling, Burr, Dropcap, Toadlet.
- No mid-stage checkpoint, the same as Stage 1. I'll look at this again once Stage 2 has been played.
- One short teaching message for the bounce, because it's the first new idea since How to play.
- Mo's music changes with each mood.

### Left out on purpose

A mini-boss, moving platforms and new moves (saved for Chapter 3 or later). Level select. Backlog items, including Sunny's music (#13) and the phone layout (#14).

## How it gets built

The rules come first and the art last, so feel problems are found before any art is drawn. Chapter 2 can only be reached through `?debug` until the last PR, so `main` stays shippable at every merge.

| PR | Branch | What's in it | Farul's check |
| --- | --- | --- | --- |
| 1 | `refactor/chapter-profiles` | Chapter profiles and per-chapter scenes. **No visible change** | Review |
| 2 | `feat/wood-sim` | Bounce, glades, four enemies, Stage 2 layout, tests and balance. Rough placeholder art | **Play it and approve the feel** |
| 3 | `feat/wood-art` | The Mushroom Wood's look, enemy art, music and sounds | Look and listen |
| 4 | `feat/mo-sim` | Mo's rules, attacks, arena, tests and balance. Rough placeholder art | **Play it and approve the feel** |
| 5 | `feat/mo-art` | Mo's look and acting, his hollow, attack art, moods, music | Look and listen |
| 6 | `feat/chapter-2` | Next chapter, +1 life, card text, How to play, docs. **Chapter 2 goes live for players** | Final playthrough. Farul decides on a version tag |

Small commits, each one passing on its own. Each PR body gets its preview link once the build passes, and Farul reviews and merges.

### PR 1: Chapter profiles (backlog #17)

- **New `src/chapters.ts`:** `CHAPTERS`, a list of profiles. It replaces `CHAPTER` in `src/app.ts` and holds what is written into the code as Sunny's today:
  - title, stage and boss ids, tunes;
  - boss toasts and start hints (`src/presentation.ts`);
  - lose text (`src/ui/overlay.ts`);
  - shed colours, HUD phase colours and portrait keys (`src/game/scenes/HudScene.ts`, `src/game/hud/art.ts`);
  - gate and win text.
- **`src/app.ts`:** a `chapter` index, used by `start`, `retry`, `startStage` and `startBoss`. The new `chapter` value goes to `present()` as an option.
- **One scene per chapter:** `FightScene` and `StageScene` take a key and a world view factory, and `main.ts` registers one pair per chapter. Sleeping scenes draw nothing, so views never have to hide each other. `LEVEL_SCENES`, `showSceneFor` and `onPause` read the keys.
- **`src/game/views/stage/StageWorldView.ts`:** takes a theme (strip, ground, prop and gate keys, and which mood goes with the player's progress) instead of hard-coded Garden Path keys.
- **`src/game/views/WorldView.ts`:** takes factories for its land and ground. `Sky`, `Air` and `Weather` are shared across chapters.
- **`src/sim/fight.ts`, `src/sim/boss.ts`:** arena platforms and `maxX` come from the boss. Sunny's values are unchanged.
- **Proof of no change:** the 1,200-fight comparison against `main` (`sim-bot-analysis-workflow` in memory), the same comparison for the Garden Path, and all parity fixtures passing untouched. Before/after screenshots.

### PR 2: Stage 2 rules

- **`src/sim/player.ts`:** a new optional `PlayerWorld.bouncers`. Falling onto one sets `vy = -BOUNCE_V` (hold = higher, as with a jump) and emits `bounce`. Worlds without it behave exactly as before, which keeps Sunny bit-identical.
- **New `src/sim/bouncer.ts`:** a pad with an optional lifetime. Pads stay for good on a stage and wilt in a fight.
- **New enemies** in `src/sim/stage/enemies/`, one file each, added to `index.ts`, using `Enemy.shield()` and `hurtbox()` as the Snapper does. On a cheered Capling, `Stage.seedHits` adds a bouncer.
- **Glades in `src/sim/stage/stage.ts`:**
  - New optional `StageData.glades`, plus `glade` and `wave` on enemy placements. `gardenPath` stays valid unchanged.
  - While closed: `minX` and `maxX` become mutable and hold Pip in, `cameraGoal` clamps to the glade, and `wakes` holds each wave back until its turn.
  - New events: `gladeClose`, `gladeWave`, `gladeOpen`.
- **New `src/sim/stage/stages/mushroomWood.ts`,** added to `STAGES`.
- **Placeholder views:** simple baked shapes in `EnemyViews` so the preview plays at `?debug&chapter=2`.
- **Tests in `tests/sim/stage.test.ts`:**
  - each enemy's rules, and that everything warns before it hurts;
  - bounce height, and that a bounce only happens when falling;
  - a glade can't open early and can't trap Pip;
  - every pit and pad can be reached, and each "bounce only" gap really needs a bounce;
  - an untouchable route bot reaches the gate;
  - the hold-right bot can't.

### PR 3: The Mushroom Wood's look

- **New `src/game/views/wood/`:**
  - far tree silhouettes and glowing giant mushrooms in sliding strips;
  - mossy ground, tall trunks, bramble walls, shelf fungi, sign and gate;
  - far Mo on the horizon and glowing blooms;
  - baked with `bakeApart('wood', …)` so its art gets its own atlas pages.
- **`src/game/views/world/weather.ts`:** new moods `dusk`, `gloom`, `tantrum` and `glow`, added to the end of `MOODS`, so Sunny's sky stack is unchanged. New `Look.moon`. `Sky` gets a moon, and `Air`'s motes become fireflies through the mood's tint.
- **`src/audio.ts`:** `TuneDef` gets an optional scale (default `NOTES`), plus a minor-key `wood` tune and new sounds.
- **Enemy art** in `src/game/views/enemies/art.ts`, following the README's "How it looks" rules. Cue particles for the new events in `src/presentation.ts`.

### PR 4: Mo's rules

- **New `src/sim/bosses/mo.ts`,** added to `BOSSES`, and hazards in `src/sim/hazards.ts` (`smoke`, `ring`), each with `shape()` null during its warning.
- **`src/sim/boss.ts`:** optional `touches(circle)` for contact damage, false by default.
- **`src/sim/fight.ts`:** `enemies` and `bouncers`, empty for Sunny, so no change to his fight or its random numbers. Spore bubbles and Caplings are `Enemy` subclasses. `FightScene` adds `EnemyViews`.
- **`src/game/views/bossViews.ts`:** a placeholder `MoView`.
- **New `tests/sim/mo.test.ts`:**
  - every attack warns first;
  - the face can be hit by an aimed shot and by a straight shot in the air;
  - Mo never lands on or pins Pip;
  - replays are identical from the same seed;
  - the no-safe-spot bot stays under 5%.

### PR 5: Mo's look

**Replaced by [`docs/chapter-2-boss-spec.md`](chapter-2-boss-spec.md), written after Farul played PR 4.** It brings in the Fairy Ring and Acid Smoke. Where the two disagree, the spec wins. The original outline, for reference:

- **New `src/game/views/mo/`:** art and face in layered parts, as `sunny/` does, with `MoView` doing the acting: squash and stretch on hops, the drooping sulk, rearing up, spin, dizzy stars, cap colour for each mood, and the happy ending.
- **Arena:** his hollow's land and ground, and the `glow` ending.
- **Attack art:** Acid Smoke, the Fairy Ring, spore pods.
- **HUD:** portrait and phase colours through the profile.
- **Audio:** one version of his tune per mood, switched on the `phase` event.

### PR 6: Chapter 2 goes live

- **`src/app.ts`, `src/ui/overlay.ts`, `index.html`:** a `next()` step and +1 life on a boss win. The win card shows Next chapter or Play again, and the +1 life.
- **Copy:** How to play and the chapter title in `HudScene`.
- **Docs:**
  - `README.md`: how the chapter works, and updated "Extending" steps.
  - `docs/code-tour.md`.
  - `docs/future-improvements.md`: #17 done, and note that #23 is partly answered.

## Verification

**Every PR:** `pnpm check` and `pnpm build`, and all parity tests passing with their fixtures untouched. Sunny's fight and the Garden Path stay identical to `main` in the seeded comparison.

**Balance (scratch bots, outside the repo):** PRs 2 and 4 report the targets table in their PR bodies, with real figures, including any target missed.

**In a real browser (headless Chrome over CDP, the `visual-check-workflow` recipe), on the production build and the preview:**

- Play through to Next chapter and on through Stage 2 and Mo.
- Lose in each level; Try again; run lives down to Game over and back to Chapter 1.
- Pause, Start over and Main menu in each scene.
- Keyboard, touch (844×390 and tablet) and a fake gamepad, including bouncing with a held jump on touch.
- Contact sheets of every section and every mood, checked against the README's look rules.

**Performance on the production build:** within about 40 draw calls in play, under 2 ms of game work per frame, and boot under about 1.2 s at 6× CPU slowdown. If the new art breaks the boot budget, bake it when Chapter 2 starts instead.

**Before final art:** Farul plays the placeholder builds from PRs 2 and 4 and approves the feel.

## Running the build

**Use fresh chat sessions, one per PR.** This session already carries the whole review, screenshots and large file dumps, and all of that gets re-sent with every turn. A fresh session starts with only what the PR needs.

**Approving this plan writes no game code.** This session will only do two things, then stop:

1. Copy this plan to `docs/chapter-2-plan.md`, uncommitted, for PR 1 to commit. Plans in `~/.claude/plans/` can be overwritten: the Stage 1 plan's file now holds the touch controls plan.
2. Save a memory note pointing to it.

**To start each PR, open a new session and paste this, changing the number:**

```
Act as head of engineering with senior-level experience. Implement PR 1 of
docs/chapter-2-plan.md. Read the plan first and follow its handoff notes.
Stop once the PR is open, and report its preview link.
```

Merge each PR before starting the next, or tell the new session to stack on the open branch. PRs 2 and 4 stop for Farul to play the placeholder build before the art PR after them begins.

## Handoff notes

Before starting a PR, read this plan, then `README.md` ("Things to know before changing it" and "Extending"), and the memory files `stage1-garden-path-plan`, `sim-bot-analysis-workflow` and `visual-check-workflow`. Don't re-propose what `docs/future-improvements.md` lists under "Decided against".

The bot and browser scripts from the November review were scratch files and won't carry over to a new session. The memory files above have the recipes to rewrite them.
