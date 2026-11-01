// A persistent local preview with its own saved rooms and the familiar 5179 URL.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { createGameServer } from '../server/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const service = await createGameServer({ dataFile: path.join(root, '.data/rooms-5179.json') });
let web;
let serviceStarted = false;
let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  await web?.close();
  // A failed port bind must not write an old snapshot over a running preview's saves.
  if (serviceStarted) await service.close();
};
try {
  await service.listen(3006, '127.0.0.1');
  serviceStarted = true;
  web = await createServer({
    root,
    server: {
      host: '127.0.0.1', port: 5179, strictPort: true,
      proxy: {
        '/socket.io': { target: 'http://127.0.0.1:3006', ws: true },
        '/api': 'http://127.0.0.1:3006',
      },
    },
  });
  await web.listen();
  console.log('Queenie’s is ready at http://127.0.0.1:5179/');
} catch (error) {
  await shutdown();
  console.error(error.message);
  process.exitCode = 1;
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => { await shutdown(); process.exit(0); });
}
