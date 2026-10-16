# Future improvements

What could come next for Sprout & the Grumpy Garden after the review of v2 in October 2026: what each change
would fix, roughly how, and where in the code. It also lists what was decided against, and why, so those
ideas don't come back without a new reason.

Items keep the numbers they had in that review, so the gaps are items that are done or dropped; both are
listed at the end. Figures marked as measured come from bot fights against the simulation, or from the game
running in headless Chrome (see "About the numbers").

## Suggested order

1. The quick fixes (#18, #19, #20) and checks on pull requests (#15). They are small and safe, and none of
   them changes how the fight plays.
2. Sound (#13), the biggest gap left against the look of the game.
3. The phone layout (#14).
4. One boss profile (#17), then a second boss and a level map.

## Quick fixes

### #18 Gamepad players see keyboard hints

The pause card says "Press P or Esc to keep going", and the win and lose cards say "or press Enter", even to
someone holding a gamepad. These hints are `.keys-only`, which `src/style.css` hides on touch screens only.

**Fix:** with a gamepad (`body.gamepad`), show its Start button instead, the way the title card switches its
controls (`.on-keys` and `.on-pad` in `index.html`).

### #19 Gamepad players can't turn on Easy mode

The d-pad only moves between buttons on the pause card. On the title and lose cards a gamepad can start the
fight, but it can't reach the Easy mode checkbox.

**Fix:** make `Overlay.choose()` and `Overlay.press()` (`src/ui/overlay.ts`) work on every card and include
the checkbox, and call them from the title, win and lose branches of `App.tick()` (`src/app.ts`). With
nothing chosen, A must still start the game. On the title and lose cards the checkbox comes before the
button, so "press the first control" would tick it instead.

### #20 A message freezes above the pause card

A message that is on screen at the moment of pausing (say "Dewdrop! Hearts already full") stays there, above
the pause card and half hidden by its leaves and badge, because the HUD scene is paused along with the fight.

**Fix:** hide the message (the toast's text and plate in `src/game/scenes/HudScene.ts`) while the game is
paused.

## Checks

### #15 Nothing checks pull requests

`pnpm check` (types, tests, formatting) only runs on someone's own machine. Cloudflare's preview build only
shows that the game builds, and nothing in the repo tests it in a browser.

**Fix:**

- A GitHub Actions workflow that runs `pnpm install --frozen-lockfile`, `pnpm check` and `pnpm build` on
  every pull request.
- Then a smoke test in a real browser (Playwright, say) that opens the game with `?debug` and goes through
  every screen with real key presses and taps: start, pause, Keep playing, Start over, Title screen, a win
  and a loss, and Easy mode from the keyboard. PRs #6 and #7 were checked with scripts like that, kept outside
  the repo.

## Sound

### #13 The music never changes

Measured: the fight music is one 4.5 s loop of 16 notes. It plays about 20 times in a fight and sounds the
same in all three phases. The title screen is silent. The sound heard most is the shot, a square-wave blip
about six times a second.

**Fix:** keep it all generated in code (`src/audio.ts`), but give each phase its own theme that gets faster
and fuller as Sunny gets angrier, add a gentle tune for the title screen, and soften the shot. Recorded music
is the bigger step (see "Bigger ideas").

## Phones

### #14 The touch layout on phones

Measured on an 844×390 phone:

- The touch buttons sit on the ground line, where the fight happens.
- The vine's warning, a mound rumbling on the ground, hides under the Jump thumb.
- At the far left, Pip stands behind the move pad.
- The buttons on the cards are small: about 29 px tall for Start over and Title screen, and 37 px for the
  green ones, against the 44 px that phone guidelines recommend.

**Fix:** on short screens, make the touch buttons smaller and push them into the corners, and make the cards'
buttons bigger on touch screens (or give them bigger hit areas).

## Content

### #17 One boss profile, before a second boss

Sunny is written into many places: the messages in `src/presentation.ts`, the lose text in
`src/ui/overlay.ts`, the cards in `index.html` (with "Chapter 1 · The Grumpy Sunflower"), the portrait on the
boss bar (`bar-icon-*` in `src/game/hud/art.ts`) and the colours of his shed petals. `Boss.mood` in
`src/sim/boss.ts` is set but never read.

**Fix:** one profile for each boss (name, chapter, story line, messages, lose text, colours, portrait) that
the cards, the HUD and the presentation all read. Then a second boss and a level-select map; "Add a boss" in
the README lists the steps. Use `Boss.mood` or remove it.

## Bigger ideas

- A second chapter (e.g. "The Prickly Cactus" or "The Moody Mushroom") and a small level-select map.
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

## Decided against

- **Aim help (#1).** Measured: aimed shots only reach Sunny's face from about x 500–600 of the 960-wide
  arena, and from the left half they fly over him. Angling them toward his face would fix that, but it makes
  the game too easy.
- **A gentler fight for young kids (#8).** Measured: at a 0.6 s reaction time, the bot wins 33% of fights on
  Normal and 64% on Easy, and petals cause most of its hits. The fight keeps its challenge.
- **A fuller Easy mode (#9).** Easy mode stays at 8 hearts instead of 5.
- **A different warning for each attack (#12).** The one "!" bubble is enough.
- **Auto-fire on keyboard and gamepad.** Shoot stays a key to hold (X); touch screens fire by themselves.

## Done

- #2–#7, quick fixes (PR #6): Easy mode from the keyboard, seeds that bounce off Sunny while he can't be
  hurt, the dewdrop message at full hearts, the hearts and boss bar fading under the result cards, petals
  bursting on the grass, and the rotate prompt on phones.
- #11, Start over and Title screen on the pause card (PR #7).

## About the numbers

The simulation (`src/sim/`) runs without a browser, so a bot can play whole fights in a test. The bot behind
the figures above looked 50 steps (0.8 s) ahead every few steps and tried nine moves (left, stay or right,
each with no jump, a hop or a full jump). It ignored any attack younger than its reaction time and aimed up
only near the spot where shots reach Sunny's face. It isn't in the repo; the README's "Tests" section shows
how to play a fight in a test. The phone and button measurements came from the game running in headless
Chrome.
