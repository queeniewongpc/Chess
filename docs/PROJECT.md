# Queenie’s: requirements and project history

Start with [AGENTS.md](../AGENTS.md). This document records existing work; a new user request determines the next task. Local play is covered in [LOCAL_TESTING.md](LOCAL_TESTING.md), and the Sites agent workflow in [SITES.md](SITES.md).

**Test maintenance:** read the root [TEST_CASES.md](../TEST_CASES.md) before every test task. It is the single maintained catalog for existing and new cases. Add new automated/manual definitions there and update changed cases in place, preserving IDs, steps, expected results and source references. Keep executable assertions in `server/*.test.js`; new automated coverage and its Markdown entry belong in the same change. [TESTING.md](TESTING.md) provides execution/evidence guidance, while `reports/tests/` stores actual results. Historical catalog references below describe their original checkpoints.

## The owner's requirements

The owner requested a beautiful multiplayer chess game for people in different places and on different devices, with a good original name and a way to test it locally before publication. Originally named **Between**, with the tagline **Friends at play**, the game was renamed **Queenie’s** on October 23. Its current tagline is **CHESS FOR YOUR CREW**, which applies to every game mode and player count.

The original feature requirements were:

1. Preserve traditional chess as a playable mode.
2. Offer a free-takeback mode. Before play, both people agree on an allowance from one move to unlimited; individual takebacks then require no opponent approval.
3. Offer a separate approved-takeback mode with the same pre-game allowance choice, but require the opponent's approval for each takeback.
4. Allow games with only some pieces, including custom starting positions and very well-known endgames.
5. Offer a half-board mode. Each side selects a piece count and its pieces, from one piece up to a complete set. Kings can be omitted. Whether kings are present or absent, capturing all opposing pieces is the objective.
6. Support two people sitting opposite each other around one phone without rotating the phone. Each person's pieces must face that person and remain easy to distinguish. The attached reference image communicated the orientation, not an instruction to copy its artwork. Create attractive original chess pieces.
7. Make the whole experience polished and usable on phones and computers.

In the follow-up, the owner requested:

- Translate every Chinese part of the application and project documentation into English.
- Keep project requirements and implementation decisions documented in this directory.
- Explain how the code can later be taken to `@Sites`, including the instructions in the project itself.
- Expand the former Half board mode into **Chaos Kingdom**, with 8 × 4, 4 × 8, and 8 × 8 boards. Allow arbitrary starting positions, including swapping occupied squares on a full board. Offer unrestricted placement or White in the bottom half and Black in the top half during setup.
- Show the full rules and agreement heading to both players in face-to-face mode. Make move hints visibly work before and after selection. Put the plies unit above the takeback presets and make a custom numeric allowance clear and editable.
- Give Chaos Kingdom two win conditions: capture the opposing king, or capture all opposing pieces. Each side can choose its king independently in the roster. Place the custom takeback number field before its preset buttons.
- Switch the entire interface to a distinctive, comfortable theme immediately when Chaos Kingdom is selected, and restore the original theme for Classic or Endgames. The initial design was Midnight Playground: deep plum, cream, coral, mint, rounded typography, and an original Arena emblem. The later Royal Ruckus update superseded that theme; both are historical treatments now replaced by the approved Porcelain Playhouse visual system described below.
- Keep the board visible beside long setup controls on desktop in Classic, Endgames, and all Chaos Kingdom shapes. Shorter windows must not disable the behavior for tall or full boards. Preserve the normal stacked mobile layout.
- Put Choose your game before player names for both online and face-to-face setup. Online players enter only their own nickname; current face-to-face modes use White and Black names. Choose sensible takeback defaults per mode and keep hints easy to use.
- On October 23, implement all remaining discussed features: complete three- and four-player games, four game categories, dynamic names, and the Chaos Kingdom rename. Consider the full design before implementation; ask only about genuinely conflicting requirements.
- Later on October 23, rename the product Queenie’s, keep a small universal tagline, give 3–4 Players the same bold theme as Chaos Kingdom, make that shared style more expressive, and audit all interface wording for clarity across modes and player counts.
- On October 25, add optional move and capture animations with a unique, lasting cartoon identity for every physical piece. The latest refinement uses independent On board and By players switches for Cartoon, supporting either, both, or neither; Classic offers only By players. Hints default to Off. Enlarge chess-role hats and simplify figures for small boards. Capture scenes now include a more energetic on-board clash when enabled, as well as a separate, more expressive player-side show when enabled. This supersedes the earlier rule that fights always stay off the board. Online shows face the viewer; same-device shows accommodate every seated player.
- Later on October 25, implement the approved Porcelain Playhouse concept: a refined ivory/midnight chess collection, porcelain-style cartoon figurines, slate/warm-stone boards, and more readable tactile animation. Preserve every existing game option and rule. This authorizes the visual implementation after an earlier concept-only request; it does not authorize publication.
- The owner subsequently found the first flat/vector treatment insufficiently faithful to the concept. The current refinement uses locally bundled rendered porcelain characters and day/night tabletop artwork, a more compact composition, and clearer capture poses. The requested reference action is a queen extending her arm, a rook falling onto its side, and the queen celebrating with raised arms. Keep the actual participants recognizable, preserve every game option, and do not publish.
- On October 25, add **2v2 Teams** within the existing 3–4 Players category. Design clear cooperative rules and team victory/draw conditions, preserving the existing free-for-all option and every other game mode. The subsequent menu refinement combines count and format into three direct choices: **Three Players**, **Four Players · Free for All**, and **Four Players · Two versus Two**.
- Do not publish now. Publication is future work only when explicitly requested. A later explicit publication request is sufficient authorization; do not invent another blanket approval gate.

The owner did not ask for computer opponents, ranked matchmaking, public accounts, payments, or a new hosting provider. Do not silently replace remote multiplayer with a single-device demo.

## Implemented decisions that must remain clear

### Game types and artwork

The interface exposes Classic, Endgames, 3–4 Players, and Chaos Kingdom. It separately offers Play online and Same device play. The former Custom Arena name is now Chaos Kingdom; its internal saved mode is unchanged. Custom positions live under Endgames, with a board editor and FEN import.

`src/ChessPiece.jsx` contains original vector artwork for all six piece types, available through Pieces → Classic. Cartoon is the default artwork, independently of the animation settings. The current `src/CartoonPiece.jsx` crops locally bundled transparent PNG atlases through SVG viewports. These rendered porcelain figures replace the earlier all-vector cartoon treatment, adding sculpted faces, directional light, role-defining silhouettes, midnight pedestal bands, and champagne trim. Neutral and ready/strike/celebrate/fallen poses share the same collection; runtime artwork fallback remains available if an asset fails. No external image service or 3D engine is required during play. See [ART_ASSETS.md](ART_ASSETS.md) for the images and atlas-maintenance rules. In face-to-face mode, Black pieces and the upper player panel are rotated toward the opposite player, while the board stays fixed. Both artwork styles preserve this orientation behavior.

Classic and endgame/custom play use standard chess rules through `chess.js`. Both sides must have a king. Custom FEN validation also checks castling metadata, plausible en passant metadata, and whether the side that just moved illegally left its king in check. Already-ended starting positions are rejected. Manual board editing removes castling and en passant rights; direct valid FEN import can preserve them.

### Branding and interface copy

The product is **Queenie’s**, with **CHESS FOR YOUR CREW** beneath the wordmark in every mode. Chaos Kingdom remains one of the four game categories, not a subtitle for the whole application. The compact header wordmark has a small champagne crown above its Q, replacing the separate boxed queen icon. Its tagline sits beside it on desktop and below it on phones. The hero queen and player portraits follow the selected Cartoon/Classic artwork style. The original Arena emblem remains distinct on its own game card. Browser title, description, header, footer, and About copy use the new name.

Functional labels stay direct: **Play online**, **Same device**, **Choose your game**, **Starting position**, **How to win**, and **Takebacks**. Takebacks retains the smaller **SECOND CHANCES** label. Classic, Endgames, 3–4 Players, and Chaos Kingdom keep their clear category names. Supporting copy includes two, three, and four players instead of assuming every game has two sides.

The current compact hero shows the actual mode (Classic chess, Endgames, 3-player chess, 4-player chess, 2v2 Teams, or Chaos Kingdom), connection context, and decorative Queenie’s signature. Earlier marketing headlines and the separate board-introduction row were removed to align the two main rounded surfaces and give the board more space. The shared Queenie’s identity does not change when a mode changes.

The rename deliberately preserves `between-sites.zip`, the `between-chess/` archive root, internal mode/event identifiers, and existing browser storage keys. Saved names and game data remain untouched. Reconnection copy accurately refers to returning to the original tab, because seat credentials are stored in that tab’s `sessionStorage`.

All Queenie’s branding now shares **DM Sans 700**, including the header, footer, decorative hero signature, and queen-click lettering. `src/brand.css` owns this invariant. Classic, Endgames, multiplayer, and Chaos Kingdom may change brand colors and surrounding styles, but not the wordmark font or weight. The small tagline keeps DM Sans 500.

The hero signature arrives once with staggered letter hops and then stays still. A separate board-local decoration appears when a player clicks a queen before play, an immobile queen, or a queen belonging to another player. After the latest October 24 refinement, it is a miniature signature with 11 px type on both phones and desktop, 2 px vertical / 4 px horizontal padding, and a -7-degree tilt matching the page-header decoration. Individual letter tilts follow the hero signature’s pattern. A small solid backdrop prevents pawn artwork from blending into the lettering; there is no border, pointer, spark, or glow. The complete name is readable immediately; a small 3 px staggered hop finishes in about 0.67 seconds without any scaling, then the signature fades to transparent and is removed after 2 seconds. Its placement wrapper stays untransformed while the visible mark tilts, keeping size measurements stable; viewport clearance accounts for the angled edges and the hop. Classic uses the legacy cream backdrop and forest text tokens, now mapped to ivory and midnight; the midnight theme uses the exact arena-deep backdrop and arena-cream lettering. Text fades toward each theme’s muted token. These shared variables keep the label consistent with the current page palette. Each new click replaces the previous decoration. The text follows the active theme, skips spatial motion under reduced-motion preferences while keeping the fade, and never intercepts pointer input or changes legal moves. An opposing queen can still be captured normally. On one device, the active turn determines whose queen is being clicked; online, the seated player's color does. Turn restrictions, pending consent, disconnects, or finished games prevent moves as before while still permitting the cosmetic response. Board rotation or a setup/modal context change dismisses it; resizing and fullscreen scrolling keep it anchored.

### Takeback semantics

- Modes are `off`, `free`, and `approval`.
- Each player has an independent allowance for the entire game; the initial allowance is 3. Fresh UI setup defaults to Ask first for Classic and Free for Endgames (including custom FEN positions) and Chaos Kingdom. These defaults support friendly competition, endgame practice, and custom experimentation respectively. Three- and four-player games default to Off to avoid interrupting a larger table. A manual choice is remembered for each visited mode in the current setup session. Switching modes does not reset the allowance or unrelated settings.
- The custom input appears first, followed by presets 1, 3, 5, 10, and unlimited. A custom integer from 1 through `Number.MAX_SAFE_INTEGER` is supported. Unlimited is represented by `null`, not an arbitrarily large number or JavaScript `Infinity`.
- One unit is one ply: one move by either side. Reversing White's and Black's latest moves costs two plies, all charged to the requester. This interpretation is an implementation decision that resolves the original request's ambiguous use of “steps.”
- Free takebacks apply immediately. Approved two-player takebacks require the opposite seat to respond. Multiplayer requires every other seated player, including eliminated players who could be restored. A player cannot approve their own request online.
- Pending consent blocks moves. Rejection consumes no allowance. A finished game cannot be undone.
- A pending takeback charges elapsed time to its requester. Acceptance and rejection settle that elapsed time. Undo also removes any benefit from increments earned on undone moves, so replay cannot manufacture clock time.

### Setup order and hints

Same device uses **Review & start** followed by one shared **Agree & start game** action. Two-player review retains the complete upside-down Black and upright White rules; neither panel has a consent checkbox. Three/four-player review shows full shared rules and named seats, with one fixed start action below the scrolling content. Cancel returns to setup without starting. Two-player online rooms require both occupied seats to confirm independently, and settings edits clear their readiness. Three/four-player online rooms now start automatically once every configured seat is occupied and connected, without a separate confirmation. Local start review and takeback/draw/rematch consent remain unchanged.

The compact header exposes **Play**, **Rules**, and **About** on desktop and phones. Play goes to the setup panel before a game and to the board while a room/game exists. The hero signature remains present throughout. No game categories or settings are removed.

New setup follows connection type, game mode, one multiplayer choice when applicable, player names, mode-specific settings, takebacks, and time control. The multiplayer selector has exactly three options: **Three Players** (`playerCount: 3`, `partyVariant: ffa`), **Four Players · Free for All** (`4`, `ffa`), and **Four Players · Two versus Two** (`4`, `teams`). A single selection updates count and format together; there is no separate count/format step. Online asks for the current player's nickname and preferred seat; Same device asks for White and Black names in two-player games, or three/four color-labeled names in multiplayer. Waiting-room rule editing does not add name fields. Entered names remain intact when switching modes or connection type.

Hints start off and remain a display preference: they identify movable pieces and legal destinations, not recommended or strongest moves. A user's toggle is not reset by switching game modes. Existing rooms, resumed games, and agreed settings retain their own takeback rules. The new per-mode suggestions are a frontend setup policy; server normalization retains its historical fallback for old clients/saves.

### Piece characters and movement

**Pieces** offers Cartoon / Classic as radio choices. **Animations** uses two independent On/Off switches: On board and By players. Cartoon supports board only, players only, both, and neither. Classic shows only By players; the hidden board preference is retained for returning to Cartoon. Changing artwork never enables another channel. New devices default to Cartoon with both On board and By players on. Previously stored choices, including Off, remain unchanged. Hints start off on each page load; a manual toggle remains in effect while that page is open, including mode changes.

Every starting piece retains its deterministic identity from `shared/pieceCharacters.js`, based on its agreed starting color/square and public move history. Same-type pieces and opposing armies remain distinct. The rendered collection integrates each chess role into the character silhouette: a rounded pawn, prominent horse, bishop slit, rook battlements, queen crown, and king cross. Transparent image atlases provide the sculpted surface and light; deterministic sprite selection, face crops, and maker’s emblems preserve each piece’s identity signals. Ivory and midnight identify the two-player armies; coral, lake blue, honey, and jade identify multiplayer armies. The earlier hat enlargement and vector porcelain redraw are historical treatments. Promotion changes the role while preserving the physical piece’s identity, including its original pawn face and maker’s mark. Capture, takeback, reload, reconnect, and inactive armies retain the same identity data. Classic remains a separate selectable vector style; the rendered collection also retains a vector fallback for failed assets. No cosmetic identity is written into authoritative game data.

On-board moves last 900 ms. A capture lasts 1800 ms: the actual attacker and victim approach a short side-by-side scene, briefly enlarge, and make one readable contact at about 1000 ms. Ready and strike poses show the attack; the defender changes to its fallen pose, and the attacker briefly celebrates before settling on the destination. The reference action is a queen extending her arm, a rook falling onto its side, and the queen raising her arms joyfully. Restrained coral impact marks and champagne details keep the participants visible. This replaces the historical three-clash sequence without changing total duration. The effect may overlap neighboring squares and extend past the left/right board edges. Edge-file encounters keep the same horizontal anchor and relative spacing as center-file encounters. Clip only at the viewport edge when needed, allowing a partially hidden character without horizontal page scrolling. The existing vertical guard remains. En passant uses the actual captured pawn's square; castling includes both king and rook; promotion retains the pawn identity. Character orientation follows the viewer online and each army's seat on a shared device.

By players shows every accepted move beside the names (below the row on narrow screens), only when that switch is on. No capture automatically enables this location. Moves last 2100 ms and captures 3200 ms. A single held contact at about 1000 ms aligns with the board fight; ready/strike/celebrate poses distinguish anticipation, attack, and victory. The actual defender falls onto its side and remains visible beside the celebrating winner until the final fade. This replaces the historical early-loser exit, so the outcome remains clear after the shorter board scene has finished. Capture promotion changes the winner’s role before celebration. Neither location has a longer total duration. The transparent stage integrates into an inset player plate, with only a quiet floor line at rest. Space remains reserved while enabled so playback never changes the layout. Online has one viewer-facing stage; two-player Same device has opposing complete rows. Three/four-player cards retain seat-facing stages and upright status headers, with responsive rows and columns that preserve player names and controls.

Both locations can run simultaneously and finish independently. All effects are cosmetic, hidden from assistive technology, and pointer-transparent: moves apply immediately and clocks keep running. New moves replace effects involving their participants. A newer player show permanently supersedes older shows even if its shorter duration finishes first. `shared/animationPlayback.js` and `src/usePieceAnimations.js` derive new events from accepted history, ignoring duplicate snapshots and resetting on reconnect, undo, changed display preferences, hidden tabs, and replaced histories. Board resizing dismisses effects with stale coordinates. Reduced motion uses brief fades (280 ms board, 450 ms player-side), without spatial travel, enlargement, spinning, or fights. Durations are shared in `shared/animationTimings.js`.

`shared/animationPreferences.js` migrates old single-location settings into the new switches without replaying history. Missing old piece-style keys retain the original Classic artwork for legacy Off/edge preferences. New explicit channel keys take precedence independently. Animation preferences stay on each device and never enter room settings. Queen-click signatures and the hero entrance remain separate decorations.

### Chaos Kingdom semantics

The product name is **Chaos Kingdom**; the saved/API mode remains `half` for backward compatibility. Choose **8 × 4** (a1–h4), **4 × 8** (a1–d8), or **8 × 8** (a1–h8). These are actual board dimensions. `halfShape` defaults to `8x4` when absent in an older save.

Each side chooses its roster from a standard set: 8 pawns, 2 knights, 2 bishops, 2 rooks, 1 queen, and 1 king. There must be at least one piece per side. Each roster has an independently editable king count (0 or 1), like the other piece controls. A complete set has 16 pieces; a set without its king has at most 15. The previous shared Include kings toggle has been replaced by the win-condition selector.

`halfPlacement` is `territory` (Own half) or `anywhere` (Anywhere). Own half permits White only in the lower half of the starting board, Black only in the upper half. This restriction applies to setup, not subsequent moves. Anywhere permits either color on any square.

`halfPosition` is null for the automatic layout, or an array of `{square,type,color}` entries. The server validates dimensions, squares, colors, piece types, duplicates, exact roster counts, and placement zones. No king or extra piece may be smuggled into a custom position. All selected pieces are present in the editor: tap a piece and then an empty square to move it, or another occupied square to swap. A swap preserves both pieces even when every square is filled. Both resulting positions must satisfy the placement restriction.

Changing board size or rosters resets the layout. Changing placement rules preserves a valid layout; switching to Own half resets a layout that crosses the boundary, with an explanation in the editor. Reset layout returns to the automatic arrangement. The legacy 8 × 4 and 4 × 8 default arrangements are preserved. The 8 × 8 default uses standard home squares filtered to the selected roster.

Kings move one square and can be captured. `halfWin` selects `capture-all` (the default) or `capture-king`. Capture all pieces permits either side to omit its king and ends only when every opposing piece is captured. Capture the king ends immediately when the opposing king is captured, even if other pieces remain, and requires one king per side before starting. King controls remain editable; incomplete king-capture setups display an error and cannot start. Selecting Capture the king initially adds missing kings, with an explanation, and resets the layout only when the roster changes. There is no check, checkmate, castling, en passant, or two-square opening pawn move in this mode, including on 8 × 8. Pawns move forward, capture diagonally, and promote upon moving to their final rank. Arbitrary setup can place pawns on their final rank; they do not automatically promote merely from placement.

The setup editor and online waiting rooms can retain incomplete king-capture drafts. `createGame(settings, { allowIncompleteArena: true })` is for draft previews; starting, readiness confirmation, and active-game restoration use strict creation. `hasMissingArenaKings()` identifies this specific draft state. Waiting-room drafts persist across a restart with zero move history.

No legal moves, threefold repetition, or 50 full moves without a pawn move or capture results in a draw. There is no insufficient-material draw. A starting layout that has already ended cannot start a game; adjust it when the UI reports this.

### Porcelain Playhouse visual system

The approved concept is **Porcelain Playhouse**, the art direction rather than a new product name or game option. Classic and Endgames use a warm ivory day room; Chaos Kingdom and 3–4 Players use a midnight navy room. Both belong to the same collection: warm-stone `#DDD8C9` and slate `#87979F` board squares, champagne `#BEA16A` trim, restrained coral `#D96F5B` and jade `#5B9F8D` accents, matte panel surfaces, fine bevels, and soft shadows. DM Sans is shared by controls and headings; all Queenie’s wordmarks retain DM Sans 700. The previous Midnight Playground and Royal Ruckus plum/lavender palettes, display fonts, and bold offset shadows are historical designs, not current styling requirements.

`src/porcelain-theme.css`, imported after the base styles, supplies the shared colors and controls. `src/arena-theme.css` defines the midnight tokens under the existing theme class. The last-imported `src/tabletop-scene.css` adds the compact hero, stronger permanent wordmark, inset player plates, raised champagne board edges, and detailed day/night table backgrounds from `public/art/`. The live board stays interactive above these decorative scenes; plants, books, lamps, and other scene props are never controls. Multiplayer geometry has transparent surroundings so the room remains visible around the cross or hexagon. See [ART_ASSETS.md](ART_ASSETS.md) for the bundled raster collection and its source prompts. The selected, edited, or active mode drives the room; the visual condition still includes both `half` and `party`, while Chaos Kingdom geometry and rules remain keyed to `half`. The change adds no theme switch or game option. All existing setup controls, agreements, FEN/editor validation, clocks, histories, legal-move hints, and dialogs inherit their room’s readable palette.

Cartoon pieces remain one consistent porcelain collection in either room. Player avatars use the selected artwork style. Multiplayer retains red, blue, yellow, and green as recognizable army colors, supplemented by fixed triangle, star, diamond, and club seat emblems. Warning/check colors and active-seat styling remain distinct roles; no army color changes a rule or outcome. Preserve all board geometries, opposite-facing pieces, player-show orientations, sticky desktop behavior, and the existing stacked phone layout. The approved work changes presentation only: rules, names, stored preferences, animation channels/defaults, and server behavior remain intact.

### Animated hero signature

The owner requested a style-only addition to fill the desktop gap between the headline and queen stamp. `HeroWordmark` displays the correct nine glyphs of **Queenie’s** with a staggered, gently bouncing entrance lasting 1.52 seconds in total. It then remains as a small static signature: disappearing would recreate the empty space, while looping would distract from play. This is decoration, not a loading indicator; the page remains usable immediately. The entrance runs once on mount, without timers, game-state changes, or replay on mode changes. The current day room uses slate, midnight, and champagne; the midnight room uses cream, pale slate, and champagne. The compact hero and signature remain visible in setup and active games, including phones; this supersedes the historical active-game mobile hiding rule.

The decoration is hidden from assistive technology because the header already supplies the accessible brand. Transform/opacity animation preserves layout space. Reduced-motion preferences show the complete static wordmark. Historical checks for the original signature revision covered both then-current themes, initial hidden and final visible letter states, staggered delays and one iteration, unchanged finished letters after a mode switch, and widths of 1440, 1280, 1051/1050, 951/950, 761/760, 390, and 320 pixels without horizontal overflow or desktop column overlap. No browser console errors were recorded. Reduced-motion behavior was reviewed in CSS; the browser tool did not expose motion-preference emulation. Screenshots: `artifacts/queenie-hero-signature-desktop.png` and `artifacts/queenie-hero-signature-mobile.png`. This presentation-only change did not rerun game-engine/network tests.

### Desktop board layout

The left board stays in view while scrolling setup on desktop in every game mode. Its height budget includes the real heading, player panels, toolbar, hint text, and footnote. Shorter desktop windows use tighter surrounding spacing. The current caller requests minimum square sizes of 48 px for two-player boards and 32 px for multiplayer, capped by the naturally available width, so the rendered characters remain readable. When that board cannot fit completely, the panel scrolls naturally until its bottom reaches the viewport, then remains sticky using a negative top offset. In very short windows its upper part can therefore be above the viewport; the board must not disappear entirely or lose sticky positioning. The page remains the only scroll area. Narrow screens retain their stacked layout, and fullscreen uses its existing presentation. Three-player sizing uses the actual polygon dimensions. Game modes still retain their own visual themes.

The October 23 correction addresses the earlier layout's 32 px guard, which disabled sticky positioning for tall/full boards in shorter windows. Classic and Endgames were also previously excluded. A 1280 × 550 viewport reproduced the failure with the 4 × 8 board entirely above the visible page while its setup controls remained visible.

### Three- and four-player chess

The owner explicitly authorized the previously discussed multiplayer feature on October 23. It is now part of the implementation, rather than a future menu placeholder. The complete rules are in [MULTIPLAYER_RULES.md](MULTIPLAYER_RULES.md).

Three players use a 96-cell, three-sector board; four players use a 160-cell cross board. Each starts with 16 familiar chess pieces. Turns go clockwise. **Free-for-all** remains the default for three/four players and older saves. Legal moves keep the acting king safe from every active opponent. At the beginning of a player's turn, checkmate or stalemate eliminates that player. Resignation and timeout also eliminate one player while the others continue. Eliminated pieces remain as inactive, capturable blockers. The last active player wins. This is Queenie’s explicit friendly multiplayer variant, not a FIDE rules claim or a points-based four-player game.

**2v2 Teams** is an additional four-player format: Red + Yellow versus Blue + Green, with opposite teammates and the same Red → Blue → Yellow → Green order. Each player moves only their own army. Allies block but cannot capture or check each other. A move must leave the acting player's own king safe; rescuing a teammate before their next turn is permitted, not mandatory. Checkmate is judged when the affected player's turn arrives and immediately awards victory to both opponents. Resignation or timeout also loses for the whole team immediately; stalemate draws the whole game. There is no continuing elimination phase. Pawns retain eighth-rank promotion with four choices; own castling remains legal when safe, and en passant remains unsupported. Threefold repetition, 50 full rounds without a pawn move/capture, and unanimous agreement draw. See the complete rule document for timing examples and deliberate differences from other variants.

`partyVariant` is `ffa` or `teams`; absence means `ffa`. Three-player selection resets it to `ffa`. Team results carry both `winners`, the `winningTeam`, and the affected `defeated` seat; a representative `winner` is kept for compatibility. The complete outcome survives local and online snapshots, replay and restoration. Agreed draws have no winning team. Replay and saved outcome must agree, and Teams/FFA replays cannot be interchanged.

Online party games start when all configured seats are occupied and connected, without a readiness step. Waiting rooms may change three to four players; removing the fourth seat is allowed only when unoccupied. Changing between two-player and multiplayer games requires a new room, protecting seat ownership. Online board orientation follows the player's seat; shared-device pieces face their own side. Hints use the same authoritative legal moves as play.

Shared session logic enforces seat-specific clocks, version checks, independent takeback budgets, unanimous takeback consent from all other seats, draw consent from active seats, and rematch votes from all seats. Undo may reverse a move-caused elimination but cannot cross the last resignation or timeout. Private seat credentials and full engine state survive server persistence; local games use the same rules and can resume after refresh.

### Endgame collection

`shared/endgames.js` stores stable IDs, names, descriptions, FENs, and source links:

| ID | Position | Purpose |
| --- | --- | --- |
| `lucena` | Lucena position | Build a bridge in a rook-and-pawn ending. |
| `philidor` | Philidor position | Defend a rook ending a pawn down. |
| `reti` | Réti's 1921 study | Combine chasing a pawn and supporting another. |
| `opposition` | The opposition | Learn a king-and-pawn ending. |
| `queen-mate` | Queen and king | Restrict the opposing king and avoid stalemate. |
| `rook-mate` | Rook and king | Use king support to force the defender to an edge. |

Réti is a historical composition. The other entries use Lichess teaching setups. Preserve the source attribution and side to move when updating copy. Do not present all six as original historical compositions.

### Agreement and clocks

Any seated online player can change settings while the room is waiting. Every settings edit increments the room version. Two-player edits clear both ready flags, and both occupied seats must confirm before play. Party rooms start automatically once all configured seats are occupied and connected, including after a qualifying waiting-room settings change. Face-to-face play has complete upside-down Black and upright White rule panels with one shared start action; there are no per-seat start checkboxes. The Rules view supplies complete copies facing both players.

Available time controls are untimed, 10 minutes, 5 minutes plus 3 seconds per move, and 3 minutes plus 2 seconds per move. Disconnecting does not pause the clock. Server timestamps determine remote clock time. Draw offers, resignation, and mutually accepted rematches are supported. Online rematches require every seated player and preserve seat colors and credentials. Shared-device multiplayer rematches show one fresh shared review, preserving names and settings; established two-player local rematches retain their direct restart behavior.

## Source map

| File or directory | Responsibility |
| --- | --- |
| `src/App.jsx` | Main interface, room and local flows, board interaction, dialogs, consent, promotion, history. |
| `src/SetupPanel.jsx` | Rules, custom takeback allowance, endgames, FEN editor, Chaos Kingdom rosters and move/swap layout editor. |
| `src/setupDefaults.js` | Fresh-setup takeback suggestions and per-mode choices, separate from agreed room settings. |
| `src/ChessPiece.jsx` | Original SVG piece artwork. |
| `src/CartoonPiece.jsx`, `src/cartoon-piece.css` | Locally rendered PNG atlas viewports, neutral/action poses, lasting face/emblem identity, army palettes, and vector fallback. |
| `public/art/`, `docs/ART_ASSETS.md`, `docs/art-prompts.json` | Bundled transparent figurines/action atlases, day/night table scenes, and asset-maintenance/source-prompt notes. |
| `src/AnimationControls.jsx`, `src/animation-controls.css` | Pieces radio choices and independent On board / By players switches. |
| `src/usePieceAnimations.js`, `src/MoveEffects.jsx`, `src/move-effects.css` | Independent cosmetic playback, on-board travel/capture fights, and reduced-motion treatment. |
| `src/PlayerShow.jsx`, `src/player-show.css`, `src/seat-shows.css`, `src/party-shows.css` | Reserved shows beside player names, off-board move/capture scenes, responsive placement, and seat-facing stages. |
| `src/HeroWordmark.jsx`, `src/hero-wordmark.css` | Decorative one-time letter entrance, responsive signature placement, and reduced-motion fallback. |
| `src/styles.css` | Desktop and responsive layouts, board and face-to-face presentation. |
| `src/agreement.css` | Two-facing rules and agreement panels, hint controls and markers. |
| `src/arena-theme.css` | Midnight room tokens for Chaos Kingdom and multiplayer. |
| `src/porcelain-theme.css` | Shared Porcelain Playhouse colors, typography, controls, boards, player cards, and dialogs. |
| `src/tabletop-scene.css` | Final tabletop backgrounds, compact responsive composition, inset player plates, material depth, and persistent hero presentation. |
| `src/board-layout.css`, `src/boardLayout.js` | All-mode desktop sticky positioning, compact spacing, and viewport sizing; DOM measurements live in `App.jsx`. |
| `src/ArenaIcon.jsx`, `src/setup-arena.css` | Original Arena emblem, win-condition controls, and distinct mode card. |
| `src/useGame.js` | Socket.IO client, room URL, tab seat credential, reconnect and acknowledgments. |
| `src/useLocalGame.js` | Same-screen session lifecycle and browser persistence. |
| `shared/game.js` | Settings validation, standard engine, `HalfChess`, outcome rules and clocks configuration. |
| `shared/partyChess.js`, `shared/partyGeometry.js` | Three/four-player engine, movement paths, polygon geometry, FFA elimination, team outcomes and replayable state. |
| `shared/partyTeams.js` | Shared Teams activation, opposite-seat alliances, team labels and winner membership. |
| `shared/partySession.js` | Shared multiplayer clocks, consent, actions, snapshots, and persistence validation. |
| `src/PartyBoard.jsx`, `src/party.css` | Multi-seat board rendering, orientation, player cards with fixed seat emblems, and responsive presentation. |
| `shared/localGame.js` | Local actions, takebacks, clocks, snapshots, save and restore behavior. |
| `shared/moveHints.js` | Display-only hints derived from authoritative legal moves, including capture markers. |
| `shared/pieceCharacters.js`, `shared/animationPlayback.js` | Reconstruct stable cosmetic identities and capture/castling events; distinguish new moves from replay/reset snapshots. |
| `shared/animationTimings.js` | Shared board and player-show durations. |
| `shared/animationPreferences.js` | Normalize independent artwork/motion choices and migrate legacy browser preferences. |
| `shared/endgames.js` | Six educational positions and source attribution. |
| `server/index.js` | Express, authoritative Socket.IO rooms, seat tokens, persistence, cleanup, clocks and HTTP serving. |
| `TEST_CASES.md` | Single maintained case catalog: read before testing and add or update all case definitions here. |
| `docs/TESTING.md` | Test execution/evidence guidance and a supporting coverage overview; new case definitions belong in `TEST_CASES.md`. |
| `server/*.test.js` | Executable rules, local-session and real server/client integration tests; retained alongside their entries in `TEST_CASES.md`. |
| `vite.config.js` | Development frontend port and proxies to the game server. |

The runtime uses React, Vite, Express, Socket.IO, and `chess.js`. `package-lock.json` pins the installed dependency tree. Use Node.js 22 or newer and `npm ci` for a fresh checkout.

## State and API contracts

Settings include `mode`, multiplayer `playerCount`, `undoMode`, `undoLimit`, `timeControl`, `endgameId`, `customFen`, `halfWin`, `halfShape`, `halfPlacement`, `halfPosition`, and per-color `halfCounts`. Piece keys are `p`, `n`, `b`, `r`, `q`, and `k`; two-player colors are `w` and `b`. Multiplayer colors are `red`, `blue`, `yellow`, and (for four players) `green`. Older settings without `halfWin` retain the legacy shared `halfKing` behavior. New settings include `halfWin` and use each roster's explicit `k` count; do not overwrite those counts with `halfKing`. The UI uses `mode: 'endgame'` plus `endgameId: 'custom'` for custom positions; the engine also accepts the existing `mode: 'custom'` alias.

The server creates eight-character room codes from an alphabet that avoids ambiguous characters. Codes and invitation URLs locate a room; they are not seat credentials. Each seat has a cryptographically random private token. The server stores a hash, checks it on resume, and does not expose tokens in room broadcasts. A socket's verified membership determines its remote acting color. Resuming a seat elsewhere replaces the earlier socket.

Socket.IO client requests use acknowledgments. Success has `ok: true` with room state and, for a newly attached seat, `player: { color, token }`. Failures return `ok: false` with an English error. `room:state` broadcasts public snapshots; `room:replaced` signals that a seat moved to another connection.

| Event | Purpose and important fields |
| --- | --- |
| `room:create` | `name`, chosen `color` (one of the mode’s seats, or `random`), and `settings`. |
| `room:join` | `code` and `name`, or the existing token when reclaiming. |
| `room:resume` | `code` and private `token`. |
| `room:sync` | Fetch the latest snapshot for a seated member. |
| `room:settings` | Waiting-room settings update with `expectedVersion`. |
| `game:ready` | Two-player readiness with `expectedVersion`; both seats must confirm. Party joins/reclaims start automatically when all configured seats are connected; legacy party readiness is an authenticated/version-checked no-op that cannot block or restart play. |
| `game:move` | `from`, `to`, optional `promotion`, `expectedVersion`, and `expectedPly`. |
| `game:undo` | Requested `plies`, `expectedVersion`, and `expectedPly`. |
| `game:respond-undo` | Other seat's Boolean `accept` decision; all other seats must accept in multiplayer. |
| `game:offer-draw`, `game:respond-draw` | Offer or respond to a draw; the response uses Boolean `accept`. |
| `game:resign`, `game:rematch` | Resign or vote for a rematch. |
| `room:leave` | Detach the current connection from its seat. |

Room-scoped requests include `code`. Keep current-version checks at the server boundary: client UI disabling alone cannot reject stale or concurrent actions. `expectedPly` is the current history length; `version` also detects settings changes and undo/replay changes that return to the same history length. The server has a legacy compatibility path for older payloads without settings; do not copy that path into new clients or weaken current checks.

`GET /api/health` is the HTTP health endpoint. In production, Express serves `dist/` and Socket.IO together. In development, Vite on 5173 proxies `/socket.io` and `/api` to port 3001. The client calls `io()` without a remote backend URL, so it expects the game service on its own origin.

## Persistence and portability

- **Remote rooms:** process memory plus `.data/rooms.json`, written by the Node service and reloaded on restart. The file stores settings, histories, clocks, consent state, names, and hashed credentials. It is private runtime data, not source.
- **Cleanup:** a room is eligible after more than 24 hours without activity when every seat is disconnected. A periodic server loop performs cleanup and clock reconciliation.
- **Remote browser seats:** `sessionStorage` keys `chessclub:<ROOM_CODE>` hold private tokens. Refresh and reconnect can reuse them. Do not rename this prefix as a cosmetic cleanup without an explicit migration. Another browser/device does not automatically inherit a token, and a copied room URL does not reclaim a seat.
- **Local games:** `localStorage` key `between:local:v1` stores the same-screen session. The session reconstructs two-player engines from settings and move history, or multiplayer engines from validated move/elimination events. Leaving clears it.
- **Preferences:** `between:name` and `between:playType` use local storage. `between:piece-style` stores `cartoon`/`classic`; `between:board-animation` and `between:player-animation` store independent `on`/`off` choices. Fresh defaults are Cartoon with both animation locations on; previously stored choices are preserved. Old `between:animations` and `between:animation-placement` keys are migration inputs only; explicit new channel keys take precedence. Classic retains a hidden board preference but never runs board animation. Hints default to Off on page load and are not persisted. Display choices never enter shared room settings. Never overwrite user-entered names or saved personal content.
- **Blocked storage:** the app tolerates storage failures, but the page cannot promise recovery after a refresh in that case.

The current server is designed as one authoritative Node process with a writable disk. It is not yet configured for horizontal scaling, shared room state across instances, or a hosted persistence service. The timeout winner check is a practical material check, not a proof of all FIDE possible-mate cases. Keep limitations explicit rather than describing it as a tournament-certified platform.

## Local verification

Select cases from [TEST_CASES.md](../TEST_CASES.md) first. When a new regression is found, add its case definition there and its automated assertions to the appropriate `server/*.test.js` file; manual-only cases also belong in the same catalog. Record execution evidence separately in `reports/tests/`.

From the project root:

```sh
npm ci
npm test
npm run build
npm run dev
```

Use two independent browser contexts at `http://localhost:5173`, not two duplicated tabs. Create a room, join it, edit settings, confirm that readiness resets, confirm both sides, move, request both kinds of takeback, reject and accept requests, and refresh to reconnect. Use a phone on the same Wi-Fi with the development server's Network address to check responsive and cross-device behavior.

For production-mode testing, stop development if needed, run `npm run build`, then `npm start`, and open `http://localhost:3001`. `PORT` controls the production port. Changing the development backend port also requires matching Vite proxy changes.

Verified on October 22, 2026: all 49 automated tests passed. This update was checked in the browser for independent king selection, missing-king validation, immediate king-capture victory, continued play after king capture under capture-all, input-before-presets ordering, phone layouts, both-facing Arena agreement, and full-theme switching/restoration. Two separate browser seats verified online rule edits, missing-king drafts, readiness, and synchronized moves. Earlier checks covered all three arena sizes, full-board swaps, placement restrictions, and move hints. Desktop and phone layouts were reviewed. The production build passed. Product source and documentation are English; Chinese or other user-entered names and saved personal content are preserved. These results describe that revision, not a permanent guarantee for the current project. When the owner asks for testing or changes, run the relevant commands again and report the actual result. The test suite exercises game rules, real Socket.IO clients, seat isolation, persistence, clocks, consent, takebacks, and stale action rejection. Some restricted sandboxes block opening the local sockets required by integration tests; identify an environment restriction separately from a test assertion failure.

The first desktop Arena layout update was checked on October 22, 2026 at 1280 × 800 and 1440 × 900, with responsive checks and a passing build. Those checks missed the short-window failure: the original minimum-size fallback disabled sticky positioning entirely, and Classic/Endgames were excluded. That behavior is superseded by the October 23 correction below. `artifacts/arena-desktop-sticky.png` records the first version.

Verified on October 23, 2026: the 4 × 8 failure was reproduced at 1280 × 550 before the fix. Afterward, Classic, Endgames, and all three Arena shapes kept the complete board and controls visible beside the lower setup at that same size. Further checks covered 1280 × 740, 960 × 540, 1280 × 400, and the 761/760 px desktop boundary. The very short window retained sticky positioning and 32 px square cells. Phone widths of 390 and 320 px retained ordinary stacked scrolling without horizontal overflow. A fresh browser load had no console errors. Four focused sizing regression tests passed, and the production build passed during packaging. The preceding 49 game-rule/integration tests were not rerun for this display-only change. `artifacts/board-sticky-tall-fixed.png` and `artifacts/board-sticky-endgame-fixed.png` show the corrected tall-board and Endgames layouts.

The later October 23 setup update passed five focused tests in `server/setupDefaults.test.js`. Browser checks confirmed game-before-name ordering on desktop and 390/320 px phones, one online nickname versus two face-to-face names, initial Ask first/Free recommendations, remembered manual Off selection, preserved names and custom allowance across modes, and an unchanged manual Hints toggle. Both local agreement panels reflected the selected Free rule and 7-ply test allowance. No horizontal phone overflow or browser console errors were observed. The production build passed during packaging. Engine/network behavior was unchanged; full integration tests were not rerun for this setup-only change. Screenshots are `artifacts/setup-game-before-names-desktop.png` and `artifacts/setup-game-before-names-mobile.png`.

The completed October 23 multiplayer update passed **86/86 automated tests**, including genuine 96-cell/160-cell geometry, castling, pawn routes and promotion, king safety, turn-start mate/stalemate elimination, event replay/undo, clocks, three/four independent Socket.IO clients, readiness, seat credentials, reconnection, unanimous takebacks/draws/rematches, and all existing two-player regressions. An independent review also exercised seeded 150-ply games for each board with repeated replay and undo comparisons. These are tested friendly variants, not a claim of exhaustive chess proof.

Browser checks used an isolated, non-persisting backend and separate browser seats. Three-player same-device play completed a full round, required all three opening consents, required both other takeback votes, retained history/budgets on reload, continued after one resignation, awarded the last player, and required fresh all-seat consent for a rematch. Four independent online seats completed a full round with identical displayed positions and seat-relative rotations, required three other approvals for undo, reconnected after refresh, unanimously agreed a draw, and waited for all four rematch votes. No browser console errors were recorded. At 1280 × 550, Classic, Endgames, all three Chaos Kingdom shapes, and both multiplayer boards remained visible beside the lower setup controls. At 390 px and 320 px phone widths, there was no horizontal overflow; the game/count precede dynamic names and mobile uses ordinary document scrolling. Screenshots: `artifacts/three-player-setup-desktop.png` and `artifacts/four-player-online.png`. No deployment was performed.

The October 23 Queenie’s branding and Royal Ruckus refresh passed **26 focused tests**: 16 game-setting/rule tests after the copy-only validation-message changes, plus 10 board-sizing/setup-default tests. Browser verification used an isolated backend and confirmed the shared theme for both multiplayer boards and Chaos Kingdom, immediate restoration for Classic/Endgames, original queen branding, readable three-player agreement, legal-move hints, a completed local move, active-seat styling, and move history. A second independent online browser joined a four-player room from the default Classic screen and automatically acquired the multiplayer theme and correct seat. No console errors were recorded in either browser. All three Chaos Kingdom shapes, Classic, Endgames, and both multiplayer boards retained sticky desktop positioning at 1280 × 550. Phone checks at 390 and 320 px had no horizontal overflow; optional name placeholders were shortened to fit. Screenshots: `artifacts/queenie-multiplayer-desktop.png` and `artifacts/queenie-multiplayer-mobile.png`. Full game/network integration tests were not rerun for this visual/copy refresh; the preceding 86-test result belongs to the multiplayer implementation above. No deployment was performed.

The later October 23 brand-font and queen-decoration update passed **86/86 automated tests**. The first restricted run could not open integration-test sockets; the permitted local rerun passed with no assertion failures. Browser checks used an isolated, non-persisting backend. They confirmed matching DM Sans 700 wordmarks in every mode; pre-game, blocked, opposing, and online off-turn queen feedback; normal selection for a movable queen; an actual Qxd5 capture; a single replacement decoration on repeated clicks; automatic removal; dismissal on board flip; keyboard activation on both multiplayer boards; and correct fullscreen positioning. Separate online White and Black clients retained zero moves when the off-turn player clicked either queen. There were no browser console warnings or errors. At 390 px and 320 px, including the tall arena and the four-player right-edge queen, the complete label stayed within the viewport without horizontal overflow. The desktop board retained its sticky positioning. Reduced-motion fallback was reviewed in CSS; an emulated reduced-motion browser session was not available. Screenshots are `artifacts/queenie-queen-desktop.png`, `artifacts/queenie-queen-classic.png`, and `artifacts/queenie-queen-mobile.png`. No Site was created, uploaded, or published.

The October 24 refinement removes the queen decoration’s speech-bubble frame, pointer, spark, and large bouncing motion. Browser verification covered Classic and Chaos Kingdom on desktop, 390 px phones, and the 320 px four-player edge queen; the name remained readable with no horizontal overflow. Both multiplayer boards retained keyboard activation. The browser reported a transparent background, zero border, a 2-second fade, 17 px mobile / 20 px desktop lettering, and no console warnings or errors. The decoration disappeared after its lifetime. Reduced-motion behavior was reviewed in CSS. Game predicates, moves, and network code were unchanged, so the full rules/integration suite was not repeated for this visual refinement; the production build passed. New screenshots: `artifacts/queenie-queen-quiet-classic.png`, `artifacts/queenie-queen-quiet-desktop.png`, and `artifacts/queenie-queen-quiet-mobile.png`. No publication was performed.

The subsequent October 24 request supersedes the transparent-background refinement above: the owner requested smaller text and a coordinating background to separate it from the pawn row. The new label uses 13/14 px lettering, a compact solid backdrop, and a 2 px hop. Browser checks specifically clicked the lower queen over the pawn row in Classic and Chaos Kingdom at 390 px, checked 320 px bounds and 1280 px desktop sizing, and verified restoration to Classic colors. Computed colors matched the actual theme tokens: Classic #f0efde / #254737 and Chaos Kingdom #251431 / #ffedcf. The browser reported no horizontal overflow, no borders or text shadows, and no console warnings/errors. Screenshots: `artifacts/queenie-queen-label-classic-mobile.png` and `artifacts/queenie-queen-label-chaos-mobile.png`. This was a CSS-only change with unchanged game behavior; the production build and archive checks were used for verification, without repeating game/network tests. The Sites instructions were audited for consistent publication authorization and source-upload status. No cloud action or publication was performed.

The final October 24 mini-signature refinement supersedes the 13/14 px label above. The owner asked for the smallest clearly recognizable lettering and the tilted, staggered bounce used by the hero signature. The mark now uses 11 px DM Sans 700 at every viewport size, with a roughly 58 px layout width, a -7-degree overall tilt, tiny individual letter rotations, and no animated scaling. The theme backdrop and 2-second fade remain. Browser verification covered Classic and Chaos Kingdom over the lower queen/pawn row at 390 px, the four-player right-edge queen with keyboard activation at 320 px, and 11 px desktop text at 1280 px. The transformed mark remained inside the viewport, all nine glyphs were present, the animation ran, and the browser reported no horizontal overflow or console warnings/errors. Reduced-motion styling retains the static angled signature while skipping the letter hop. Screenshots: `artifacts/queenie-mini-signature-classic.png` and `artifacts/queenie-mini-signature-chaos.png`. Gameplay and network code were unchanged; the production build and archive verification were performed rather than repeating the game-rule suite. No publication or cloud action occurred.

The initial October 25 cartoon-piece and move/capture animation update passed **107/107 automated tests**. The added tests cover stable identity reconstruction, distinct armies, exact capture participants, en passant, both castling directions, promotion, takebacks, restored histories, inactive-army captures, cross-sector multiplayer promotion, and animation-feed reset/deduplication, alongside existing rules and real-client transport tests. The cartoon artwork was separately inspected at 28 px and 48 px, with all six sides represented. This run and the following browser record are historical evidence from before the later independent radio controls, enlarged hats, and player-name show placement described above; they do not verify those newer refinements.

Browser verification used an isolated, in-memory game server without changing the owner’s saved games. Same-device Classic covered moving both colors, capture, identity restoration after takeback, both edge-show orientations, Off preference across refresh, immediate Off during animation, castling’s two moving characters, and promotion retaining its pawn identity. Three-player play covered on-board travel and edge shows at 0/120/240 degrees; four-player edge shows appeared at 0/90/180/270 degrees. Two independent online tabs verified a single viewer-facing edge show per client, opposite board-travel directions, matching actor/victim identities during capture, and reconnect without replay. Responsive checks covered 390 px multiplayer, 320 px controls and all Chaos Kingdom shapes without horizontal overflow, and sticky positioning at 1280 × 550. Reduced-motion behavior was reviewed in source; the browser tool did not expose motion-preference emulation. Capture/character evidence is saved in `artifacts/cartoon-*.png`.

No Site has been created, uploaded, or published.

For UI changes, verify phone and desktop layouts, long English labels, promotion choices, accessible square labels, endgame selection, custom FEN errors, Chaos Kingdom rosters, and the opposite-facing same-device layout. There is no promise of existing browser automation coverage.

## Sites status

The Sites source package must be refreshed against the current project before publication; it is not a verified unchanged-backend deployment artifact. No Site has been created or deployed. There is no `.openai/hosting.json`, linked project ID, or source remote. The current Express/Socket.IO server needs a compatible runtime or an adapter before publication; uploading the frontend build by itself would not run multiplayer. The hosting requirements and publication workflow are documented in [SITES.md](SITES.md).

The owner uploads `sites/between-sites.zip` and says **"@Sites Publish this game. Read sites/README.md."** That future request authorizes preparation and publication. Local development does not publish anything.


The later October 25 character/readability and player-show refinement passed **116/116 automated tests**, including seven preference/migration cases and two regressions for superseded shows. The full suite includes rule, persistence, and real-client transport tests. Production compilation also passed.

Browser verification used an isolated in-memory server, leaving the owner's saved rooms untouched. It covered all five artwork/animation combinations, preference retention across reload, immediate Off cleanup, no hidden pieces after travel, and native radio controls. Two independent online tabs used Cartoon + On board and Classic + By players simultaneously: both saw the same actual capture participants, each had only its own player-side show, and reconnect did not replay history. A capture followed rapidly by an unrelated reply replaced the earlier show without resurrecting it. Same-device checks covered both opposing rows, 2100 ms ordinary shows and 2800 ms capture shows, no fight overlays inside the board, both castling characters, and promotion preserving the pawn's identity while changing its hat.

Responsive checks covered 320/390 px phone layouts, all three Chaos Kingdom board widths, phone fullscreen, 1440 px desktop player-name stages, and three-player cards in one desktop row at 1280 × 550. Three-player shows faced 0/120/240 degrees; four-player shows faced 0/90/180/270 degrees, with 146 px cards and no horizontal overflow at 320 px. Both calm and Royal Ruckus backgrounds were checked. Browser logs contained no warnings or errors. Reduced-motion behavior was reviewed in source; motion-preference emulation was unavailable. Evidence: `artifacts/queenie-player-shows-desktop.png`, `artifacts/queenie-player-shows-phone.png`, and `artifacts/queenie-player-show-online.png`. No publication is authorized or performed.


The independent-switch and intensified-capture revision supersedes the preceding animation-control and no-board-fight descriptions. Earlier verification entries describe their own revisions. The final verification for this revision follows.


Latest October 25 verification: **120/120 automated tests passed**, including all six effective display combinations, both generations of preference migration, independent channel completion, reduced-motion expiry, superseded-show retirement, and the existing rules/persistence/real-client integration suite.

Browser checks used a separate in-memory server and test origin, without modifying the owner's saved games. A fresh origin showed Cartoon, board on, players off, and Hints off. All four Cartoon combinations and both Classic states were exercised with actual moves/captures. The board switch disappears under Classic, its value survives returning to Cartoon, and switching artwork does not enable player shows. Preferences survive refresh; Hints restarts off but its manual toggle still reveals authoritative legal targets. Simultaneous capture effects used the same exact actor/victim, 1800 ms board and 3200 ms player-side durations, pointer-transparent overlays, no residual hidden pieces, and no implicit player show when its switch is off. En passant used the pawn on d5 when landing on d6; a capture-promotion at b8 retained the a7 pawn identity in all three views. Two independent online seats verified different choices, viewer-only shows, matching capture participants, an entirely still client, and reconnect without replay.

Both themes and 320/390 px phone controls were inspected without horizontal overflow. Three-player and four-player shared-device moves simultaneously rendered one board movement plus three/four player shows with the correct seat rotations; turning both off removed all stages and hidden-piece classes. Desktop evidence uses 1440 × 950. Browser logs reported no warnings/errors. Reduced-motion behavior was reviewed in source; browser motion-preference emulation was unavailable. Screenshots: `artifacts/queenie-dual-animation-desktop.png` and `artifacts/queenie-dual-animation-phone.png`. Publication remains unrequested.


### October 25: both locations by default and a clear capture winner (historical choreography)

This revision changed fresh display defaults to Cartoon with **On board** and **By players** both on. Explicitly stored choices, including Off, and legacy migration behavior remained unchanged. App initialization began passing genuinely missing legacy values through instead of manufacturing an old board-only selection. The player-side capture remained 3200 ms and the board capture 1800 ms. At that time, player-side impacts aligned with the board at about 0.7, 1.0, and 1.3 seconds; the defeated character exited by about 1.6 seconds, and the actual winner had time for two celebratory hops and a held pose. The later rendered-action revision supersedes that three-impact/early-exit choreography. Capture promotion changed its role before celebrating. Ordinary and reduced-motion durations were unchanged.

Verification for this revision: **121/121 automated tests passed**, including a new explicit-Off preservation case and all existing rule, persistence, and real-client integration tests. Production compilation passed. Read-only choreography review confirmed capture promotion alignment and unchanged reduced-motion overrides. Browser verification used isolated local origins and an in-memory backend: a fresh origin showed Cartoon and both animation switches on with Hints off; an older test origin retained its stored Off choices. A prepared four-piece Endgames position produced Qxd5, simultaneous board and opposing player-row scenes, a visible winning queen after the board fight ended, and clean completion. At 390 px both 64 px player stages fit, the winner remained visible, and there was no horizontal overflow. The queen-click decoration still disappeared after its short lifetime.

The actual UI was recorded in three segments: hero entrance after refresh, an opposing queen's mini-signature, and the simultaneous capture followed by celebration. The 12-second 1440 × 950 H.264 video was decoded and checked after encoding; screen samples retain their original timing. The older MP4 was removed on October 26, 2026. See [ANIMATION_DEMO.md](ANIMATION_DEMO.md) and the reusable `artifacts/animation-demo.fen`. Desktop and phone victory screenshots are `artifacts/queenie-animation-victory.png` and `artifacts/queenie-victory-phone.png`. Earlier verification entries describe their own revisions; no new online UI or reduced-motion emulation claim is made here. No publication occurred.


### October 25: initial Porcelain Playhouse implementation (historical vector treatment)

This first implementation preserved game rules, modes, options, defaults, saved state, and transport behavior while adding the ivory day/midnight navy palette. Shared slate/stone boards, champagne trim, soft tray shadows, consistent typography, porcelain-style original SVG characters, matching player portraits, and small multiplayer seat emblems formed one collection. Move and capture effects used anticipation, brief contact holds, restrained coral/champagne marks, and a clear winner celebration. The 900/1800 ms board and 2100/3200 ms player-show lifetimes remained unchanged. The owner subsequently rejected its flat appearance relative to the concept; the rendered artwork and scene revision described above supersedes this treatment. The verification below applies to this historical vector version only.

Verification: **121/121 automated tests passed**, including character identity, display preference migration, game rules, persistence, and real-client multiplayer integration. Browser checks ran against a separate in-memory backend, preserving the owner's saved games. Desktop checks covered Classic, Endgames, both multiplayer boards, Chaos Kingdom day/night switching, all three custom shapes, and sticky tall-board scrolling. Phone checks at 390 px and a 320 px full custom arena had no horizontal overflow. Original Classic artwork remains selectable and hides only the board-animation switch; the retained Cartoon setting restores both independent controls. Rendered SVG IDs were unique.

A prepared local Qxd5 capture displayed the same two characters on the board and in both opposing player rows, followed by the surviving queen's celebration after the board effect finished. Two independent online browser origins completed e4/e5 with synchronized positions and exactly one viewer-side show per client. Both browser consoles reported no warnings or errors. Reduced-motion fallbacks were reviewed in source; motion-preference emulation was not available. The previous demo documented the earlier artwork; that MP4 was removed on October 26, 2026. New review screenshots were kept outside the repository in the task's visualization folder.

No publication was requested or performed.


### October 25: rendered porcelain collection and reference capture

The current implementation bundles seven original PNG assets: two sixteen-character neutral atlases, a four-army collection, two action atlases, and daytime/midnight table environments. Exact source-frame coordinates account for the generated atlas spacing. Promotions and repeated roles retain their original face details and identity marks. Action artwork is decoded ahead of play, including Classic pieces with By players enabled; neutral/vector fallback remains available on load failure. The hero signature stays visible independently of game state.

Capture scenes now follow the supplied approach → arm strike → fallen defender / celebrating winner storyboard. Both locations contact at approximately 1000 ms. The board lasts 1800 ms and returns to the actual destination; player scenes last 3200 ms, retaining the fallen opponent with a blue dizzy spiral beside the raised-arm winner until the fade. These are rendered sprite poses with animated transitions, not a real-time 3D simulation. Game rules, options, clocks, defaults, and saved data are unchanged.

Verification: **121/121 automated tests passed**, including rules, persistence, identity, animation preferences, and real-client multiplayer integration. The initial sandbox run could not open loopback sockets; the complete rerun with local networking passed.

Browser verification used a separate in-memory server and test origins. Desktop checks covered both rooms, both multiplayer geometries, all custom board shapes, short-window sticky behavior, and original Classic artwork. Mobile inspection covered 320/390 px layouts and an actual 391 CSS px capture with 318 px player stages and no horizontal overflow. A queen captured a rook on d5 simultaneously on the board and in the two opposing player rows; the winner and fallen opponent remained visible after the board settled. Switching By players off cleared its active scene immediately; restoring the switches did not replay the old move. Promotion checks covered both colors, queen and knight choices, takeback, and retained physical identity. Multiplayer queen decorations now measure their polygon instead of the enclosing sprite bounds; the phone popup stays near its square and inside the viewport. Browser warning/error logs were empty. Reduced-motion behavior was reviewed in source, not emulated in the browser.

At this revision, the capture was recorded with original screen-sample timing in a 1440 × 1000 H.264 file. That older MP4 was removed on October 26, 2026. Local decoding and a sampled frame were verified. See [ANIMATION_DEMO.md](ANIMATION_DEMO.md) for the repeatable queen-versus-rook position, and [ART_ASSETS.md](ART_ASSETS.md) plus `art-prompts.json` for artwork provenance.

No publication has occurred.


### October 25: natural left/right edge captures

The owner requested the same choreography at the left and right board edges as in the middle, allowing figures to cross the board rim or be partly clipped by a phone viewport. Removed only the horizontal encounter-center clamp. Capture overlays and their enclosing board frame permit overflow during the capture; stationary tiles retain their clipping and rounded corners. The page clips horizontal viewport overflow without creating a new sticky scroll container. Fullscreen keeps vertical scrolling and clips horizontal excess. All timing, artwork, player-side shows, vertical constraints, and authoritative moves remain unchanged.

Verification: **121/121 automated tests passed**. Browser checks used an isolated in-memory server and a six-piece custom position: White Qxa5 crossed the left board rim, and upside-down Black Rxh4 crossed the right rim. Both settled on the correct square with no remaining board effect or hidden piece. At 1440 px and 320 px, the document width matched the viewport. A phone replay retained visible capture/frame overflow with viewport clipping. Console warning/error logs were empty. Fullscreen clipping was reviewed in CSS; the preview did not retain fullscreen across automated interactions, so sustained fullscreen playback was not independently verified. Evidence: `artifacts/queenie-edge-capture.png`. No publication occurred.


### October 25: shared local confirmation and compact crowned header

Same device now reviews the rules with one **Agree & start game** action for two, three, or four players. Two-player rules still face both players; per-seat start checkboxes are removed. Three/four-player review retains the full rules and named crew, with the start button visible below its scrollable content. Online seats continue to confirm independently. The header replaces its separate boxed icon with a small crown above Q, keeps DM Sans 700, and exposes Play / Rules / About on phones as well as desktop. Play goes to setup before a game and the board during play. Header/hero spacing is reduced while retaining the decorative signature and all game options.

Tests now have a central catalog in [TESTING.md](TESTING.md). Executable cases remain in `server/*.test.js`; `npm run test:report` saves portable totals, case names, timestamps and a source/artwork fingerprint in `reports/tests/latest.md` and `.json`. Browser observations are recorded separately in `reports/tests/manual.md`, with unexecuted variants stated explicitly. Two added local-transport cases cover shared initialization/rematch for all seat counts and rejection of invalid/ended starts. **123/123 automated tests passed**, with no failures or skips and no source changes during the run.

Actual browser checks used disposable origins and an in-memory server. They covered two-player cancel/edit/review, complete facing rule copies without checkboxes, keyboard/pointer single-action start, a local move and refresh, Endgame and Chaos Kingdom start, three/four-player cancel/start/resign/rematch with names preserved, independent online readiness reset and synchronized e4/e5 followed by reconnect, and navigation. Responsive inspection covered 1440 × 950, 1280 × 550, 390 × 844 and 320 × 740; no horizontal overflow was found, the crowned brand retained its font, and phone navigation had 44 px targets. At 320 px the shared start button was fully visible at 44 px height. These checks do not claim every manual case, physical device, full multiplayer move cycle, or reduced-motion/browser combination was rerun. See the manual report for precise limits.

Proofs: `artifacts/queenie-compact-header-desktop.png`, `artifacts/queenie-compact-header-phone.png`, and `artifacts/queenie-shared-start-phone.png`. No publication is authorized for this update.


### October 25: seats around the table, aligned panels and compact video

Four-player shared-device name/clock/animation strips now surround their armies: Red below, Blue left, Yellow above and Green right. The entire strip faces its player. Three-player strips follow the two upper slopes and lower edge without card backgrounds or borders. Online placement follows the viewer's board rotation, leaves labels upright and reserves a show only for that viewer. Turning By players off reclaims stage space. The authoritative board geometry, movement, consent and outcomes are unchanged.

A single compact mode/context row replaces the previous stacked marketing and board introductions. The decorative Queenie’s signature remains. The left game surface and right setup/active panel now share their desktop top edge; mobile retains a stacked single page. A labelled **Leave** button replaces the tiny active-game X and retains the existing confirmation flow. No game options were removed.

Verification: **125/125 automated tests passed**, including two new spatial seating cases, with no failures or skipped cases. Actual browser checks covered shared three/four-player moves and all corresponding shows, 320/390 px layouts, mode/top-edge alignment, short-window sticky fallback, local Leave/cancel/keyboard behavior, and a real three-seat online game with separate readiness and one viewer-only show per session. Detailed scope and limitations are recorded in [reports/tests/manual.md](../reports/tests/manual.md); fullscreen did not activate in the in-app check and reduced motion was not re-emulated.

The historical 6.4-second recording showed a real endgame: Black Rd6–d5 followed promptly by White Qd4xd5 and celebration, with the board and both player-name shows visible. It is a continuous timed browser capture, not a concept render. [ANIMATION_DEMO.md](ANIMATION_DEMO.md) contains the repeatable position and capture details. That older MP4 was removed on October 26, 2026; the reusable fixture and verification notes remain.

This completes the requested UI/video work. No publication is authorized or performed.


### October 25: persistent local preview and automatic multiplayer start

The owner requested that the 5179 preview stay available, asked to inspect the four-player show area without unnecessary changes, and removed the separate I agree step for online multiplayer rooms. The earlier separate-readiness descriptions for three/four-player starts are superseded; two-player online confirmation and same-device shared review remain unchanged.

`scripts/local_preview.mjs` runs the live frontend at 127.0.0.1:5179 and a separate persisted game server at 127.0.0.1:3006. `npm run dev:5179` is the restart command. The owner's background preview is left running after development; it is not a disposable QA server or a published site. It requires an awake computer and does not automatically relaunch after reboot. Private rooms and its local log remain under excluded `.data/`.

Online party rooms now start on the final connected arrival. Reconnecting a disconnected occupied seat can complete the table; valid waiting-room 4→3 changes can start the remaining complete table. Clocks start only then. Credentials, versions, seat ownership and rule validation remain authoritative. Duplicate joins/reconnects and old-client ready requests cannot restart play or reset clocks. Takeback, draw and rematch approval rules are unchanged. The waiting-room copy shows Joined/Reconnecting and automatic-start guidance, with no party readiness button.

Four-player visual checks reproduced ordinary moves and captures in all four surrounding stages at desktop and phone sizes, with matching identities, correct rotations, visible celebration/fallen poses and working channel toggles. No defect was reproduced, so the animation layout was retained. See the current `reports/tests/manual.md` entry for exact scope and evidence. No publication is authorized.

Verification for automatic party start: **128/128 automated tests passed**, including real-client three/four-seat startup, waiting count changes, occupied disconnected seats, credentialed restoration of persisted waiting rooms, duplicate/stale requests and clocks. A real three-browser timed game confirmed no ready buttons, frozen waiting clocks, immediate start on final join and a synchronized first move; Classic retained its ready button. The normal 5179 page and its backend responded successfully, and a second launch safely rejected its port conflict. Production compilation passed.


### October 25: cooperative 2v2 Teams

The owner requested 2v2 within the existing multiplayer category. Four-player setup now offers Free-for-all / 2v2 Teams before player names. Three players remains Free-for-all and resets the format accordingly. Team membership appears beside player names, in preferred-seat choices, the review, waiting room, active panel and rules. The compact mode title is 2v2 Teams. Resignation warns that both teammates lose, and the result names both winning colors. Existing visuals, controls, spatial seating and animation preferences are retained.

The authoritative engine implements allied blocking without friendly capture/check, own-king safety, checkmate only at the affected turn, whole-team resignation/timeout loss and stalemate draw. Local and remote sessions retain both winners and stop every clock on a team result. Four-seat unanimous takeback/draw/rematch rules stay intact, with takebacks Off by default. Settings/replays bind to the selected format; missing legacy values remain Free-for-all. Online games still start on the final connected join.

Verification: **151/151 automated tests passed**, with zero failures, skips, cancellations or todos. This adds 23 behavioral cases covering team legality, delayed checkmate and rescue, terminal results, draws, consent, clocks, persistence and four real network clients. The full run finished at `2026-10-25T20:52:36.242Z`; source/artwork SHA-256 `06c4d7e9ead3c871a4f19b8402daa361ee96a3ac92a1cdce54038736c5e63e12` remained unchanged during the run. Actual browser checks covered local review/rematch, four independent online seats with a full synchronized move cycle, reconnect, allied-piece control rejection, team resignation and identical results. Phone layouts at 320/390 px passed without horizontal overflow. Details and limitations are in [reports/tests/manual.md](../reports/tests/manual.md).

The 5179 local preview remains running. No publication occurred.


### October 25: three direct multiplayer choices

The owner requested one clear selector in place of the separate player-count and four-player-format sections. Multiplayer setup now presents **Three Players**, **Four Players · Free for All**, and **Four Players · Two versus Two** before names. Each choice updates the existing count and format together, retaining the established three-player, four-player free-for-all, and 2v2 rules. Switching to Three Players clears the team format. This is a menu refinement only; saved games, room validation, team membership and automatic online start retain their existing behavior.

Verification: **151/151 tests passed** with no failures or skips, finished `2026-10-25T21:38:44.048Z`, source/artwork SHA-256 `16ba9752d769598902ce539a32ec802a90f57fd44caeb3106f5e03131177189f`. Browser checks confirmed all three direct mappings, the correct local Teams review, readable desktop/320 px controls and an atomic online change from Teams to three-player Free-for-all across two independent sessions. See the latest entry in [reports/tests/manual.md](../reports/tests/manual.md).


### October 25: short Classic and multiplayer demonstration videos

The owner requested short real gameplay videos showing ordinary movement and fighting, including every player's perspective in three/four-player Same device play. Three new videos are available in [ANIMATION_DEMO.md](ANIMATION_DEMO.md): Classic (11.8 s), three-player Free for All (9.5 s), and four-player Free for All (12.9 s). The complete board and all corresponding player shows stay visible, facing each seat. Every multiplayer color performs a recorded move; captures and countercaptures retain the winner's celebration without a long static gap. The game code, controls, rules and animation durations are unchanged.

The final MP4s use actual fixed-camera browser screenshots at 1440 × 1000, encoded as silent H.264 with timestamped holds. They are not conceptual animation or injected game states. Legal opening setup, captured moves and precise media metadata are preserved in `artifacts/demo-sequences.json`; decoded contact posters accompany the files. Verification scope, sampling limitations and file details are in [reports/tests/manual.md](../reports/tests/manual.md). The owner's local 5179 preview remains running.


### October 25: Sites source package excludes demo videos

The Sites source package excludes recorded video files under `artifacts/`. Playable source, the frontend build, runtime artwork, screenshots, posters, move sequences and documentation remain included. The six current demo videos remain available locally; no game code or saved game changes are needed. No publication is authorized or performed.


### October 25: matching remote-play demonstration videos

Three additional videos demonstrate **Play online** with the same opening setup, recorded moves and compact timing as the previous Same device collection. Classic is viewed by White (Alex), three-player Free for All by Yellow (Jordan), and four-player Free for All by Green (Taylor). Each fixed viewer sees upright characters and names, with the player-side show only beside their own name. On-board travel, contact and player-side winner celebrations use the existing animation settings and timings. No game code or options changed.

All moves were entered through nine independent browser-seat sessions connected to an isolated local Socket.IO server. Histories matched across every client in each room, and all nine warning/error logs were empty. This demonstrates real remote-mode synchronization locally; it is not a claim of recording on separate physical devices or a public deployment. [ANIMATION_DEMO.md](ANIMATION_DEMO.md) contains the videos, sequences and recording limitations; [the manual report](../reports/tests/manual.md) records the actual checks. The earlier Same device videos remain intact.

The owner's 5179 preview remains available. No publication occurred.
