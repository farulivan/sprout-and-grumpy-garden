# Future improvements

What could come next for Sprout & the Grumpy Garden after the reviews of October and November 2026: what
each change would fix, roughly how, and where in the code. It also lists what was decided against, and why,
so those ideas don't come back without a new reason.

Items keep the numbers they had in those reviews, so the gaps are items that are done or dropped; both are
listed at the end. Figures marked as measured come from bot fights against the simulation, or from the game
running in headless Chrome (see "About the numbers").

## Suggested order

1. ~~One chapter profile (#17), then a second chapter: a harder stage and a new boss.~~ Done.
2. The quick fixes (#18, #20, #25) and a browser smoke test (#15). They are small and safe, and none of them
   changes how the game plays.
3. Sound (#13), the biggest gap left against the look of the game.
4. The phone layout (#14), which the stage makes more pressing.
5. Progress that lasts (#22), then the link preview and player data (#24).
6. A stricter Garden Path (#21) and a signature move (#23).

## Scorecard, November 2026

A judgment of `main` at `b9857da`, from bot runs and screenshots of the production build. No person has
playtested these figures, and the audio grade comes from reading the code, not from listening.

| Area               | Grade | Why                                                                     |
| ------------------ | ----- | ----------------------------------------------------------------------- |
| Art and animation  | A-    | Sunny's three moods and the changing weather are the game's best feature |
| Opening and menus  | A-    | The yard and the signpost menu feel like a finished game                |
| Code health        | A     | All 109 tests pass, and the download is about 420 kB                    |
| Boss design        | C+    | Clear warnings and good escalation, but one spot undermines the fight (#27) |
| Stage design       | D+    | It can be cleared without using what it teaches (#21)                   |
| Progression        | D     | Almost nothing the player earns is kept (#22)                           |
| Audio              | D+    | Short loops, and the boss music never changes (#13)                     |
| Phone              | C     | The buttons cover the action (#14)                                      |
| Reach and data     | D     | No link preview, and no data on how far players get (#24)               |

## Quick fixes

### #18 Gamepad players see keyboard hints

The pause card says "Press P or Esc to keep going", and the win and lose cards say "or press Enter", even to
someone holding a gamepad. These hints are `.keys-only`, which `src/style.css` hides on touch screens only.

**Fix:** with a gamepad (`body.gamepad`), show its Start button instead, the way the title card switches its
controls (`.on-keys` and `.on-pad` in `index.html`).

### #20 A message freezes above the pause card

A message that is on screen at the moment of pausing (say "Dewdrop! Hearts already full") stays there, above
the pause card and half hidden by its leaves and badge, because the HUD scene is paused along with the fight.

**Fix:** hide the message (the toast's text and plate in `src/game/scenes/HudScene.ts`) while the game is
paused.

### #25 The golden-seed slots sit on the sun

On a stage, the three empty seed slots under the hearts are drawn over the sun's forehead, where they look
like bunny ears.

**Fix:** move the sun on a stage, or put the slots on a small plate of their own, as the toasts have
(`src/game/scenes/HudScene.ts`).

## Checks

### #15 Nothing tests the game in a browser

GitHub Actions now runs `pnpm check` and `pnpm build` on every pull request, but nothing in the repo plays the
game in a browser.

**Fix:** a smoke test in a real browser (Playwright, say) that opens the game with `?debug` and goes through
every screen with real key presses, taps and a gamepad: start, pause, Keep playing, Start over, Title screen,
a win and a loss, Easy mode, the stage's gate, golden seeds, and lives down to Game over. PRs #6, #7 and
#9–#14 were checked with scripts like that, kept outside the repo.

## Sound

### #13 The music never changes

Measured: the fight music is one 4.5 s loop of 16 notes. It plays about 20 times in a fight and sounds the
same in all three phases. The Garden Path has a quicker tune of its own, but it is a 3.5 s loop too. The
sound heard most is the shot, a square-wave blip about six times a second. (The title and its menu now have
a slow music-box tune of their own, and Options has music and effects volumes.)

**Fix:** keep it all generated in code (`src/audio.ts`), but give each phase its own theme that gets faster
and fuller as Sunny gets angrier, and soften the shot. Recorded music is the bigger step (see "Bigger
ideas").

## Phones

### #14 The touch layout on phones

Measured on an 844×390 phone, with the touch controls from PR #15:

- Jump now sits above the ground line, but ◀ ▶ and the big Shoot button still sit on it. Shoot covers the
  ground at about x 750–865 of the 960-wide world, so a warning on the ground there (a rumbling mound) hides
  under the thumb.
- At the far left, Pip stands behind ◀.
- The game keeps its 16:9 picture, so a phone this wide shows a plain green band about 75 px wide at each
  side.
- The buttons on the cards are small: about 29 px tall for Start over and Title screen, and 37 px for the
  green ones, against the 44 px that phone guidelines recommend.

**Fix:** on phones wider than 16:9, move the touch buttons out into the side bands, off the picture; and make
the cards' buttons bigger on touch screens (or give them bigger hit areas).

## Content

### #17 One chapter profile, before a second chapter

Done. `CHAPTERS` in `src/chapters.ts` holds each chapter's stage and boss, its title and tunes, its messages, its
win and lose texts, the sign and the gate, and the boss's colours and portrait, and the cards, the HUD and the
presentation read them. `src/game/views/chapterViews.ts` says how its world looks, and each chapter has scenes of
its own. A win goes on to the next chapter by itself.

**What's left** is small: `Boss.mood` in `src/sim/boss.ts` is set but never read, so use it or remove it.

## Game design

### #21 The Garden Path doesn't test its lessons

Each stretch of the stage is meant to teach something Sunny will test, but none of it has to be used. Measured:
a bot that holds right and shoot, and jumps only at logs, thorns and the pit, clears the stage in 24 s with no
hits. It never aims and never reacts to a "!". A bot that jumps blindly every half second clears it in 24.5 s
with one hit. The plan for the stage was 75–100 s.

As the first stage it can stay easy. This matters because Game over sends the player back through it, so the
walk has to stay worth doing.

**Fix:** keep the length, but place enemies and pits so that the player has to aim up and read the "!" to get
through unhurt. Add a route worth finding for a player who is replaying it.

### #22 Almost nothing the player earns is kept

- Stars show on the win card but are never saved (`src/save.ts` keeps only the best time).
- The stage's best time is saved but never shown (`stageBest`).
- The boss's best time shows only on the win card.
- Golden seeds pay out only when Pip is hurt, so the cleanest play gets "Hearts already full".
- The yard looks the same after a win as before the first game.

**Fix:** save the stars, show them and the best times on the menu, and let the yard change after a win (a
cheered-up Sunny in it, say). None of this makes the game easier.

### #23 There is no signature move

Pip moves, jumps, shoots and aims. Cuphead has its parry, and Mega Man takes each boss's power. Here,
"cheering up" is only a health bar and the flowers left behind are decoration. A move of its own is what
players would describe to a friend.

Chapter 2 partly answers this: cheering up a Capling turns it into a bounce pad that Pip can use, so a plant cheered
up now gives something back. It isn't a move of his own yet, and the Garden Path doesn't have it.

**Fix:** one that needs no new key, to keep to one key per action. Make it part of a chapter's design, because
a chapter's stage is where a new move can be taught.

## Reach

### #24 Shared links have no preview, and nothing shows how far players get

The page has no description or Open Graph tags, so a shared link shows only the title. Cloudflare's Web
Analytics counts page views, but it can't say how many players reach Sunny or beat him.

**Fix:** add a description and a preview image to `index.html`. Counting how far players get is a separate
choice, because the game has so far stored nothing about its players outside their own browser.

## Bigger ideas

- A second chapter (e.g. "The Prickly Cactus" or "The Moody Mushroom"), and a small level-select map that
  shows each stage's best time (the save already keeps it).
- Ways to win lives back, as Super Mario Bros.' 1-Up mushrooms and hundred coins do: a rare 1-Up on a later
  stage, say, or a set of golden seeds that gives a life when the hearts are already full. With more stages
  between Pip and the start, three lives will be tighter than they are now.
- Harder stages for the chapters after the first, as Stage 1's plan set out: new kinds of small enemy (one
  that drops from above, a charger, one that jumps pits), a mini-boss that blocks the path (as the Acorn
  Maker does in Cuphead's Forest Follies), moving platforms, wider pits, and faster, busier enemies. Much of
  it is data: the stage's layout and the enemies' `level`.
- A dash or a "Sunshine Super" meter that fills with hits.
- Recorded sound and music to replace the synthesized placeholders (the picture has had its overhaul).
- An installable, offline version (PWA) for tablets. (Give its service worker the game's own folder as its
  scope, or it will take over other copies of the game on the same domain.)
- A trimmed build of Phaser. The engine is 93% of the download and the game uses a small part of it: no
  physics, tilemaps, loader, tweens or input plugins.

A dash or a super meter changes how the fight plays, so it needs #16 first.

## Not planned, but worth knowing

### #10 A checkpoint at phase 3

Losing always starts the whole fight again. Measured with a bot playing at a young child's reaction time
(0.6 s), over 120 fights on Normal: 77 of its 81 losses came in phase 3, which took about a minute to reach
(median 60 s), and it then lasted about 30 s there. So every retry is a minute of phases 1 and 2, already
beaten, for 30 s of practice on the part that beats the player.

**Possible fix:** when Pip loses in phase 3, the lose card offers "Try again from phase 3": Sunny starts the
phase with a third of his health, and Pip with full hearts. A win from there doesn't count as a best time. It
could be for Easy mode only.

**Why it isn't planned:** it makes the game easier to finish, and the game follows Cuphead, whose boss fights
have no checkpoints. The lose card already shows how far the player got ("You cheered Sunny up 84% of the
way!"), as Cuphead's does.

### #16 Before changing the fight's rules, re-record the tests that pin it

Three test files (`tests/sim/pip-trace.test.ts`, `attacks.test.ts` and `bots.test.ts`) compare the game with
numbers recorded from the original JavaScript version, kept in `tests/fixtures/legacy-baseline.json` (see
"Tests" in the README). They catch accidental changes, but they also fail on intended ones: Sunny's health, an
attack's speed, Pip's movement, a dash.

So before a deliberate change to how the fight plays, record the same fixture again from the current game and
commit it on its own. Then make the change in a commit of its own, so that the fixture's diff shows exactly
what it changed. The original recorder (`tests/legacy-baseline.mjs`, in commit `0bdffb0`) drove the old
JavaScript game, so it needs rewriting for the current one.

The checkpoint (#10), sound, phones, the checks and a second boss don't need this: none of them changes the
normal fight.

### #26 "Kid-friendly" or "cute but tough"

The README calls the game kid-friendly, but the decisions below keep it hard, and later chapters are meant to
be harder. "Cute but tough" is Cuphead's formula and matches those decisions. The README's first lines should
say whichever is meant. This isn't decided yet.

### #27 Sunny's high leaf is a safe spot

From the arena's high leaf, straight shots hit Sunny's face for double damage, so the aim key isn't needed, and
vines and roots can't reach it. A real climb takes 2.4 s. Measured on Normal, over 1,000 fights each:

| Plan                                                        | Wins |
| ----------------------------------------------------------- | ---- |
| Stand on the leaf, hold shoot, press nothing else           | 23%  |
| The same, with a hop at a random moment after each "!"      | 33%  |
| The same, with a hop in a learned rhythm (0.5–0.7 s after)  | 66%  |
| Timed hops on the ground, aiming up from the best spot      | 0%   |

The dodging bot in "About the numbers" wins 33% at its 0.6 s reaction time. On Easy, only holding shoot from
the leaf wins about 98%.

**Why it isn't planned:** Sunny is the first boss, so it's fine for him to be easy. Touch players also need the
leaf, because it is their only way to his face. Later bosses shouldn't have a spot like it, and a bot can check
that.

## Decided against

- **Aim help (#1).** Measured: aimed shots only reach Sunny's face from about x 500–600 of the 960-wide
  arena, and from the left half they fly over him. Angling them toward his face would fix that, but it makes
  the game too easy.
- **A gentler fight for young kids (#8).** Measured: at a 0.6 s reaction time, the bot wins 33% of fights on
  Normal and 64% on Easy, and petals cause most of its hits. The fight keeps its challenge.
- **A fuller Easy mode (#9).** Easy mode stays at 8 hearts instead of 5.
- **A different warning for each attack (#12).** The one "!" bubble is enough.
- **Auto-fire.** Shoot is held on every device: X on a keyboard, X, RB or RT on a gamepad, and the big seed
  button on a touch screen, where Pip used to fire by himself until PR #15. It made touch play too easy.
- **Aiming on a touch screen.** The aim toggle went in PR #15, to keep the touch controls to four buttons.
  Seeds fly straight there, and Sunny's face is reached from the high leaf.
- **Straight to Sunny.** A title-card button that went straight to Sunny once Pip had reached him (PR #12).
  It skipped the stage for good, which made the game too easy, and Mega Man never lets a new try at a stage
  skip it. Removed in PR #14.

## Done

- #2–#7, quick fixes (PR #6): Easy mode from the keyboard, seeds that bounce off Sunny while he can't be
  hurt, the dewdrop message at full hearts, the hearts and boss bar fading under the result cards, petals
  bursting on the grass, and the rotate prompt on phones.
- #11, Start over and Title screen on the pause card (PR #7).
- Stage 1, the Garden Path, before Sunny (PRs #9–#12): a scrolling stage with four kinds of small enemy,
  golden seeds, and hearts carried through the gate into the boss fight.
- #19, the d-pad and the arrow keys on every card, Easy mode's checkbox included (PR #12).
- Golden seeds that heal (PR #14): every third one fills a heart, as a dewdrop does, and the count starts
  again. They used to count only on the win card.
- Lives (PR #14): three a game, as in Super Mario Bros. Losing a level, or Start over, costs one; with none
  left the game starts again from the first stage. Retrying Sunny at his gate used to be free and endless.
- The opening and the main menu (PR #17): the studio's sting, a cold open over Pip's
  yard at dawn, "Press any key" and a signpost menu (Play, How to play, Options, Credits), with irises into
  each stage and the chapter's title as it begins. The title used to sit over a sleeping Sunny fight.
- Touch controls (PR #15): a big Shoot button held to fire, a smaller Jump up and to its right, and ◀ ▶ as
  two buttons, all drawn as icons. A thumb can slide between them, and between Shoot and Jump it presses
  both. No auto-fire and no aim button any more.
- Part of #15: GitHub Actions runs `pnpm check` and `pnpm build` on every pull request (PR #18).

## About the numbers

The simulation (`src/sim/`) runs without a browser, so a bot can play whole fights in a test. The bot behind
the figures above looked 50 steps (0.8 s) ahead every few steps and tried nine moves (left, stay or right,
each with no jump, a hop or a full jump). It ignored any attack younger than its reaction time and aimed up
only near the spot where shots reach Sunny's face. On the Garden Path it also weighed the stage's threats
(enemies, peas, thorns and pits), and a "!" it had seen for less than its reaction time didn't count. It
isn't in the repo; the README's "Tests" section shows how to play a fight in a test. The phone and button measurements came from the game running in headless
Chrome.

The figures in #21 and #27 come from simpler bots that follow one fixed rule and never look ahead, such as
"hold right and shoot, and jump at logs, thorns and pits". They show what a plan can get away with, not how a
person plays. Their hop timing matters a lot: a fixed delay after each "!" swings the win rate from 5% to 100%,
so #27 uses random delays.
