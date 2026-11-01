# Queenie’s: local play and testing

Start with [AGENTS.md](../AGENTS.md) and [PROJECT.md](PROJECT.md). Before running or adding tests, read the root [TEST_CASES.md](../TEST_CASES.md). Add all new automated/manual case definitions there and update changed cases in place. Preserve executable tests in `server/*.test.js`; implement new automated assertions there and update the corresponding Markdown entry in the same change. This document explains environment setup, [TESTING.md](TESTING.md) explains execution/evidence, and `reports/tests/` holds actual results.

## Run locally

Install Node.js 22 or newer. Open a terminal in the project root, the folder containing `package.json`. Use the project's actual location; no fixed directory path is required. On the first run, install dependencies and start the app:

```sh
npm ci
npm run dev
```

The first install needs internet access. Install dependencies on the current computer rather than reusing `node_modules` from a different operating system. No API key, Sites account, `.env` file, or external database is required for local play. The server creates its local `.data/` storage when needed. On later starts, `npm run dev` is sufficient unless dependencies have changed or are missing.

Open **http://localhost:5173**. The command starts both the web interface and the game server. Verify that the page loads and **http://localhost:3001/api/health** responds before reporting a successful start. If a port is occupied, inspect the running service and terminal output rather than stopping an unrelated process. Keep the terminal running while you play; press `Ctrl+C` to stop it. Next time, run `npm run dev` in the project root and open the address again.

The frontend expects the game server on port 3001 during development. If you change that port, also update the proxy targets in `vite.config.js`.

### The owner's 5179 preview

The owner also uses **http://127.0.0.1:5179/**. A background preview has been left running on this Mac; do not close it as QA cleanup. It serves the same source with a separate backend on port 3006 and private rooms in `.data/rooms-5179.json`. Ports 5173/3001 remain available for the original development setup. Different origins retain separate browser saves and credentials.

After a shutdown, or if that preview is no longer running, open the project folder in Terminal and run **`npm run dev:5179`**. Keep that terminal open. The command reports a port conflict instead of silently moving the game to another address; check the existing preview before starting a second copy. This is local hosting: the computer must be running and awake. It is not a published website or a login-start service.

### Test two players on one computer

1. Open the app in a regular browser window. Choose **Play online**, select a game, enter your nickname, and create a room.
2. Open the same address in a different browser or a private window. Enter a different name and join with the room code or invitation link.
3. Review the rules in both windows. Each player confirms readiness; the game starts when both agree.
4. Alternate moves. Try a takeback, refresh a page to reconnect, and test a rematch after the game ends.

Use independent browser sessions. Duplicating a tab can copy its seat credential and reconnect as the same player.

### Test three or four players

Choose **Play online → 3–4 Players**, then **Three Players** or **Four Players · Free for All**, and enter your name. Create a room and join from two or three more independent browser sessions or devices. The room starts automatically when all selected seats are occupied and connected, without separate acceptance buttons. Missing or disconnected seats keep the room waiting and clocks stopped. Rules remain visible before play. Play a complete turn around the table, refresh one seat to reconnect, and confirm the others retain the same board. Try resignation: that player becomes inactive and the remaining players continue.

For a quick single-screen test, choose **Same device → 3–4 Players**, then **Three Players** or **Four Players · Free for All**. Enter each player's name, choose **Review & start**, read the shared rules, then choose **Agree & start game** once for the whole table. All players share the board; their pieces face their seats. To test takebacks, change Off to Ask first before starting: all other seats must approve. A draw needs all active players; an online rematch needs all seated players.

### Test 2v2 Teams

Choose **3–4 Players → Four Players · Two versus Two** directly; no separate player-count selection is needed. Red/Yellow and Blue/Green are fixed partners. Both Play online and Same device are supported. Selecting **Three Players** returns to three-player Free-for-all; selecting **Four Players · Free for All** retains four seats and removes the alliances. For online testing, use four independent tabs/sessions; the final connected arrival starts the room automatically. Each seat must control only its own army, and ally pieces cannot be captured.

Check that all four names and Ally labels are readable, both winning colors appear after a resignation, and the final board stays intact. A player who is checkmated on their turn loses for the team; stalemate draws. The full rules and draw cases are in [MULTIPLAYER_RULES.md](MULTIPLAYER_RULES.md). Q-A17/Q-M22 in [TEST_CASES.md](../TEST_CASES.md) list the relevant verification; a listed case is not evidence of execution.

### Test a computer and a phone

Connect both devices to the same Wi-Fi network. Use the **Network** address printed by the development server, such as `http://192.168.1.20:5173`, on both devices. Create and join the same room.

`localhost` on a phone means the phone itself, not your computer. If the operating system asks whether Node may accept local network connections, allow the connection for this test. Guest Wi-Fi with client isolation can prevent devices from reaching each other.

### Play on one phone

For a two-player game, choose **Same device**, select the rules, and choose **Review & start**. Read both facing rule panels, then the upright player chooses **Agree & start game** once for both players. White sits at the bottom of the screen; Black sits at the top. The pieces and player panels face their respective players. Select the acting side when offering a draw, resigning, or requesting a takeback. Approved takebacks are confirmed by the other player on the same device. Before starting, each player sees a complete agreement and rules panel facing them. With hints on, movable pieces are marked; select one to see legal destinations. Toggle hints off to hide these markers.

## Try the piece animations

Choose Cartoon or Classic under **Pieces**. Cartoon shows two independent switches: **On board** and **By players**. Either, both, or neither can be on. Classic shows only By players, remembering the hidden board choice for a later return to Cartoon. Fresh defaults are Cartoon + board on + players on. Previously saved choices, including Off, remain unchanged. Hints start off.

1. Play a Same device Classic game. Try all four Cartoon switch combinations on ordinary moves and captures. Only the enabled locations should play; neither should produce no move effects. Classic must offer only the player-side switch with either On or Off. Refresh to check retained animation choices; Hints should start off again.
2. With both locations on, capture a piece. Check the exact two rendered porcelain characters through ready, strike, fallen, and celebrate poses. There should be one readable arm contact at about 1 second, aligned in both locations, with modest on-board enlargement and restrained impact marks. For the queen-versus-rook reference, the queen extends her arm, the rook falls onto its side, and the joyful queen raises her arms. The board scene finishes at 1.8 seconds; beside the names, the captured character should remain visibly fallen next to the celebrating actual winner until the final fade at 3.2 seconds. Neither participant should simply vanish at contact. This replaces the older three-clash/early-loser-exit sequence. Ordinary moves still use 0.9 / 2.1 seconds respectively. Effects must never block the next move or stop clocks.
3. Toggle either switch during playback. Check that no piece remains hidden and no old move replays. Make a capture followed quickly by an unrelated reply: an older show must never reappear after the newer show ends. Switching Classic and Cartoon must not silently enable another channel.
4. Verify both two-player rows face their players, all three/four-player stages face their seats, and an online client has a stage only beside its own name. Two independent clients may select different combinations while receiving the same authoritative moves and character identities.
5. Check castling's two characters, en passant's actual captured square, promotion's stable identity, takeback, and reconnect without replay. Test narrow phones, all Chaos Kingdom shapes, hex/cross boards, fullscreen, rotation, and desktop sticky layouts. Capture effects may overlap neighboring squares and cross the left/right board rim, keeping normal horizontal spacing. A narrow viewport may clip them; do not introduce horizontal page scrolling. Effects remain pointer-transparent.
6. Reduced motion keeps characters and uses short fades, skipping fight motion, enlargement, spins, and confetti. Hints remain optional legal-move markers rather than strongest-move advice.

This checklist describes expected behavior, not a claim that every browser/device has been tested. The final PROJECT.md entry records completed checks. Hero and queen-click decorations remain independent.

For the Classic, three-player and four-player videos in both **Play online** and **Same device**, with legal setup sequences and recording details, see [ANIMATION_DEMO.md](ANIMATION_DEMO.md). Same device shows face each seat; Play online records one viewing player with upright names and only that player’s show. The online recordings use independent local browser clients, not an internet deployment or separate physical devices. Videos remain in the local project and are omitted from the Sites ZIP; repeat instructions and sequence metadata remain included. Only the six current MP4 demos are retained; older recordings have been removed. See [ART_ASSETS.md](ART_ASSETS.md) for the locally bundled neutral/action atlases and table scenes.

## Rules included

Choose **Play online** or **Same device**, then choose the game before entering names. The **Takebacks** section controls second chances. A fresh setup suggests Ask first for Classic and Free for Endgames/Chaos Kingdom; 3–4 Players defaults to Off. The initial per-player allowance remains 3. Change these before play if desired. Revisiting a mode keeps its manual takeback selection for the current setup session, and switching modes preserves custom allowances. Hints start off; when enabled they show legal moves, not best-move advice. These suggestions do not replace an existing game's agreed rules.

- **Classic chess:** standard 8 × 8 play, including check, checkmate, castling, en passant, and promotion to queen, rook, bishop, or knight.
- **Endgames and custom positions:** six teaching positions, a board editor, and FEN import. Standard positions require one king per side. Editing the board clears castling and en passant rights; a valid imported FEN can retain them.
- **3–4 Players:** choose **Three Players**, **Four Players · Free for All**, or **Four Players · Two versus Two**. The three-player board has 96 cells; both four-player options use the 160-cell cross. Use familiar chess moves, protect your king, and take turns clockwise. In free-for-all, checkmate/stalemate on your turn, resignation, or timeout eliminates your seat; the last active player wins and inactive armies stay as capturable blockers. In Two versus Two, Red/Yellow face Blue/Green; checkmate, resignation or timeout defeats the entire team, while stalemate draws. See [MULTIPLAYER_RULES.md](MULTIPLAYER_RULES.md) for movement and consent details.
- **Chaos Kingdom:** choose 8 × 4, 4 × 8, or 8 × 8. Select 1–16 pieces per side (maximum 15 without kings), then edit their starting squares. Tap a piece, then an empty square to move it or an occupied square to swap. **Own half** keeps White below and Black above during setup; **Anywhere** removes that setup restriction. Each side can add or remove its king independently. Choose **Capture all pieces** (kings optional) or **Capture the king** (one king per side required before starting; the first captured king ends the game). This mode has no check, checkmate, castling, en passant, or initial two-square pawn move, including on 8 × 8. Pawns promote upon moving to the final rank. No legal moves, repetition, or the 50-move rule can draw.
- **Takebacks:** choose Off, Free, or Ask first before starting. Presets are 1, 3, 5, 10, and unlimited; the custom number field comes first and accepts a positive safe integer. The plies unit and its meaning appear above the choices. Each player has a separate allowance for the whole game. Reversing one player's move costs one unit, also called a ply; reversing a two-player round costs two. In a three/four-player game each individual move still costs one ply. Ask first requires every other seated player; takebacks cannot cross a resignation or timeout. The requesting player pays for all reversed plies. Rejected requests cost nothing. A finished game cannot be undone.
- **Agreement:** any seated online player can edit the rules while the room is waiting. Two-player edits clear both ready states, and both players confirm the final settings. Online three/four-player rooms, including Teams, start automatically when every configured seat is occupied and connected. Same-device start uses one shared confirmation after review; takeback, draw and rematch consent remain unchanged.
- **Clocks:** untimed, 10 minutes, 5 minutes + 3 seconds per move, or 3 minutes + 2 seconds per move. Disconnecting does not stop a clock. A pending takeback charges the requester's clock and blocks moves; a takeback never restores time already spent.

The endgames are the Lucena position, Philidor position, Réti's 1921 study, opposition, queen-and-king mate, and rook-and-king mate. Réti is a historical composition; the other entries use Lichess teaching positions. Each entry links to its source in the game and in `shared/endgames.js`.

## Check branding and theme switching

The header, footer, browser title, and About dialog should use **Queenie’s**. The small brand line is always **CHESS FOR YOUR CREW**. The current art direction is Porcelain Playhouse: Classic/Endgames use an ivory day room; Chaos Kingdom/3–4 Players use a midnight navy room. Both use rendered table backgrounds, inset player plates, raised board edges, slate/warm-stone squares, champagne details, and consistent DM Sans type. `src/tabletop-scene.css` supplies the shared composition; the last-imported `src/party-table.css` places multiplayer strips around the board. The compact hero/signature remains visible in both setup and active games, including phones. Switching modes must not change rules, army identity, orientation, saved names, or game state.

- Inspect all modes at desktop and narrow phone widths, including the three-player hexagon, four-player cross, and every Chaos Kingdom shape. Check sticky scrolling and fullscreen, with animations both on and off. Desktop sizing now requests minimum 48 px cells for two-player boards and 32 px for multiplayer, capped by natural width. In short windows the taller panel may scroll partly above the viewport before sticking; verify that the board remains present instead of reverting to a blank left column. Do not judge the current rendered layout by the earlier 32 px two-player sizing record.
- Check names, clocks, setup fields, roster steppers, selected controls, FEN errors, hints, move history, and both facing agreement panels in each room. Text and selection boundaries must stay readable, with no leftover plum backgrounds or green-only legacy controls.
- Verify all six rendered porcelain silhouettes at actual board size. Check that local PNG atlas crops are clean and transparent, with no clipped crowns, neighboring frames, or missing assets. Identical pieces need distinct stable faces/emblems; multiplayer colors and small seat emblems remain recognizable. Promotion must preserve the pawn’s identity and maker’s mark. Classic must retain its original SVG silhouettes, and switching styles must not alter either animation preference. Artwork failure must use its fallback without preventing moves. Asset layout and replacement guidance is in [ART_ASSETS.md](ART_ASSETS.md).
- Confirm that the day/night scene images appear behind the live board, with props confined to the decorative background. Squares, labels, names, timers, and controls must remain clear. No plant, book, lamp, or other generated prop should behave like a control or cover a playable target. The cross/hexagon should retain transparent surroundings rather than an unrelated square slab.
- Capture with both locations on. The same real winner/victim should remain recognizable through the synchronized single contact, fallen defender, and winner’s raised-arm celebration. Beside names, the fallen defender stays visible alongside the winner until the final fade. Check that quiet idle stages blend into the name row without a large empty colored box.

These are visual acceptance checks, not a claim that every device has been tested. Consult the latest verification entry in PROJECT.md for completed checks.

## Saved games

The Node server validates and synchronizes remote games. It saves rooms in `.data/rooms.json` and reloads them on restart. A room is removed after more than 24 hours without activity when every player is disconnected. The file contains private room state and must not be shared in a source archive.

Each remote seat has a private credential stored in the current tab's `sessionStorage`. Refreshing or a brief network interruption can reconnect using that credential. Closing the tab, clearing browser data, or switching devices can lose access to the seat. A room link alone does not reclaim an occupied seat.

Same-device games use the current browser's `localStorage` and can resume after a refresh. Leaving the local game clears that saved game. If storage is unavailable, play can continue in the open page but refresh recovery is not guaranteed.

## Checks and production mode

The verification records below describe their respective earlier revisions. They are historical evidence, not a claim that the current rendered artwork, tabletop composition, larger minimum cells, or single-contact capture sequence has passed those same checks. The final entry in [PROJECT.md](PROJECT.md) records the current revision's actual verification scope.

Verified on October 22, 2026: all 49 automated tests and the production build passed, with English layouts reviewed on desktop and mobile, both win conditions played locally, and rule editing/readiness/moves verified with two separate online seats. Product source and documentation are English; existing user-entered names and saved personal content are preserved.

The October 23 layout correction passed four focused sizing tests and browser checks for every desktop mode at 1280 × 550, very short windows, and mobile breakpoints. To check the original regression, select the 4 × 8 Arena and scroll to the takeback settings in a short desktop window: the main board must remain visible. Repeat with Classic and Endgames. Phone layouts should still scroll normally. See PROJECT.md for the full verification record.

The later October 23 setup-order update passed five focused preference tests and desktop/phone checks for game-before-name ordering, one online nickname versus two local names, first-visit takeback defaults, remembered manual choices, custom allowances, and unchanged hint toggles. Both local agreement panels showed the selected Free rule and custom allowance. The production build passed.

The completed multiplayer update passed **86/86 automated tests**. Browser testing covered three-player shared-device agreement, moves, takebacks, reload, elimination, and rematch; four independent online seats covered synchronized moves, unanimous undo/draw/rematch, and reconnection. Short desktop windows and narrow phones were rechecked. See PROJECT.md for exact scope and screenshots.

The Queenie’s visual/copy refresh passed 26 focused tests and browser checks for shared/restored themes, multiplayer joining, local agreement and moves, short-window sticky boards, and 390/320 px phone layouts. See PROJECT.md for scope, screenshots, and the distinction from the earlier full integration run.

The initial October 25 cartoon-piece and move/capture animation implementation reached **107/107 automated tests** after an earlier 106-test checkpoint, with production-build and browser verification recorded in PROJECT.md. Those results predate the later independent Pieces/Animation controls, larger role hats, and player-name show placement. The checklist above describes verification steps for the updated behavior, not completed results for those refinements.

Run the checks:

```sh
npm run test:report
npm run build
```

After building, start the production server:

```sh
npm start
```

Open **http://localhost:3001**. The `PORT` environment variable changes the production port. The server serves the frontend build and Socket.IO from the same origin. The health endpoint is `/api/health`.

Friends on different networks need the same reachable internet server. A static frontend upload alone does not run the remote-game service. Local and same-Wi-Fi testing do not require publication.

The subsequent October 25 player-show refinement passed **116/116 tests** and production compilation. Its browser checks cover the five radio combinations, two independent online clients, same-device shows, castling/promotion characters, 320/390 px layouts, all arena widths, and three/four-player orientations. See the final PROJECT.md verification entry for the exact scope and screenshots. These are completed checks for that revision, not a substitute for retesting later edits.


The latest independent-switch and capture-effects revision passed **120/120 automated tests**. Browser checks covered every Cartoon/Classic combination, default Hints off and manual hints, switching during playback, remembered preferences, en passant, edge capture-promotion, two online clients with different display choices, reconnect, 320/390 px controls, both themes, and simultaneous three/four-player shows. See the final PROJECT.md entry for precise evidence and reduced-motion verification limits. Earlier entries refer to older behavior.


The latest both-on-default / winner-celebration update passed **121/121 tests** and production compilation. A fresh browser origin confirmed both animation switches on; previously saved Off choices remained intact. Desktop and 390 px checks verified the winner's visible celebration after the shorter board fight. The actual 12-second demonstration and reusable FEN are documented in [ANIMATION_DEMO.md](ANIMATION_DEMO.md). See the latest PROJECT.md entry for verification scope.


### Check left/right capture overflow

Use Same device → Endgames → Custom position with `7k/8/8/r6r/Q6Q/8/8/K7 w - - 0 1`. With Cartoon and On board enabled, play White Qa4xa5, then Black Rh5xh4. Each fight should keep its ordinary horizontal spacing, with a character crossing the corresponding board rim; the Black actor retains its upside-down orientation. A narrow viewport may clip the outer part of a figure. There must be no horizontal page scrollbar, and each winner must settle on its real destination after 1.8 seconds. Repeat in fullscreen and confirm vertical scrolling remains available.


### Shared-start and compact-header verification

The October 25 shared-confirmation/header revision passed **123/123 automated tests**. Use [TEST_CASES.md](../TEST_CASES.md) for the maintained case catalog and `reports/tests/` for actual automated/browser evidence and limitations. Same device now uses **Review & start → Agree & start game** once for the table; two-player online seats agree separately, while online party rooms start when every configured seat is occupied and connected. The current header has a crowned Q and Play / Rules / About, including phones. Earlier verification entries above describe older revisions.


### Surrounding seats and aligned panels

Check Q-M18–Q-M21 in [TEST_CASES.md](../TEST_CASES.md). Four-player shared names/clocks/shows belong below, left, above and right of their matching armies; three-player strips are borderless and face each player. Online labels remain upright, with only the viewer’s show. Turning By players off removes stage space. The main desktop game surface and right panel start at the same height beneath one compact mode/context row. Use the visible **Leave** button to open the existing confirmation; **Keep playing** preserves the game. The latest recorded scope is in `reports/tests/manual.md`.
