# Queenie’s: three- and four-player chess

This feature was authorized on October 23, 2026. This document defines the implemented variant; the verification record in PROJECT.md records what has actually been tested.

## Product structure

The four categories are Classic, Endgames, 3–4 Players, and Chaos Kingdom. Chaos Kingdom is the renamed Custom Arena and retains its existing `half` settings and saved-game compatibility. Connection type is independent: Play online or Same device. Choose the game, then the player count when applicable, then enter names. Online players enter only their own nickname. Same-device games ask for two, three, or four names as appropriate.

The multiplayer category offers Free-for-all for three or four players and **2v2 Teams** for four players. Both use familiar chess pieces; 2v2 uses the same four-player cross board. It does not expose the endgame editor, free piece selection, or custom arena sizes. Its internal mode is `party`, with `playerCount: 3 | 4` and `partyVariant: ffa | teams`. Missing `partyVariant` means `ffa`, preserving old games. `teams` requires four players; selecting three in setup returns to Free-for-all. Its seat identifiers are `red`, `blue`, `yellow`, and `green`; a three-player game uses the first three. Existing two-player identifiers remain `w` and `b`.

## Boards and Free-for-all victory

- Three players use a 96-cell, three-sector board. Each player starts with a standard 16-piece army. The geometry module defines the movement paths and display polygons together.
- Four players use a 160-cell cross board: a 14 × 14 bounding grid with four 3 × 3 corner blocks removed. Each side starts with a standard 16-piece army.
- Turns proceed clockwise, one move per turn, skipping eliminated players.
- A king is never captured. A legal move must leave the moving player's king safe from all active opponents.
- Checkmate and stalemate are assessed when a player's turn arrives. A player with no legal moves is eliminated. Resignation or timeout also eliminates that player.
- Eliminated armies remain on the board as inactive pieces: they block squares and can be captured, but cannot move or attack. The last active player wins. Draw handling is defined by the engine and unanimous active-player consent.

## Shared movement and Free-for-all special rules

- Rooks follow connected files/ranks, bishops follow diagonals, and queens combine both. Knights jump along two grid steps in one direction and one perpendicular step. Kings move one neighboring square and may not enter attack from an active opponent. In Teams, the other member of the same team is not an opponent.
- On the three-sector board, a file crosses the center into an opposing sector. Diagonal and knight paths can branch around the center. Bishops remain on the same square shade. The visible polygons and legal-move engine use the same connectivity; hints show available destinations.
- Pawns move forward along their file, capture diagonally, and may advance two squares on their first move from their original pawn square if both squares are empty. Three-player pawns reverse their local rank direction when crossing a center seam and promote on either opposing back rank. Four-player pawns promote on their eighth rank counted from home, rather than traversing the entire 14-rank board.
- Promotion offers queen, rook, bishop, or knight. Castling follows the familiar unmoved king/rook, clear path, and safe origin/transit/destination requirements. There is **no en passant in multiplayer**. Standard two-player Classic and Endgames keep en passant.
- No player may capture an active king. A king from an eliminated army is an inactive obstacle and may be captured like its other pieces.
- Threefold repetition draws the game. The no-progress draw requires 50 complete rounds without a pawn move or capture: 150 plies with three active players, 200 with four, or 100 with two remaining. Elimination resets that counter. Stalemate eliminates its player; it does not draw the whole game. There is no insufficient-material draw.

These are Queenie’s multiplayer rules, not a claim of FIDE-standard multiplayer chess. The familiar chess pieces are retained; board transitions, promotion routes, and multi-party elimination require explicit rules. Relevant design references are the [96-cell three-player board](https://patents.google.com/patent/US3652091A/en) and [four-player chess overview](https://www.chess.com/terms/4-player-chess). The latter also describes variants with different scoring systems; Queenie’s uses elimination rather than those point totals.

## 2v2 Teams: the complete table rules

Choose **3–4 Players → 4 players → 2v2 Teams**. Red and Yellow are partners; Blue and Green are partners. Partners sit opposite each other, so the ordinary Red → Blue → Yellow → Green order alternates teams. Everyone keeps their own 16-piece army, name, seat credential and individual clock. Online players still enter only their own nickname; same-device setup accepts all four names.

### Playing together

- Move only your own army on your turn. Teammates may discuss plans, block enemy attacks or capture an attacker to help each other; this does not grant control of the other seat.
- A teammate's piece blocks its square and sliding paths like your own piece. It cannot be captured, moved through or used as your castling rook. Knights can jump over it as usual.
- A teammate's attacks do not check your king. Your own move must leave **your own king** safe from both opponents, including during castling.
- A teammate in check does not change the turn order or require you to remove that check on your turn. You may help if you have a legal move. Checkmate/stalemate is assessed only when the affected seat's turn arrives; intervening moves can change the position and save that king. No live king is ever captured.
- Pawns, castling, promotion choices and geometry stay consistent with Queenie’s existing four-player game: promotion on the eighth rank from home and no en passant. There is no captured-piece transfer or shared piece pool.

### Ending the game

| Event | Result |
| --- | --- |
| A player reaches their turn in check with no legal move | Their whole team loses; both opponents win together. One checkmated king is enough. |
| A player reaches their turn without check but with no legal move | The whole game is a draw (stalemate). |
| Any player resigns or runs out of time | Their whole team loses immediately, including when the teammate still has pieces. |
| The same full position and turn occurs three times | Draw. |
| 50 full rounds (200 plies) pass without a pawn move or capture | Draw. |
| All four players accept a draw offer | Draw. |

A team ending stops all four clocks and freezes the complete final board. There is no elimination-to-three-players phase in Teams, no scoring by captured material and no need to capture both kings. Results identify both winning colors and the affected player. Insufficient-material auto-draw is not part of this variant; the explicit draw rules above apply.

Takebacks default to Off. If enabled, allowances remain per player. Ask first needs the other three seats (including the teammate), and no takeback can reopen a finished game. Online rematches need all four seats and keep teams, names and settings; same-device rematches use the shared review. Existing Cartoon/Classic art, both animation channels, hints and opposite-facing seating work in either format.

The opposite-seat teams, no friendly capture, checkmate-at-turn victory and stalemate draw follow the familiar [four-player Teams pattern described by Chess.com](https://www.chess.com/terms/4-player-chess). Queenie’s deliberately retains its existing eighth-rank promotion and clock/consent behavior; it is not an implementation of every Chess.com or FIDE rule.

## Agreement, takebacks, clocks, and recovery

- Online three/four-player rooms start automatically when every configured seat is occupied and connected. No separate I agree action is required. Rules stay visible in the waiting room; edits are validated before starting. A disconnected occupied seat keeps the table waiting until authenticated reconnect. Changing a waiting four-player room to three can start it immediately if those three seats are connected. Waiting does not consume clock time. Two-player online games retain their separate readiness confirmations.
- Same-device players review the full shared rules and named seats together, then one person chooses Agree & start game for the table. Online party rooms keep automatic start for both formats.
- Multiplayer takebacks default to Off. Free and Ask first remain available as pre-game choices, with the existing per-player allowance and ply semantics.
- Ask first requires every other seated player to accept, including an eliminated player who could be restored by the undo. One rejection cancels the request; the requester cannot approve for someone else online.
- Free-for-all move-caused eliminations can be undone while the game continues. Finished games cannot be taken back in either format. Takebacks cannot cross an explicit resignation or timeout boundary.
- Undo never refunds elapsed thinking time or creates extra increment time. Pending takeback deliberation is charged to its requester.
- Draw offers need all remaining active players. Rematches need all seated players and retain their seats.
- In Free-for-all, a timed-out or resigned player is eliminated while the other players continue. In Teams, either event ends the whole game with the other team winning. Disconnecting does not pause a running clock.
- The server owns rules, clock settlement, seat authentication, versions, and persistence. A room code does not grant control of a seat. Same-device play uses the same engine and session rules.
- Hints default to Off and display legal moves, not engine recommendations. A manual toggle remains a display preference.

## Presentation

Online players should see their own army from their side. On a shared screen, each army's pieces and its entire name/clock/animation strip face its own seat. Four-player strips surround the cross: Red below, Blue left, Yellow above and Green right. Three-player strips are borderless below and along the two upper sloping edges. Online seat placement follows the rotated board, keeps labels upright, and shows an animation stage only for the viewer. Existing two-player opposite-facing pieces and agreement remain supported. Use distinct seat colors, names, turn indicators, clocks, and elimination status; color alone must not identify a player. Desktop boards remain visible alongside scrolling setup. Phones retain a single page scroll and readable controls.

Multiplayer and Chaos Kingdom share the Porcelain Playhouse midnight room, with rendered coral, lake-blue, honey, and jade armies. The Queenie’s wordmark and CHESS FOR YOUR CREW tagline are universal; the four mode names remain separate. Theme sharing does not merge their rules: multiplayer retains its own board geometry, safe kings, and explicitly selected Free-for-all or Teams victory rules. Classic and Endgames use the warm ivory daytime room.
