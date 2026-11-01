# Queenie’s test workflow and overview

Read the root [TEST_CASES.md](../TEST_CASES.md) first for **what to test**. It is the single maintained catalog: add all new automated/manual case definitions there and update changed cases in place, preserving IDs, steps, expected results and source paths. Keep existing executable tests in `server/*.test.js`, and add new automated assertions there alongside their catalog entries. Do not append a separate set of new case definitions to this document or create dated catalogs.

This document supplies execution/evidence guidance and the existing coverage overview; use `TEST_CASES.md` for current detailed definitions. Use [LOCAL_TESTING.md](LOCAL_TESTING.md) to start the app. Requirements and historical verification remain in [PROJECT.md](PROJECT.md). **A listed case is not a claim that it passed.**

## Run and find results

Use Node.js 22 or newer. From the project root:

```sh
npm ci
npm run test:report
npm run build
```

`npm run test:report` runs the same `server/*.test.js` suite as `npm test`. It writes [reports/tests/latest.md](../reports/tests/latest.md) for people and [reports/tests/latest.json](../reports/tests/latest.json) for tools. These files record actual totals, test names, scope, times, Node version, and a fingerprint of the source and artwork. A source change during the run makes the report inconclusive and exits unsuccessfully. Skips and cancellations stay visible; test counts are not a coverage percentage.

For a focused run:

```sh
npm run test:report -- server/localGame.test.js server/setupDefaults.test.js
```

Focused runs write `reports/tests/latest-focused.md` and `.json`, preserving the previous full-suite report. They do not stand in for the full run. Report output contains no raw logs, assertions, private room data, credentials, or environment variables. Never copy `.data/`, browser storage, or real seat tokens into evidence.

The integration suites bind temporary loopback ports and use disposable in-memory rooms or temporary persistence files. They do not need a running development server and do not use the owner's `.data/rooms.json`. A sandbox denial such as `EPERM` while listening is an environment blocker, not evidence that the game passed or failed its assertions. Record the blocker; rerun with local networking when permitted.

## Automated case map

The executable cases already live together in `server/*.test.js`; imports intentionally reach the shared rules and local transport. Keep these paths stable rather than copying tests into a second directory. IDs identify behavior groups, not an artificial target number of tests. Add a regression only when it can detect a distinct failure.

| Case ID | Behavior and failure prevented | Executable coverage |
| --- | --- | --- |
| Q-A01 | Standard chess/endgames load legally; castling, en passant, selected promotion and terminal outcomes remain valid. | `server/game.test.js`; special-move/checkmate cases in `server/index.test.js` |
| Q-A02 | All three Chaos Kingdom sizes obey their geometry, roster, placement, swap and chosen win-condition rules; malformed drafts cannot start. | `server/game.test.js`; arena cases in `server/localGame.test.js` and `server/index.test.js` |
| Q-A03 | One shared local start initializes the correct two/three/four seats, names, settings, first turn and clocks; invalid settings/positions still reject start. | Shared-confirmation cases in `server/localGame.test.js`. This verifies the transport boundary, **not the number of browser taps**. |
| Q-A04 | Local takebacks enforce the acting side, consent, stale-action rejection and individual allowance; elapsed time/increments cannot be refunded or farmed. | `server/localGame.test.js`; local takeback/timeout cases in `server/partySession.test.js` |
| Q-A05 | Local save/restore keeps the agreed board, shape, history, outcome, pending consent, names and clock state. | Persistence cases in `server/localGame.test.js` and `server/partySession.test.js` |
| Q-A06 | Three/four-player geometry, hex seams, king safety, turn order, promotion, castling, elimination and replay agree. | `server/partyChess.test.js` |
| Q-A07 | Multiplayer takebacks need every other seated player; draw/rematch participants, elimination boundaries and clocks remain correct. | `server/partySession.test.js` |
| Q-A08 | Two-player online starts require occupied seats and independent readiness; edits clear confirmations. Party rooms start on all configured connected seats, including reconnect or valid count changes; waiting clocks stay stopped, duplicates cannot restart play, and legacy readiness cannot block or reset it. | Readiness/settings cases in `server/index.test.js`; independent-seat and waiting-change cases in `server/partySession.test.js` |
| Q-A09 | Room codes do not authenticate players; illegal, out-of-turn, unseated, stale and replaced-seat actions reject without corrupting the room. | `server/index.test.js`; real-client cases in `server/partySession.test.js` |
| Q-A10 | Remote restart/reconnect restores private seat access, board, history and clocks; public room state does not expose credentials. | Persistence/reconnect/clock cases in `server/index.test.js` and `server/partySession.test.js` |
| Q-A11 | New-mode takeback defaults are correct; a manual mode choice, custom/unlimited allowance and unrelated settings survive revisits. | `server/setupDefaults.test.js` |
| Q-A12 | Hints expose authoritative legal origins/destinations, including en passant/promotion, and nothing when disabled or noninteractive. | `server/moveHints.test.js` |
| Q-A13 | Every physical piece keeps its identity through capture, promotion, takeback, replay, castling, en passant and inactive-army capture. | `server/pieceCharacters.test.js` |
| Q-A14 | Fresh devices use Cartoon + both channels on; stored Off choices and legacy preference migrations remain independent and unchanged by Classic. | `server/animationPreferences.test.js` |
| Q-A15 | New moves play once, channels finish independently, newer shows supersede older ones, and reset/reconnect/undo does not replay old motion. | `server/animationPlayback.test.js` |
| Q-A16 | Board fitting preserves square cells and sticky usability in short/narrow desktop layouts without forcing horizontal overflow. | `server/boardLayout.test.js`; actual browser scroll behavior is Q-M10. |
| Q-A17 | 2v2 settings require four players; allies block but cannot capture/check each other, only the acting army is controllable, and own-king safety/castling remain enforced. Checkmate is judged at the affected turn and ends both sides of the losing team; stalemate draws. Resign/timeout, persistence/replay, unanimous consent, clocks and legacy FFA stay consistent. | Team cases in `server/game.test.js`, `server/partyChess.test.js`, `server/partySession.test.js` and `server/localGame.test.js`. |

## Browser acceptance cases

Use disposable names and an isolated test origin/server. Do not clear the owner's saved game. For online checks use genuinely independent browser sessions; duplicating a tab may copy its seat credential. Record actual CSS viewport dimensions, since browser zoom can differ from window size.

| Case ID | Steps | Required result |
| --- | --- | --- |
| Q-M01 | Same device → Classic → **Review & start**. Inspect the rules before starting. Repeat Endgames and Chaos Kingdom. | Reviewing does not start a game. Complete Black rules face Black; White rules face White. There are no local per-player consent checkboxes. The final **Agree & start game** action is available once the selected setup is valid. |
| Q-M02 | From a valid two-player review, activate **Agree & start game** once by pointer, then repeat in a fresh game using keyboard. | Exactly one game starts with the reviewed rules, entered names, first turn and clocks. No additional confirmation is required. A legal opening move works; the dialog closes cleanly. |
| Q-M03 | Open local review, cancel/close it, change rules or names, and open review again. | Cancel starts nothing. Reopened rules and names match the latest setup, not the abandoned review. The current setup starts with one final action. |
| Q-M04 | Repeat review/start for three and four local players. Finish a short game, then request a rematch. | Shared rules and all selected names/seats are visible, no old checkboxes remain, one final action starts every seat, turns advance clockwise. Rematch retains names/settings and presents the intended fresh shared review. |
| Q-M05 | Try a malformed/ended custom FEN and a Chaos Kingdom capture-king draft missing a king. Correct each setup. | Invalid starts explain the problem without creating/changing a game. Correcting the draft permits the normal review/start flow. Do not count an error message alone as a passed successful-start test. |
| Q-M06 | Start a local game, move, refresh, continue, and leave using its confirmation. | The accepted game restores with matching names, rules, turn/history and clocks. Leaving affects only the disposable local game; no confirmation-state migration blocks older saved games. |
| Q-M07 | In independent sessions test two-player readiness/settings changes, then create three/four-player rooms. Join all but the last seat, disconnect/reconnect an occupied seat, and fill the final seat without clicking I agree. | Two-player partial/stale readiness cannot start play; settings reset both confirmations. Party rooms have no ready button and start only when all configured seats are occupied and connected. Waiting clocks remain stopped; reconnect/duplicate requests cannot restart an active game. Make synchronized legal moves afterward. |
| Q-M08 | Switch connection type and every mode, entering distinct names and a custom takeback allowance. Return to visited modes. | Game choice precedes names; the single three-option multiplayer selector precedes three/four names. Online asks only the current player. Names/manual choices remain intact. Fresh defaults are Ask first/Free/Off as documented; Hints starts off. Custom allowance stays before presets. |
| Q-M09 | Inspect the header in both themes at desktop and 320/390 px. Use **Play**, **Rules**, **About**, and keyboard focus. | Compact crown and Queenie’s/CHESS FOR YOUR CREW stay recognizable, without overlapping navigation. All three actions remain visible and comfortably tappable (44 px target). Play goes to setup before a game and the board during a game. Brand font/weight stays consistent across modes. |
| Q-M10 | Scroll setup in Classic, Endgames, both multiplayer geometries and all three arena shapes, including a short desktop window. Repeat narrow mobile and fullscreen. | Desktop board remains usable/sticky rather than leaving an empty column. Mobile is stacked, with no horizontal page scrolling. Fullscreen keeps vertical scrolling where needed. Controls and clocks remain visible/readable. |
| Q-M11 | Exercise Cartoon with both, board-only, players-only and neither; Classic with By players on/off. Toggle during a capture, then refresh. | Only enabled locations animate. Classic preserves the hidden board preference. Stored choices survive refresh. No hidden piece, orphaned effect or replay remains after a toggle. Hints resets off without changing animation preferences. |
| Q-M12 | Use the capture fixture below with both channels on; play Qd4xd5. Repeat with the opposite color and a pawn capture. | Actual participants approach, contact once around 1 second, defender falls, winner celebrates. Board settles at 1.8 seconds; player-side scene holds both outcome poses until the 3.2-second fade. Moves/clocks remain responsive and stages face the appropriate players. |
| Q-M13 | Use the edge fixture below: Qa4xa5, then Black Rh5xh4. Repeat at 320/390 px and fullscreen. | Left/right encounters use center-file spacing and can cross the rim; upside-down Black keeps its orientation. Viewport clipping is acceptable, horizontal page scrolling is not. Winners settle on the actual squares; no pieces remain hidden. |
| Q-M14 | Inspect all six roles/armies, then capture, promote to queen and knight, undo, reload, and view multiplayer inactive pieces. | Clean transparent atlas crops, stable faces/emblems and recognizable roles/colors. Actual captured character appears. Original Classic SVG artwork still works; missing artwork uses a playable fallback. |
| Q-M15 | Click a pre-game/blocked/opposing queen, then a legally movable/capturable queen; repeat at a multiplayer board edge and in fullscreen. | Tiny themed Queenie’s label appears beside the true square and clears after two seconds. Repeated clicks replace it. Legal selection/capture still works; no out-of-turn move is sent. Label and artwork never intercept input. |
| Q-M16 | Enable the OS/browser reduced-motion preference and repeat hero entrance, queen click, move and capture. Keyboard through setup, review and controls. | Artwork stays visible; only brief 280/450 ms move fades remain, without travel, enlargement, spins or fights. Hero is static, queen lettering skips its hop, focus stays visible, and controls/dialogs are operable by keyboard. Source inspection alone does not pass this case. |
| Q-M17 | Join a room from a second physical device on the same LAN; complete moves and reconnect. | Both devices receive the same authoritative board. This checks LAN access, not internet hosting or publication. Public deployment is a separate explicitly authorized task. |
| Q-M18 | Inspect Same device three/four-player setup and active play at desktop and 320/390 px. Make a move with By players on, turn it off, then inspect independent online seats. | Four-player strips sit Red below, Blue left, Yellow above and Green right of their armies. Three-player names/stages sit below, upper-left and upper-right without the old boxed card row. Each local name, clock and stage faces its own player; stage rotation is not applied twice. Online placement follows the displayed board orientation and only the viewer has a show. Shows off reclaims stage space without hiding names, clocks, emblems or elimination state. No horizontal page overflow or blocked board input. |
| Q-M19 | Compare the upper edges of the desktop game surface and the configuration/game panel in every mode, before and after starting. Scroll a short desktop window; repeat mobile and fullscreen. | The main rounded surfaces begin together, without a left-only stack of headings pushing the board down. The compact hero/signature remains visible, and mode/context information remains available without taking excessive height. Board fitting and sticky fallback remain usable; mobile retains one stacked document scroll. |
| Q-M20 | Start a disposable local game, then create/join an online room. Locate the labelled exit action in each panel header, cancel its confirmation, then confirm leaving. Repeat by keyboard and on a narrow phone. | Exit is a visible text button in the former close-icon position, with a comfortable target and visible focus. Cancel preserves the room/game, moves, names and clocks. Confirm runs the existing leave behavior for that transport; the visible button does not become an immediate destructive exit or change resignation/draw rules. |
| Q-M21 | Use the sequences in ANIMATION_DEMO.md with Cartoon and both animation locations enabled. Record Classic and three/four-player Same device moves/captures through the final celebration; decode each MP4. The older compact Endgames fixture remains available below. | Record the actual interface, complete board and every player show facing its own seat. Ordinary travel and captures follow without unexplained idle gaps or camera jumps. Winners and fallen opponents remain visible through celebration. Encoding preserves game timing with no speed-up or hidden gameplay cut. Probe dimensions/duration and record screenshot-sampling limits. |
| Q-M22 | Select **Three Players**, **Four Players · Free for All**, and **Four Players · Two versus Two** in turn; inspect rules/names/allies, then start locally and through four independent online sessions. Play, resign, reload and request a rematch. Inspect phone layouts. | Exactly three choices appear in one selector before names, with no separate count/format step. Each choice sets count and format together: three FFA, four FFA, or four Teams. Switching from Teams to either FFA choice removes alliances and displays the correct name fields. Teams/FFA copy and results match the selected rules. The final connected online join starts automatically. No ally control is granted; all clients share the same history and both winning colors. Resignation clearly warns of team defeat. Team labels fit the existing surrounding strips. Old FFA games remain FFA. |

Use representative combinations rather than multiplying every dimension into a meaningless count. For a local-agreement/header change, prioritize Q-M01–Q-M09, then a short Q-M10/Q-M11 regression. For animation/layout changes, prioritize Q-M10–Q-M16 plus one independent online move. For the surrounding multiplayer seats and aligned panels, add Q-M18–Q-M20; execute Q-M21 when delivering a new video. Changes to rules, consent, credentials or persistence require the relevant real-client automated cases and independent browser seats.

## Repeatable fixtures

Open Same device → Endgames → Custom position and import the FEN. Review/start explicitly; do not inject state into the app.

| Fixture | FEN | Action |
| --- | --- | --- |
| Center capture | `8/7k/8/3r4/3Q4/8/8/K7 w - - 0 1` | White Qd4xd5; inspect both animation channels. |
| Left/right edges | `7k/8/8/r6r/Q6Q/8/8/K7 w - - 0 1` | White Qa4xa5, then Black Rh5xh4. |
| Compact move and capture | `8/7k/3r4/8/3Q4/8/8/K7 b - - 0 1` | Black Rd6–d5, then White Qd4xd5. Black moves first; both actions are legal and the game remains active after the capture. |

Use the rule suites' disposable fixtures for special-move automation rather than altering personal saves. The existing [ANIMATION_DEMO.md](ANIMATION_DEMO.md) lists current recordings and reusable fixtures; retired recordings are identified in the historical notes.

## Evidence and release gate

Store current automated evidence in `reports/tests/`. Store browser evidence separately in `reports/tests/manual.md`, using this format for each executed case:

```text
Date/time and tested source fingerprint:
Case IDs:
Result: PASS / FAIL / BLOCKED / NOT RUN
Environment: browser, actual CSS viewport, origin, local or independent online seats
Actions and observed outcome:
Evidence: relative screenshot/video path, if captured
Limits or untested variants:
```

Do not mark every case passed because the suite/build passed. Do not carry a previous revision's visual result forward silently. A recorded limitation (for example, unavailable reduced-motion emulation) remains BLOCKED or NOT RUN until exercised. A build failure, failed/incomplete automated suite, or a reproduced relevant browser failure blocks a ready claim; an unrelated unexecuted manual case must be disclosed without inventing results.

Before a release: run the full report once after source settles, build, execute the manual cases relevant to the change, and resolve observed regressions. For an authorized Sites publication, verify that the source package matches the tested revision. A passing local report does not certify future Sites runtime support. Documentation-only edits require content and link checks, without rerunning the game suite or packaging.
