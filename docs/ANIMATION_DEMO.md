# Queenie’s: animation demos

Read [TEST_CASES.md](../TEST_CASES.md) for current test definitions, including Q-M21/Q-M41. Add new or changed animation test cases there; keep this document for repeatable sequences and recording notes, executable assertions in `server/*.test.js`, and actual observations in [reports/tests/manual.md](../reports/tests/manual.md).

The six current MP4 demos are retained locally: three Play online recordings and three Same device recordings. They are intentionally omitted from the Sites ZIP. The three older MP4s were removed on October 26, 2026; reusable fixtures and historical verification notes remain. The links below work only where those local videos are present. Posters, move sequences and recording instructions remain in the project; missing video files do not affect the game.

## Current Play online collection

These three new clips record **Play online**, with the same legal moves and essentially the same lengths as the Same device collection below. Each player acts through an independent browser client connected to a real Socket.IO room. Recording uses one player's view: White/Alex for Classic, Yellow/Jordan for three players, and Green/Taylor for four players. Names and characters stay upright, and the player-side show belongs only to the viewer. Cartoon, On board and By players are enabled.

| Clip | Length | Recorded view and action |
| --- | --- | --- |
| [Classic · Play online](../artifacts/queenie-demo-remote-classic.mp4) | 11.8 seconds | White/Alex: e4, d5, exd5, Qxd5. Two ordinary moves lead into a capture and countercapture. |
| [Three players · Play online](../artifacts/queenie-demo-remote-three-players.mp4) | 9.5 seconds | Yellow/Jordan: Red queen travels, Blue pawn captures, Yellow bishop captures the Red queen. |
| [Four players · Play online](../artifacts/queenie-demo-remote-four-players.mp4) | 12.9 seconds | Green/Taylor: Red captures, Blue advances, Yellow captures Green, then Green recaptures. |

The videos are silent **1440 × 1000 H.264 MP4s**, encoded at 30 fps from timestamped screenshots. The source averages approximately 7–9 distinct captures per second, with some capture gaps up to 0.63 seconds. Screenshots are held between samples; there is no motion interpolation, changed animation speed or gameplay cut. Final holds preserve the completed celebration. The three/four-player exports differ from their Same device counterparts by less than 0.002 seconds due to media timescale rounding. Precise moves, action times, viewer identities, capture counts, lengths and file hashes are in [remote-demo-sequences.json](../artifacts/remote-demo-sequences.json).

This is a demonstration of the online transport using independent clients on one computer and a local in-memory server. It is not a claim of separate physical devices, internet hosting, or network-latency testing. All nine clients ended with matching public move history within their respective rooms; no browser warning/error logs were reported. Each multiplayer client retained exactly one viewer-side show area with upright names. The owner's saved games were not changed, and nothing was published. These videos remain local and are excluded from the Sites ZIP, just like the Same device videos.

### Repeat the online scenes

Choose **Play online**, create the corresponding Classic, Three Players, or Four Players · Free for All room, and join every other seat from a separate browser session. Use Alex/Sam for Classic or Alex/Riley/Jordan/Taylor for Red/Blue/Yellow/Green. Keep untimed play, Cartoon and both animation switches on, and Hints off. Classic requires both online players to agree; three/four-player rooms start on the final connected arrival. Perform each move only from the client that owns the active seat.

Use the setup and recorded moves listed under **Repeat these scenes** below. Record the White, Yellow or Green client respectively while the other clients submit their own moves. Keep the camera fixed, allow the player-side celebration to finish, then make the next move promptly. Both multiplayer examples use Free for All, not 2v2, and finish with all players still active.

## Same device collection

This collection records actual **Same device** play with **Cartoon**, **On board** and **By players** enabled. All three clips use standard starting positions and legal moves, with the complete board and every player stage in view. Setup is performed before recording; each delivered clip is a continuous action sequence. The camera stays fixed, and the next move follows the preceding celebration without a long idle hold. No game code or animation timing was changed.

| Clip | Length | What it shows |
| --- | --- | --- |
| [Classic chess](../artifacts/queenie-demo-classic.mp4) | 11.8 seconds | e4, d5, exd5, Qxd5: two ordinary moves followed by a capture and countercapture. White and Black player shows face opposite sides. |
| [Three players](../artifacts/queenie-demo-three-players.mp4) | 9.5 seconds | Red queen travels, Blue pawn captures, Yellow bishop captures the Red queen. All three player shows face their own seats at 0/120/240 degrees. |
| [Four players](../artifacts/queenie-demo-four-players.mp4) | 12.9 seconds | Red pawn captures, Blue pawn advances, Yellow captures Green, then Green recaptures. All four shows face 0/90/180/270 degrees. |

These are silent H.264 MP4s at **1440 × 1000**, encoded at 30 fps from timestamped browser screenshots. Frames are held between samples; there is no invented motion, speed change or gameplay cut. The encoded frame rate is not a claim of 30 distinct screen captures per second. Exact moves, move times and capture counts are in [demo-sequences.json](../artifacts/demo-sequences.json). Executed decoding checks and file durations are recorded in [reports/tests/manual.md](../reports/tests/manual.md). Both multiplayer clips use Free for All; the four-player clip does not demonstrate 2v2.

### Repeat these scenes

Choose **Same device**, leave Cartoon and both animation switches on, use untimed play and turn Hints off. Start through the ordinary shared review.

- **Classic:** choose Classic. Record e2–e4, d7–d5, e4×d5, d8×d5 from the opening position.
- **Three players:** choose 3–4 Players → Three Players. Before recording, play re2–re4, be2–be4, ye2–ye4. Record rd1–rg4, be4×re4, yf1×rg4.
- **Four players:** choose 3–4 Players → Four Players · Free for All. Before recording, play d2–d4, b5–c5, k13–k11, m10–l10. Record d4×c5, b7–d7, k11×l10, m11×l10.

Allow approximately 2.1 seconds for an ordinary player show and 3.2 seconds for a capture show before the next move, including the celebration. The board effect finishes sooner while the player show completes its outcome. These examples win pieces, not the entire game; all participating players remain active at the end. Disposable names are Alex/Sam for Classic and Alex/Riley/Jordan/Taylor for multiplayer. Recording used an isolated in-memory server and did not touch the owner’s saved games or publish anything.

## Reusable compact fixture (video removed)

The retired 6.4-second recording showed the actual local game: Black's rook moves from d6 to d5, then White's queen captures it and celebrates. Both opposing player-name shows and the board animate together, with the characters facing their players. The ordinary move leads promptly into the capture, with no long pause between demonstrations.

- About 0.83 seconds: Black plays **Rd5**; the ordinary board travel and both player shows begin.
- About 3.10 seconds: White plays **Qxd5**; the queen approaches, strikes, and celebrates beside the fallen rook.
- The board capture settles after 1.8 seconds. The player shows keep the winner and fallen opponent visible through their 3.2-second sequence; the video ends at 6.4 seconds.

The silent H.264 MP4 is **1440 × 1000 at 30 fps**, 1,855,595 bytes. It uses one continuous sequence of 84 actual browser screenshots sampled between 0.023 and 6.391 seconds. Frames are held between samples, without interpolation, animation speed changes, or gameplay cuts. The 30 fps encoding does not imply 30 distinct captured frames per second. The encoded file was probed and decoded at contact and victory, including a 5.5-second frame, to check the board and both player shows.

### Repeat the earlier compact demo

Choose **Same device → Endgames → Custom position**. Paste this into **Starting position (FEN)**:

```text
8/7k/3r4/8/3Q4/8/8/K7 b - - 0 1
```

The same position is saved in [compact-move-capture.fen](../artifacts/compact-move-capture.fen). Keep **Cartoon**, **On board**, and **By players** on; Hints can stay off. Choose **Review & start**, review the facing rules, then select **Agree & start game** once.

Black moves first. Select its rook on **d6**, then **d5**. Let that ordinary player show finish, then promptly select White's queen on **d4** and **d5** to capture. Keep recording through the celebration. Both moves are legal, and the game remains active after the capture: this demonstrates winning a piece, not winning the whole game.

Recording used an isolated local test origin with a disposable game and an in-memory server. The owner's saved games were not changed. No publication was performed. The executed video check is recorded as Q-M21 in [reports/tests/manual.md](../reports/tests/manual.md).

## Historical recording notes (videos removed)

The retired porcelain recording showed the prior layout and the same rendered queen-versus-rook choreography. It was a silent 1440 × 1000, 30 fps MP4 of a single capture, using this reusable position:

```text
8/7k/8/3r4/3Q4/8/8/K7 w - - 0 1
```

The retired 12-second vector demo showed the former artwork: refresh/hero signature at 0–4 seconds, an opposing queen's tiny signature at 4–7 seconds, then a queen capture and celebration at 7–12 seconds. It combines three actual screenshot sequences, omitting setup between them. Its position remains in [animation-demo.fen](../artifacts/animation-demo.fen): `8/7k/8/3q4/3Q4/8/8/K7 w - - 0 1`. Click Black's queen on d5 for the tiny signature, then play White Qd4xd5.

The older MP4s have been removed. Their fixtures and verification notes remain for reference. Use the six Play online and Same device recordings above for current demonstrations.
