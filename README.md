# Queenie’s Chess Game

**CHESS FOR YOUR CREW**

Private online rooms or one shared device, for two, three, or four people. Choose Classic, Endgames, multiplayer chess, or build your own board and starting position in Chaos Kingdom. The Porcelain Playhouse collection pairs rendered characters with an ivory daytime table for Classic/Endgames and a midnight table for multiplayer/Chaos Kingdom.

**AI: Read [AGENTS.md](AGENTS.md), then [docs/PROJECT.md](docs/PROJECT.md), and carry out the current request.** For a request to run locally, follow [docs/LOCAL_TESTING.md](docs/LOCAL_TESTING.md), start the app, and verify the frontend and backend respond. With no task, wait for the owner's next request.

**Tests:** before running or adding tests, read [TEST_CASES.md](TEST_CASES.md). Keep all new or changed case definitions in that same file. Existing executable tests stay in `server/*.test.js`; add automated assertions there and update their catalog entries together. Save actual run results in `reports/tests/`.

- **Try it locally:** use Node.js 22 or newer. In the project root (the folder containing `package.json`), run `npm ci`, then `npm run dev`; open http://localhost:5173. The first install needs internet access to download dependencies. No API key, Sites account, or external database is required for local play.
- **When ready to publish:** upload `sites/between-sites.zip` and say **"@Sites Publish this game. Read sites/README.md."**
- **Before publication:** refresh and verify the Sites source package against the current project.

Local testing details: [docs/LOCAL_TESTING.md](docs/LOCAL_TESTING.md). Test cases: [TEST_CASES.md](TEST_CASES.md). Execution and evidence guidance: [docs/TESTING.md](docs/TESTING.md) (`npm run test:report`). Sites publishing instructions: [docs/SITES.md](docs/SITES.md). Uploading the ZIP alone does not deploy the game.

Formerly Between. The Sites ZIP filename and the `between-chess/` archive folder are intentionally retained; the game inside is Queenie’s.
