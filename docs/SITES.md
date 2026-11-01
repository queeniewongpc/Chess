# Queenie’s: Sites publishing guide

The owner's workflow is deliberately short: upload `sites/between-sites.zip` and say **"@Sites Publish this game. Read sites/README.md."** The implementation and hosting details are below.

Read [AGENTS.md](../AGENTS.md) and [PROJECT.md](PROJECT.md). The product is **Queenie’s**, formerly Between, with the tagline **CHESS FOR YOUR CREW**. The legacy Sites ZIP name and the `between-chess/` archive root are intentionally retained. Preserve the full game, including online rooms and all three Chaos Kingdom sizes with editable starting positions. The ZIP includes the source and built frontend. It is an input for the Sites assistant, not a verified Sites deployment TAR. No project ID has been created or invented, and nothing has been published.

**Current instruction: develop locally and do not publish.** An explicit future request to publish authorizes the preparation and deployment work below. Reading or editing this project is not permission to publish. No creation, source upload, saved cloud version, deployment, audience change, or other Sites mutation is part of local development.

## What is ready, and what comes next

| Deliverable | Meaning |
| --- | --- |
| `sites/between-sites.zip` | Sites source upload containing the game, documentation, tests, and frontend build. Refresh and verify it before publication. |
| `AGENTS.md` and `docs/` | Project requirements, architecture, local testing, and the future publication workflow. |
| Hosted multiplayer | Still requires runtime compatibility work and verification when publication is requested. There is no linked Site, hosting manifest, saved deployment version, or verified production URL in this checkout. |

Describe this as a **Sites source upload**, not as a verified deployment artifact or a live service. Hosting compatibility must be checked before deployment.

## Why the backend needs a compatibility check

Sites documentation confirms HTTP, HTTPS, and WebSockets support, but also notes runtime restrictions on frameworks and background services. WebSocket support does **not** establish compatibility with an unchanged Socket.IO server or a persistent Node process. See [Sites runtime limits](https://learn.chatgpt.com/docs/sites?surface=web).

The following findings come from this repository, not from an assumption about a hosting provider:

| Current implementation | Consequence for deployment |
| --- | --- |
| `server/index.js` calls `httpServer.listen()` and attaches Socket.IO. | A host must run that server model, or the transport and handlers must be adapted. |
| Rooms, sockets, rate limits, and rematch votes live in process memory. | Independent instances cannot safely share a game without coordination. |
| `.data/rooms.json` persists state through Node filesystem writes. | A deployment without durable writable disk needs a real persistence adapter. |
| A timer broadcasts room state and settles timeouts. | A runtime that suspends instances needs timestamp-based reconciliation and supported wake-up/broadcast behavior. |
| `src/useGame.js` calls `io()` without a backend URL. | It connects to the page origin. Putting only the frontend on Sites does not connect it to the original laptop. |
| `vite.config.js` proxies `/socket.io` and `/api` during development. | These local development proxies are not production routing configuration. |
| `npm run build` emits static frontend assets in `dist/`. | The build alone does not contain a running remote-game server. |

### Option A: keep the Node backend

This is the smallest architectural change if an appropriate Node host is available. Hosting the whole application on that host can run the existing production command (`npm run build`, then `npm start`). If Sites must host the frontend, the assistant must implement and test a separate backend connection:

- Introduce an explicit frontend backend URL setting, for example a new `VITE_GAME_SERVER_URL` build-time value. **That option is not implemented in the current code.** Setting it today would have no effect.
- Use a reachable HTTPS backend and compatible secure Socket.IO transport. Do not use `localhost`, a private LAN address, or an HTTP backend from an HTTPS page.
- Configure allowed frontend origins and the transport's origin checks. Keep player membership, turn checks, version checks, and credentials enforced by the server.
- Give room storage durable backing and an operating model appropriate to the number of server instances.
- Test from separate networks after publication, including disconnect/reconnect and expired rooms.

Choosing, paying for, configuring, or deploying an external backend is future work. No external provider or credentials have been configured in this project.

### Option B: adapt the whole game to Sites

The current Sites connector describes deployment archives containing static assets or a supported Worker entrypoint. Inspect the current Sites skill, starter, and tool schemas before implementing a runtime adapter; this document intentionally does not invent a hosting manifest or promise an unchanged Node server will run.

Reuse `shared/game.js`, `shared/partyChess.js`, `shared/partySession.js`, the UI, and the behavioral tests. Adapt server entrypoints, transport, and room storage to supported facilities. Official documentation describes [D1 for structured records and R2 for objects](https://learn.chatgpt.com/docs/sites/data-and-connections); neither fact alone establishes room concurrency or WebSocket broadcast semantics. Verify what stateful coordination facilities the current Sites environment actually exposes before selecting an implementation.

Preserve atomic version checks, per-seat credentials, independent undo budgets, ready-state resets, pending-consent rules, elapsed clock accounting, and persistence. Multiple requests or instances must not accept contradictory moves. Do not rely on one process's `Map`, an uninterrupted interval, or local JSON writes as a hosted source of truth.

A static-only version would support same-device play but would not satisfy the remote multiplayer requirement. It is acceptable only if the user explicitly chooses that reduced scope.

## Sites publication workflow

These operational notes reflect the Sites connector schemas available at the last review; verify the current tools before using them. Follow them only when the owner requests the corresponding Sites work; opening this guide is not that request.

1. Read the source, project documentation and root [TEST_CASES.md](../TEST_CASES.md) before validation. Add new or changed case definitions to that same catalog; retain and extend executable assertions in `server/*.test.js`. Run `npm ci`, `npm run test:report`, and `npm run build`. Inspect the current runtime requirements before adding configuration.
2. Inspect `.openai/hosting.json` if present. This source currently has no such manifest or `project_id`. Do not invent IDs. Reuse an existing linked project only after verifying access to the corresponding Site.
3. Complete the agreed compatibility work and local tests first. Use the current supported manifest/starter format, not a speculative example copied from this guide.
4. When Site provisioning is authorized, use the current Sites creation tool only if no project is already linked. Persist its exact returned project ID immediately and preserve other manifest fields. Recover missing repository credentials for that same project instead of creating duplicates.
5. Use the Site's returned source repository, branch, and supported authentication flow. Keep short-lived credentials out of files, logs, ZIPs, and documentation. This source bundle contains no Git history, configured remote, or credentials; a local Git repository may need initialization at this stage.
6. Commit and push the exact source state used for the build. The version-saving tool requires the full pushed commit SHA, not an arbitrary local revision.
7. Build the actual Sites deployment archive from that same source using the current packaging guidance. It must include the required hosting manifest and supported build output. **`between-sites.zip` is a source upload, not the deployment TAR.**
8. Only save a cloud version if the user's request authorizes that step. For an authorized cloud review, save without deployment and do not opt into automatic publication on push. For local-only preparation, stop before any cloud mutation. A version ID is not a deployment URL.
9. When the user explicitly requests publication, deploy the saved version with the requested audience. Reuse the correct project and saved-version IDs, preserve an existing audience unless asked to change it, and observe deployment status until success or a clear failure.
10. Test the resulting production link as the intended visitors. Report the actual verified URL and any remaining limitation; do not call it a preview merely because the tool happens to expose a preview-named field.

## Publication acceptance checklist

Use [TEST_CASES.md](../TEST_CASES.md) as the maintained case catalog; the checks below highlight deployment concerns and do not replace it. Add newly discovered test cases to that catalog and record actual execution evidence in `reports/tests/`.

- Queenie’s branding and CHESS FOR YOUR CREW appear consistently. English copy fits both phone and desktop layouts, including accessibility labels and errors. Play online / Same device and the four game categories remain clear.
- Keep DM Sans 700 for all wordmarks across themes. Preserve the one-time hero signature and the temporary queen-click lettering, including reduced-motion behavior, phone bounds, and normal legal captures.
- Chaos Kingdom and 3–4 Players use the Porcelain Playhouse midnight room; Classic and Endgames use its ivory daytime room. Include all bundled `public/art/` assets. Theme switching preserves gameplay and readable multiplayer seat colors.
- Two-, three-, and four-player rooms accept the correct number of independent clients and show identical settings. Two-player rooms require both independent confirmations; party rooms start automatically when every configured seat is occupied and connected, with clocks stopped while waiting.
- Each client sees the same board after legal moves; illegal, stale, out-of-turn, and unauthenticated requests fail.
- Free takebacks work immediately; approval takebacks require the other player in two-player games or every other seated player in multiplayer. Rejection does not spend allowance. Undo cannot manufacture clock time.
- Standard special moves, custom FEN validation, endgame starts, and both Chaos Kingdom win conditions and independent king selection still work.
- Reload/reconnect preserves the correct seat when its credential is available, and storage behaves as documented across the hosting runtime's lifecycle.
- Same-device play retains complete opposite-facing rules/pieces for two players and shared rules with seat-facing armies for multiplayer. One shared **Agree & start game** action starts the table after review.
- The 96-cell hex and 160-cell cross preserve legal moves, king safety, elimination, clocks, event persistence, and all-seat rematches. See MULTIPLAYER_RULES.md for the deliberate variant rules.
- Test the chosen audience from another account or device. Select visitor access separately from permission to edit the Site.

## Refresh the Sites source package

Refresh `sites/between-sites.zip` when requested or before an authorized publication. Build the frontend and verify that the Sites ZIP contains the current source and build. Keep `sites/` limited to its short README and source ZIP. Exclude generated archives, dependencies, caches, machine-specific Git state, deployment credentials, and private game data. Do not run packaging automatically after documentation edits.

Demo video files under `artifacts/` are deliberately excluded from the Sites ZIP. Preserve local originals. Source, runtime artwork, screenshots, posters and repeatable demo instructions remain included.

## Sources

Rechecked October 23, 2026 using the fetched official pages: [project compatibility and production URLs](https://learn.chatgpt.com/docs/sites/creating-a-site), [runtime capabilities](https://learn.chatgpt.com/docs/sites?surface=web), [storage choices](https://learn.chatgpt.com/docs/sites/data-and-connections), and [project linkage, saved versions, and deployment](https://learn.chatgpt.com/docs/sites/managing-a-site). These sources establish the supported workflow, not compatibility of this unchanged Node server.

The read-only inspection of the current connector's `save_site_version` schema requires a deployment TAR containing `.openai/hosting.json` and supported build output, plus a verified project ID and the full SHA of the exact source already pushed to that Site. The archive is build output or configured static assets, not the source tree. Check current tool schemas and Sites implementation guidance before using them. ZIP upload to chat and saving a deployment version are separate operations. No Sites operation was invoked during this readiness audit.
