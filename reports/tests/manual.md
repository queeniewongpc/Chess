# Queenie’s browser verification

This records observed checks separately from the case definitions in the root [TEST_CASES.md](../../TEST_CASES.md). Read that catalog before testing and add any new or changed case definitions there; append actual execution evidence here using those case IDs. Executable automated tests remain in `server/*.test.js`. A passing entry covers only its stated actions/environment. Earlier screenshots and PROJECT.md history do not automatically pass the current cases.

## 2026-10-25 — shared-device multiplayer confirmation

- Cases: **Q-M04 PASS for shared start and rematch**; **Q-M03 PASS for the three/four-player cancel path only**. A complete ordinary move cycle was not part of this browser check.
- Environment: Chrome, isolated `http://localhost:5178/`, 1376 × 732 CSS viewport, Same device. Test origin used disposable names; the owner's game was not changed.
- Three-player names: Ada, Linus, Grace. Four-player names: Riley, Taylor, Jordan, Sky.
- Observed: each review dialog had zero consent checkboxes and one enabled **Agree & start game** action. Cancel returned to unchanged setup. One confirmation started the correct seats at Red's turn with zero moves.
- Rematch: resigning two seats in the three-player game and three seats in the four-player game finished play. The next review retained every name and the single action restarted all seats with zero moves.
- Layout: the party dialog kept its final action at the bottom, with complete rules and player list in keyboard-scrollable content. No application console errors or warnings were observed. The temporary test tab was closed.
- Source fingerprint: not captured at the instant of this browser run. Do not substitute a later automated fingerprint as proof of the exact browser snapshot.
- Limits: this entry does not verify two-player mirrored rules, changed-rule review after cancel, online readiness, header behavior, narrow phones, or reduced motion. No screenshot path was supplied for this entry.

## 2026-10-25 — two-player review, keyboard start and restoration

- Cases: **Q-M01/Q-M02 PASS for Classic shared review and keyboard start**; **Q-M03 PASS for Classic cancel and changed-rule review**; **Q-M06 PASS for move/refresh restoration**. These are partial case-group results, not certification of every mode or input method.
- Environment: ChatGPT in-app browser, isolated `http://localhost:5178/`, 1440 × 1000 CSS viewport, Same device.
- Observed: the Classic review showed zero consent checkboxes. Cancel returned keyboard focus to **Review & start**. The rules were changed from Ask first / 3 plies to Free / 5 plies. Reopening showed the updated Free / 5 rules in both complete facing copies.
- Start: one keyboard Enter on **Agree & start game** began Alex/Sam's game with White first and zero moves. White e2–e4 was accepted.
- Restore: reloading restored Black's turn, one move, Alex/Sam, and Free / 5 rules.
- Source fingerprint: not captured at the instant of these browser actions. The separately recorded full automated run below must not be read as a browser-snapshot fingerprint.
- Limits: this entry does not cover pointer activation of the two-player final action, edited player names after cancel, Endgames/Chaos Kingdom review, invalid starts, or the local leave-game path. No screenshot path was supplied for this entry.

## 2026-10-25 — independent online readiness and reconnect

- Cases: **Q-M07 PASS for the two-player independent-readiness, settings-reset and synchronized-play paths**. Online three/four-player readiness and a manually crafted stale confirmation were not rerun in this browser session.
- Environment: two independent in-app-browser origins, `http://localhost:5178/` and `http://127.0.0.1:5178/`, against the disposable in-memory backend. These origins kept independent seat credentials.
- Observed: the host confirmed alone and the room stayed waiting. Changing Ask first to Free and saving returned both seats to Getting ready. The guest then confirmed alone and the room still waited; only the host's subsequent confirmation began White's turn.
- Play/reconnect: e2–e4 and e7–e5 synchronized in both clients. Reloading the host restored two moves, pawns on e4/e5, White to move, and Free / 3 rules. Neither browser recorded console warnings or errors.
- Limits: no physical second device or internet deployment was tested. No screenshot path or browser-run source fingerprint was supplied. The full Node suite separately covers party readiness and stale payloads.

## 2026-10-25 — navigation interactions

- Case: **Q-M09 PASS for active-game Play, local Rules and About interactions**. Header sizing, setup navigation and theme/viewport coverage are recorded separately when exercised.
- Environment: in-app browser at the isolated test origin.
- Observed: Rules opened the complete two-facing local guides; Escape closed them. About opened the correct dialog and Back to board closed it. During an active game, Play scrolled the board to approximately 16 px from the viewport top.
- Limits: this interaction record does not independently verify header target dimensions, every viewport/theme, or pre-game Play. No screenshot path or browser-run source fingerprint was supplied.

## 2026-10-25 — phone setup navigation, Endgames and Chaos Kingdom

- Cases: **Q-M01 PASS for all three two-player mode categories**, combining this entry with the Classic result above; **Q-M02 PASS for pointer start in Endgames/Chaos Kingdom**; **Q-M09 PASS for pre-game Play**. The tested Endgame/arena settings were the defaults, not every custom position or board shape.
- Environment: in-app browser, isolated `http://localhost:5178/`; actual CSS viewports 390 × 844 and 320 × 740, Same device.
- At 390 × 844, Play before starting moved setup to approximately −0.10 px from the viewport top. The default Lucena Endgame review displayed both complete facing rule copies with zero checkboxes. Its final action was visible; one pointer activation started White's turn with zero moves and Free / 3 takebacks.
- After leaving that disposable game, default Chaos Kingdom (8 × 4, capture all) displayed both complete rule copies and zero checkboxes. At 320 × 740, the final action occupied x=28, y=668, width=264, height=44 CSS px, fully inside the viewport with no horizontal overflow. One activation started White's turn with zero moves and Free / 3 takebacks.
- Evidence: [phone shared-start review](../../artifacts/queenie-shared-start-phone.png).
- Limits: browser invalid-draft attempts and the other two arena shapes were not rerun in this pass. Timed-clock behavior, exhaustive input methods and reduced motion were not part of these phone checks. No browser-run source fingerprint was captured.

## 2026-10-25 — compact header and responsive composition

- Cases: **Q-M09 PASS for the measured header/brand layouts below**; **Q-M10 PASS for horizontal-overflow checks at those viewports only**. These measurements do not certify every mode, sticky scrolling or fullscreen.
- Environment: Chrome extension browser, isolated `http://127.0.0.1:5178/`, with explicit viewport overrides verified against `innerWidth` and `documentElement.scrollWidth`. The main user origin was untouched.

| CSS viewport | Actual mode/theme | Observed layout |
| --- | --- | --- |
| 1440 × 950 | Classic / day | Document width 1440; header 74 px; hero 98.148 px. Crown top/bottom 7.316/27.012 px, within viewport. Visible hero signature; brand computed DM Sans 700. |
| 390 × 844 | Classic / day | Document width 390; header 76 px; hero 120 px. All Play/Rules/About targets measured 43 × 44 px. Crown top/bottom 8.92/24.07 px; brand and signature remained visible. |
| 320 × 740 | Chaos Kingdom / midnight, selected through the mode button | Document width 320; header 76 px; hero 115.438 px. Crown, heading, signature and all three navigation controls visible; DM Sans 700 retained. |
| 1280 × 550 | 3–4 Players, four-player preview / midnight | Document width 1280; header 74 px; hero 90 px. Crown, heading and signature visible with no horizontal overflow. |

- Evidence: [desktop header](../../artifacts/queenie-compact-header-desktop.png) and [phone header](../../artifacts/queenie-compact-header-phone.png). These are the 1440 px and 390 px Classic views respectively.
- Limits: this layout session did not activate navigation, enter names, start games, inspect agreements, exercise Endgames or the three-player board, or emulate reduced motion/reload timing. Navigation activation and agreements are independently recorded above. No source fingerprint was captured during the layout checks. The temporary Chrome tab was closed and viewport override reset afterward.

## 2026-10-25 — compact ordinary-move and capture video

- Case: **Q-M21 PASS for the recorded two-player Endgames sequence**. This is actual browser/encoded-video evidence, not a concept animation.
- Environment: in-app browser, isolated `http://localhost:5179/` with an in-memory backend on port 3005, 1440 × 1000 CSS viewport, Same device, Cartoon with On board and By players on. The disposable FEN was `8/7k/3r4/8/3Q4/8/8/K7 b - - 0 1`; the owner's saved games were not changed.
- Observed: Black Rd6–d5 was accepted at approximately 0.829 seconds; White Qd4xd5 followed at approximately 3.096 seconds. Ordinary movement flowed promptly into the capture. The board and both opposing player-name shows rendered together, facing their players. The queen celebrated beside the fallen rook through the player-side sequence, with no long idle gap between actions.
- Capture method: one continuous sequence of 84 browser screenshots from 0.023 to 6.391 seconds, encoded by holding samples at their original timing. No interpolation, animation speed change, or gameplay cut was used. The 30 fps output is an encoding rate, not a claim of 30 distinct screen samples per second.
- File verification: the silent H.264 MP4 probed as 1440 × 1000, 30 fps, 6.4 seconds and 1,855,595 bytes. Encoded contact and victory frames were decoded and checked, including the 5.5-second frame. Both moves are legal; the game remains active after the capture.
- Evidence: the historical compact recording was verified at the time and removed on October 26, 2026. The [repeatable FEN](../../artifacts/compact-move-capture.fen), and [demo instructions](../../docs/ANIMATION_DEMO.md) remain available.
- Source fingerprint: not captured at the instant of the recording. Do not apply a later automated fingerprint retroactively to the browser sample.
- Limits: this video demonstrates two-player move/capture timing and visuals only. It does not independently pass multiplayer seating, every phone viewport, online synchronization, special moves, or reduced motion.

## Historical automated evidence

The full report completed at **2026-10-25T19:43:30.516Z** on Node v24.21.0: **123/123 passed**, zero failures, cancellations, skips or todo cases. Source/artwork SHA-256: `fbd50c8214e8d3a2b142953835ae53a2ab896b651cd48f573903fa4b7bed1865`; files were unchanged during that run. The latest report files have since been refreshed; this paragraph records the earlier run only. Node-suite evidence is not a substitute for browser cases.

## Unexecuted scope at the earlier header checkpoint

The unlisted variants of Q-M02–Q-M04, Q-M06, Q-M07, Q-M09 and Q-M10 were **NOT RUN at that checkpoint**. Q-M05, Q-M08 and Q-M11–Q-M17 were **NOT RUN at that checkpoint**. Prior animation/geometry evidence remains historical in PROJECT.md. The automated report cannot change these manual statuses.

Append observations with case IDs, actual CSS viewport, steps, outcome and limits. Update this unexecuted list when evidence is added; never turn a planned checklist into a passed record.


## 2026-10-25 — surrounding seats, aligned surfaces and visible Leave

This entry supersedes the earlier layout checkpoint only for the cases and combinations listed here. Tests used disposable local origins on port 5179 and an in-memory backend on 3005; no owner saves were changed.

- **Q-M18 PASS for the following combinations:** Chrome and the in-app browser at 1440 × 1000 inspected four shared-device strips (Red bottom, Blue left, Yellow top, Green right), with complete 0/90/180/270-degree strip rotations. Actual Red g2–g4 and a separate d2–d4 check showed all four player animations. Three-player names/stages were transparent and borderless, rotated 0/120/240 degrees. Actual rh2–rh4 and be2–be4 moves advanced turns and displayed all three shows with no second stage rotation. Geometry and legal moves were unchanged.
- Phone checks: 390 px three-player shared layout, 390 px four-player shared layout, and 320 px four-player shared layout kept all strips and produced no document overflow. By players Off removed the stage elements and contracted the strips (approximately 205 to 133 px in the 320 px check). Online Blue preview was checked at 320 px for both counts; Blue remained below and remote labels were upright. These are browser viewport checks, not physical-device tests.
- **Online Q-M05/Q-M18 PASS for a real three-seat room:** three independent Chrome seat sessions (localhost Red/Yellow in separate credential-bearing tabs; 127.0.0.1 Blue) joined normally. Red alone and Red+Blue readiness did not start; Yellow's own agreement started. Red ra2–ra4 synchronized to all three, each showing Blue to move and the same first history entry. During playback each client had exactly one active stage for its own color. Blue's strip was below, other positions matched the rotated armies, and every online name was upright. No four-seat online game was played in this revision.
- **Q-M19 PASS for measured top alignment and responsive scope:** at 1440 × 1000, Classic setup and active three/four-player surfaces aligned with the right panel at y=141.5 px. At 1280 × 700, Endgames and all three Chaos Kingdom shapes aligned at y=138 px. The compact hero retained mode/context and the signature. The 4 × 8 short-window check kept the board sticky with its expected negative top (-30 px) while the panel scrolled to -560 px. 390 × 844 Classic and 320 × 740 Chaos had no horizontal overflow. In-app fullscreen activation did not enter fullscreen, so this revision does not claim a successful fullscreen browser check.
- **Q-M20 PASS for local interaction only:** the visible Leave control opened the existing confirmation. Keep playing retained the prepared game's two moves; keyboard Enter reopened the dialog; confirming Leave returned to setup. The 390 px view retained its labelled button. The online button uses the same unchanged confirmation path, but online cancel/confirm leaving was not separately exercised here.
- Browser warning/error log was empty in the in-app session after the recorded local moves. Reduced motion and every possible long-name/timed/eliminated layout were not re-exercised.
- Evidence: [four-player table](../../artifacts/queenie-four-player-seats.png), [three-player table](../../artifacts/queenie-three-player-seats.png), [independent online Blue view](../../artifacts/queenie-online-three-seats.png). Q-M21 video evidence is above. Browser source fingerprints were not captured at each observation; do not assign the automated fingerprint retroactively.

Latest full automated run finished at **2026-10-25T20:21:32.024Z** on v24.21.0: **125/125 passed**, with no failures, skips, cancellations or todos. Source/artwork SHA-256: `74d534f3f4090bc596fca663d34024e01dcd40ecf20ce885e89e4ee34c72a90e`; files remained unchanged during the run. Two new cases check local/online seat orientation and placement clearance. See [latest.md](latest.md) and [latest.json](latest.json).


## 2026-10-25 — automatic party start and four-player animation inspection

- **Q-M07 PASS for the following revised startup scope:** Chrome used three independent sessions on isolated 127.0.0.1:5182 / localhost:5182, with an in-memory server on 3008. A timed three-player room (Alex/Riley/Jordan) showed no I agree control. With two seats filled it remained Gather your crew / Waiting for Yellow, and every clock remained 10:00 across the setup interval. The final Join the game immediately changed every page to The game is on / Red to move. Red rd2–rd4 synchronized to all three histories and advanced to Blue. A separate Classic room still displayed its I agree button. Console errors were empty. Evidence: [automatic-start game](../../artifacts/queenie-party-auto-start.jpg). Four-seat automatic start, disconnected-seat reconnect, persisted waiting rooms and count changes are covered by the automated real-client tests, not claimed as additional browser runs.
- **Q-M18 PASS for inspected four-player shows, with no source change:** isolated 5181/3007 shared-device game at 1440 × 1000, 320 × 740 and 390 × 844. Legal sequence j2–j3, b6–d6, d13–d12, m6–k6, Bi1xm5 produced a Red capture; d6–e6, d12–d11, Bn6xm5 produced a Green capture for the phone check. All four stages faced 0/90/180/270 degrees and showed the same actual attacker/victim identities. At about 1.9 seconds the celebration and fallen opponent remained visible. Stage bounds were approximately 203 × 42 px on desktop and 109 × 26 px at 320 px, without horizontal overflow or name/clock overlap. By players Off removed every stage and contracted strips; On restored idle stages without replay. No console errors. Evidence: [desktop capture](../../artifacts/queenie-four-capture-review.png), [phone capture](../../artifacts/queenie-four-phone-capture.png). Long timed names, all capture types, fullscreen and reduced motion were not re-exercised.
- The owner's 5179 page and proxied /api/health were checked separately after background startup; the actual page loaded and its create-room control was connected. This process is retained. Disposable QA tabs and servers are cleaned up independently. No production publication or owner game mutation was performed.

Full-suite evidence: **128/128 passed**, finished `2026-10-25T20:33:56.967Z`, source/artwork SHA-256 `155f8609f3fe9eaf2c7692192fc8b958562f1e2a9159dff6f134815172084bc3`; no failures or skips and no changes during the run. Browser observations have no independently captured source fingerprint.


## 2026-10-25 — 2v2 Teams (Q-A17 / Q-M22)

QA used a disposable in-memory backend on port 3009 and frontend on port 5183. No owner room or saved game was changed. Browser actions used the ordinary UI, without injected application state.

- Chrome local setup: four players → Teams → three players resets to FFA; returning to four stays FFA until explicitly selecting Teams. Teams survives Classic → multiplayer; party takebacks remain Off. Complete shared rules and ally names appear before one shared start. Real g2–g4 and d2–d4 moves work; all four player-side stages are present. Blue resignation clearly warns of whole-team defeat and ends with Red & Yellow win. Reload retains that result, and local rematch retains all four names/settings.
- Desktop local CSS viewport 1376 × 774: both rounded surfaces begin at y=138; document width matches the viewport. Phone checks at 390 × 844 and 320 × 740: no horizontal overflow, format buttons and ally labels fit, and the shared review has a visible 44 px start target below scrolling rules. Actual local d2–d4 was played at 320 px. Console warning/error logs were empty. Evidence: `artifacts/queenie-team-local.jpg` and `artifacts/queenie-team-phone.jpg`.
- Four separately created in-app browser tabs each joined an online seat with a distinct name. The final connected join started the timed 2v2 game without any ready button; waiting clocks had remained at 10:00. Red h2–h4, Blue b7–d7, Yellow g13–g11, Green m8–k8 formed one complete cycle. All four views showed the same four moves, Red to move, and both team/name pairings. Clicking an allied Yellow pawn in Red's tab selected nothing and offered no legal destinations. Reloading Yellow reclaimed the same seat and current game.
- Blue confirmed resignation from its own online session after the team-loss warning. All four clients showed Red & Yellow win / Blue resigned. Team victory, the same intact final board and matching history. No console warnings/errors appeared in any of the four sessions. Screenshots: `artifacts/queenie-team-online.jpg` and `artifacts/queenie-team-result.jpg` (browser screenshot output 1280 × 720; this is the captured pixel size, not a claim of a 1440 px CSS viewport).
- Full Node regression: **151/151 passed**, finished `2026-10-25T20:52:36.242Z`, no failures/skips/cancellations/todos, source/artwork SHA-256 `06c4d7e9ead3c871a4f19b8402daa361ee96a3ac92a1cdce54038736c5e63e12`, unchanged during the run. Team engine fixtures separately exercised checkmate/rescue timing, stalemate, threefold/200-ply draws, every army's ally restrictions/castling/promotion and resignation/timeout; real-client tests covered unanimous consent, rematch, pending-clock timeout and server restart/reconnect.

Scope limits: browser checkmate/timeout and online rematch were covered by automated fixtures/real clients, not repeated manually. This pass did not re-emulate reduced motion/fullscreen, test a second physical device or publish to a public host. Existing historical browser evidence above remains historical, not a claim that every case was repeated for this revision.


## 2026-10-25 — three direct multiplayer choices

Verified on isolated port 5183 with an in-memory backend on 3009. This is a selector refinement; authoritative game rules were unchanged.

- Exactly three buttons appear in one Multiplayer format group: Three Players, Four Players · Free for All, Four Players · Two versus Two. Each click selects just one button and immediately updates the board/count/alliance copy. Three Players yields the 96-cell board without alliances; the other two yield the 160-cell board with the matching FFA or Teams rules.
- Same-device choice updates three/four name fields and Ally labels appropriately. The direct Teams choice opens the existing correct four-seat Teams review with one shared start. The separate player-count and format groups are gone.
- At 1280 × 720 CSS pixels the three cards are 98 × 104 px and fit in one row. At 320 × 740 they stack into three 260 × 64 px targets; text is readable and document width remains 320 px. Actual captures: `artifacts/queenie-three-choices-desktop.jpg`, `artifacts/queenie-three-choices-phone.jpg`.
- Created an online team room from the direct choice, then joined a second independent browser tab. Editing the waiting room to Three Players and saving changed both views to a three-seat 96-cell game without ally labels, preserving the two occupied seats and waiting for Yellow. Neither view exposed a separate readiness button. Both console warning/error logs were empty.
- Full regression **151/151 passed**, zero failures/skips/cancellations/todos, finished `2026-10-25T21:38:44.048Z`. Source/artwork SHA-256 `16ba9752d769598902ce539a32ec802a90f57fd44caeb3106f5e03131177189f` remained unchanged during the run. Existing end-to-end rule tests were rerun; no implementation-mirroring test was added for this reversible presentation change.

This pass did not repeat the previous revision's full four-player game, physical-device networking, fullscreen or reduced-motion checks. Prior evidence remains labelled by revision. No publication occurred.


## 2026-10-25 — three short gameplay videos (Q-M18 / Q-M21)

Recorded actual browser gameplay in Same device mode on disposable 127.0.0.1:5183 with an in-memory backend on 3009. No application source or animation timing changed. All clips use Cartoon and both animation locations, untimed clocks, Hints off and standard starting positions. The 1440 × 1000 CSS viewport retains the complete board and every player stage. The recording camera stayed at scrollY=0; final takes use coordinate clicks on observed cell centers to avoid locator-induced scrolling. Earlier exploratory takes were replaced by these fixed-camera versions.

| Video | Actual sequence | MP4 duration | Captured screenshots | File size |
| --- | --- | --- | --- | --- |
| `artifacts/queenie-demo-classic.mp4` | e4, d5, exd5, Qxd5 from the opening position | 11.800 s | 106 | 4,610,383 bytes |
| `artifacts/queenie-demo-three-players.mp4` | After re2–re4 / be2–be4 / ye2–ye4: Red Qrd1–rg4, Blue be4×re4, Yellow Byf1×rg4 | 9.503333 s | 83 | 4,350,092 bytes |
| `artifacts/queenie-demo-four-players.mp4` | After d2–d4 / b5–c5 / k13–k11 / m10–l10: Red d4×c5, Blue b7–d7, Yellow k11×l10, Green m11×l10 | 12.853333 s | 113 | 5,386,202 bytes |

Three/four-player sequences were first validated with the real PartyChess engine, then played through the normal UI from initial positions. Every multiplayer color contributes a recorded move. All players remain active and no game ends. Both clips are Free for All; 2v2 is not demonstrated. UI histories/turns matched each sequence and console warning/error logs were empty.

The silent H.264 movies are encoded at 30 fps using measured screenshot times and frame holds, without interpolation, game-speed changes or action cuts. Median capture intervals were 0.098 s / 0.09825 s / 0.100 s; largest gaps were 0.466 s / 0.5295 s / 0.5545 s respectively, including interaction/observation work. Thus the encoded frame rate is not a claim of native 30 fps capture. Setup is omitted before each continuous clip; only short pauses remain between full player shows.

Native AVFoundation decoding verified each clip at ordinary motion, contact and celebration. Full board boundaries and all player-stage orientations remain visible: Classic 0/180 degrees, three-player 0/120/240 degrees and four-player 0/90/180/270 degrees. Winners and fallen opponents remain visible in the player shows after the board effect ends. Decoded contact posters are stored beside each MP4 as `-poster.png`. Public move/time metadata and repeat instructions are in `artifacts/demo-sequences.json` and `docs/ANIMATION_DEMO.md`.

This media-only pass does not claim a new game-rule regression run, online multiplayer verification, physical-device recording or reduced-motion/fullscreen verification. The preceding 151/151 report remains the latest automated source check. The owner's saved games and 5179 preview are preserved; no publication occurred.


## 2026-10-25 — matching remote-mode videos (Q-M07 / Q-M18 / Q-M21)

Recorded three additional Play online clips using nine independent browser tabs with separate authenticated seats on an isolated in-memory server (frontend 5183, backend 3009). The normal UI created/joined each room and submitted every move. Classic used two separate rule confirmations; the three/four-player rooms started on the final connected arrival. No application state was injected, source changed, or owner save edited.

- Classic: White/Alex's fixed view records e2–e4, d7–d5, e4×d5, d8×d5. Black/Sam submits Black's moves in its own tab. Both histories show the same four moves and White to move at the end.
- Three-player Free for All: Yellow/Jordan's fixed view records the identical three moves after the same three opening pawn moves as the Same device clip. Red/Alex, Blue/Riley and Yellow/Jordan each act through their own seat. All three histories end with six moves, Yellow Byf1×rg4 and Red to move.
- Four-player Free for All: Green/Taylor's fixed view records the identical four moves after the same four opening moves. Each of the four players submits its own move. All four histories end with eight moves, Green m11×l10 and Red to move.
- Every multiplayer client has exactly one player-show slot. Names remain upright (the seat transforms contain translation only); screenshots confirm upright piece artwork and a board oriented toward the viewer. The three recording views use 1440 × 1000 at scrollY=0; other acting clients use 1280 × 720. No warning/error console entries appeared in any of the nine clients.
- Recorded frame counts are 101 / 71 / 90. Median screenshot intervals are 0.101 / 0.10325 / 0.118 seconds, with maximum interaction/observation gaps of 0.5195 / 0.601 / 0.630 seconds. H.264 output holds these real screenshot samples on a 30 fps timeline; it does not interpolate frames or change game speed. The sequences, fixed viewers and final media metadata are preserved in `artifacts/remote-demo-sequences.json`.
- Existing Same device recordings remain available. Demo videos are local optional artifacts and remain excluded from the Sites ZIP. The disposable recording tabs and server were closed; the owner's 5179 frontend and 3006 health endpoint both returned HTTP 200 afterward.

This media-only pass verifies online mode with independent local browser clients, not separate physical devices, internet latency, Teams gameplay, reduced motion or fullscreen. The earlier 151/151 result remains the latest full automated source check; no new rule regression run is claimed. Nothing was published.

Final native media verification: all three files decode as H.264 (`avc1`), 1440 × 1000, 30 fps. Durations and sizes are Classic **11.800000 s / 4,510,764 bytes**, three players **9.501667 s / 4,279,311 bytes**, and four players **12.851667 s / 5,386,596 bytes**. Decoded contact and celebration frames show the complete boards and upright viewer-side action; the final four-player fade is visible at 12.8 seconds. Comparing the static header patch across every source frame produced a maximum difference of zero, confirming a stationary camera. Decoded `-poster.png` images accompany each local MP4. Original videos were preserved, and temporary encoder sidecar files were removed.
