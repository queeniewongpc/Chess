import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createGameServer } from './index.js';
import { PartyChess } from '../shared/partyChess.js';
import { createLocalSession, applyLocalAction, localClocks, serializeLocalSession, restoreLocalSession, localSnapshot, checkLocalTimeout } from '../shared/localGame.js';

function localAction(session, event, payload = {}, now = 0) {
  return applyLocalAction(session, event, { expectedVersion: session.version, expectedPly: session.game.history().length, ...payload }, now).room;
}
function legalMove(session) {
  const { from, to, promotion } = session.game.moves({ verbose: true })[0];
  return { from, to, ...(promotion ? { promotion } : {}) };
}

for (const playerCount of [3, 4]) {
  test(`${playerCount}-player same-device names, complete turn cycle, persistence and legal moves remain consistent`, () => {
    const session = createLocalSession({ mode: 'party', playerCount, undoMode: 'free' }, { red: 'Ada', blue: 'Linus', yellow: 'Grace', green: 'Alan' }, 0);
    const colors = localSnapshot(session, 0).colors;
    assert.equal(colors.length, playerCount);
    assert.equal(session.players.red.name, 'Ada');
    for (const color of colors) {
      assert.equal(session.game.turn(), color);
      localAction(session, 'game:move', legalMove(session));
    }
    assert.equal(session.game.turn(), colors[0]);
    const saved = JSON.parse(JSON.stringify(serializeLocalSession(session)));
    const restored = restoreLocalSession(saved, 0);
    assert.equal(restored.game.fen(), session.game.fen());
    assert.deepEqual(localSnapshot(restored, 0), localSnapshot(session, 0));
    assert.throws(() => applyLocalAction(restored, 'game:move', { ...legalMove(restored), color: colors[1], expectedVersion: restored.version, expectedPly: playerCount }, 0), /turn/);
    localAction(restored, 'game:undo', { color: colors[0], plies: playerCount - 1 });
    assert.equal(restored.game.history().length, 1);
  });
}

test('party takebacks require every other seat, reject stale consent, and preserve clocks and independent budgets', () => {
  const session = createLocalSession({ mode: 'party', playerCount: 4, undoMode: 'approval', undoLimit: 2, timeControl: 'blitz' }, {}, 0);
  const firstMove = legalMove(session);
  localAction(session, 'game:move', firstMove, 1000);
  localAction(session, 'game:undo', { color: 'red', plies: 1 }, 2000);
  assert.deepEqual(session.undoRequest.required, ['blue', 'yellow', 'green']);
  assert.deepEqual(localClocks(session, 5000), { red: 299000, blue: 299000, yellow: 300000, green: 300000 });
  assert.throws(() => localAction(session, 'game:respond-undo', { color: 'red', accept: true }, 5000), /no takeback request/);
  assert.throws(() => localAction(session, 'game:move', legalMove(session), 5000), /takeback/);
  const staleVersion = session.version;
  localAction(session, 'game:respond-undo', { color: 'blue', accept: true }, 5000);
  assert.throws(() => applyLocalAction(session, 'game:respond-undo', { color: 'yellow', accept: true, expectedVersion: staleVersion }, 5000), /changed/);
  localAction(session, 'game:respond-undo', { color: 'yellow', accept: true }, 5000);
  assert.equal(session.game.history().length, 1);
  localAction(session, 'game:respond-undo', { color: 'green', accept: true }, 5000);
  assert.equal(session.game.history().length, 0);
  assert.deepEqual(session.clocks, { red: 299000, blue: 299000, yellow: 300000, green: 300000 });
  assert.deepEqual(session.undoUsed, { red: 1, blue: 0, yellow: 0, green: 0 });
  localAction(session, 'game:move', firstMove, 5000);
  localAction(session, 'game:undo', { color: 'red', plies: 1 }, 5000);
  localAction(session, 'game:respond-undo', { color: 'blue', accept: false }, 6000);
  assert.equal(session.undoRequest, null);
  assert.equal(session.undoUsed.red, 1);
  assert.equal(session.game.history().length, 1);
});

test('party free takebacks cannot generate clock time by replaying increment moves', () => {
  const session = createLocalSession({ mode: 'party', playerCount: 3, undoMode: 'free', undoLimit: null, timeControl: 'blitz' }, {}, 0);
  const move = legalMove(session);
  for (let index = 0; index < 4; index++) {
    localAction(session, 'game:move', move, 1000);
    assert.equal(session.clocks.red, 302000);
    localAction(session, 'game:undo', { color: 'red', plies: 1 }, 1000);
    assert.equal(session.clocks.red, 299000);
  }
  assert.equal(session.undoUsed.red, 4);
});

test('resignation and timeout eliminate one player, survive restoration, and cannot be crossed by takebacks', () => {
  const session = createLocalSession({ mode: 'party', playerCount: 4, undoMode: 'free', timeControl: 'bullet' }, {}, 0);
  localAction(session, 'game:move', legalMove(session), 1000);
  localAction(session, 'game:resign', { color: 'blue' }, 2000);
  assert.equal(session.status, 'playing');
  assert.equal(session.game.turn(), 'yellow');
  assert.ok(!session.game.activeColors().includes('blue'));
  assert.throws(() => localAction(session, 'game:undo', { color: 'red', plies: 1 }, 2000), /resignation or timeout/);
  const restored = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(session))), 2000);
  assert.equal(restored.game.fen(), session.game.fen());
  assert.deepEqual(restored.game.eliminations(), session.game.eliminations());
  assert.equal(checkLocalTimeout(restored, 183000), true);
  assert.equal(restored.status, 'playing');
  assert.ok(!restored.game.activeColors().includes('yellow'));
  assert.equal(restored.game.turn(), 'green');
  localAction(restored, 'game:resign', { color: 'green' }, 183000);
  assert.equal(restored.status, 'finished');
  assert.equal(restored.result.winner, 'red');
});

test('party unanimous draw needs only active seats and rejects self approval or eliminated actors', () => {
  const session = createLocalSession({ mode: 'party', playerCount: 4 }, {}, 0);
  localAction(session, 'game:resign', { color: 'green' });
  localAction(session, 'game:offer-draw', { color: 'red' });
  assert.throws(() => localAction(session, 'game:respond-draw', { color: 'red', accept: true }), /no draw offer/);
  assert.throws(() => localAction(session, 'game:respond-draw', { color: 'green', accept: true }), /eliminated/);
  localAction(session, 'game:respond-draw', { color: 'blue', accept: true });
  assert.equal(session.status, 'playing');
  localAction(session, 'game:respond-draw', { color: 'yellow', accept: true });
  assert.deepEqual(session.result, { winner: null, reason: 'agreement' });
});

async function fixture(t, options = {}) {
  const service = await createGameServer({ dataFile: null, logger: { warn() {}, error() {} }, ...options });
  const address = await service.listen(0, '127.0.0.1');
  const clients = [];
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    clients.forEach((client) => client.disconnect());
    await service.close();
  };
  t.after(close);
  return { close, async client() {
    const client = io(`http://127.0.0.1:${address.port}`, { forceNew: true, transports: ['websocket'], reconnection: false });
    clients.push(client);
    await new Promise((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); });
    return client;
  } };
}
const request = (client, event, payload) => client.timeout(3000).emitWithAck(event, payload);
async function requestOk(client, event, payload) {
  const result = await request(client, event, payload);
  assert.equal(result.ok, true, result.error);
  return result;
}
async function table(f, playerCount, settings = {}, seatedCount = playerCount) {
  const clients = [await f.client()];
  const created = await requestOk(clients[0], 'room:create', { name: 'Red friend', color: 'red', settings: { mode: 'party', playerCount, ...settings } });
  let room = created.room;
  const players = [created.player];
  assert.equal(room.status, 'waiting');
  assert.deepEqual(room.legalMoves, []);
  for (let index = 1; index < seatedCount; index++) {
    clients.push(await f.client());
    const joined = await requestOk(clients[index], 'room:join', { code: room.code, name: `Friend ${index + 1}` });
    players.push(joined.player); room = joined.room;
    assert.equal(room.status, index === playerCount - 1 ? 'playing' : 'waiting');
  }
  return { clients, players, room };
}
async function action(client, event, room, payload = {}) {
  return (await requestOk(client, event, { code: room.code, expectedVersion: room.version, expectedPly: room.history.length, ...payload })).room;
}

for (const count of [3, 4]) {
  test(`${count} independent remote seats start on the final arrival and receive the same authoritative moves`, async (t) => {
    const f = await fixture(t);
    let { clients, room, players } = await table(f, count);
    assert.equal(room.status, 'playing');
    assert.equal(room.version, 1);
    assert.equal(room.settings.undoMode, 'off');
    assert.equal(room.colors.length, count);
    const outsider = await f.client();
    assert.equal((await request(outsider, 'room:join', { code: room.code, name: 'Extra' })).ok, false);
    assert.equal((await request(outsider, 'room:sync', { code: room.code })).ok, false);
    assert.equal((await request(outsider, 'game:resign', { code: room.code, color: 'red', token: players[0].token })).ok, false);
    for (let index = 0; index < count; index++) {
      assert.equal(room.turn, room.colors[index]);
      const { from, to, promotion } = room.legalMoves[0];
      const old = room;
      room = await action(clients[index], 'game:move', room, { from, to, promotion });
      assert.equal((await request(clients[(index + 1) % count], 'game:move', { code: room.code, expectedVersion: old.version, expectedPly: old.history.length, from, to })).ok, false);
      const sync = await requestOk(clients[(index + 1) % count], 'room:sync', { code: room.code });
      assert.equal(sync.room.fen, room.fen);
      assert.equal(JSON.stringify(room).includes('token'), false);
    }
    assert.equal(room.history.length, count);
    const replacement = await f.client();
    assert.equal((await request(replacement, 'room:resume', { code: room.code, token: '0'.repeat(64) })).ok, false);
    const resumed = await requestOk(replacement, 'room:resume', { code: room.code, token: players[0].token });
    assert.equal(resumed.player.color, 'red');
    assert.equal((await request(clients[0], 'room:sync', { code: room.code })).ok, false);
  });
}

test('party count changes wait for the configured number and lowering an unoccupied fourth seat starts play', async (t) => {
  const f = await fixture(t);
  let { clients, room } = await table(f, 3, {}, 2);
  const oldVersion = room.version;
  room = await action(clients[1], 'room:settings', room, { settings: { ...room.settings, playerCount: 4 } });
  assert.equal(room.status, 'waiting');
  assert.deepEqual(room.ready, { red: false, blue: false, yellow: false, green: false });
  assert.equal(room.players.green, null);
  const third = await f.client();
  room = (await requestOk(third, 'room:join', { code: room.code, name: 'Third' })).room;
  assert.equal(room.status, 'waiting');
  assert.deepEqual(room.legalMoves, []);
  assert.equal((await request(clients[0], 'room:settings', { code: room.code, expectedVersion: oldVersion, settings: { ...room.settings, playerCount: 3 } })).ok, false);
  assert.equal((await request(clients[0], 'room:settings', { code: room.code, expectedVersion: room.version, settings: { ...room.settings, mode: 'classic' } })).ok, false);
  room = await action(clients[0], 'room:settings', room, { settings: { ...room.settings, playerCount: 3 } });
  assert.equal(room.status, 'playing');
  assert.deepEqual(room.colors, ['red', 'blue', 'yellow']);
  assert.ok(Object.values(room.ready).every(Boolean));
  assert.equal(room.version, 3);
  const started = await requestOk(third, 'room:sync', { code: room.code });
  assert.equal(started.room.status, 'playing');
  assert.equal(started.room.fen, room.fen);
  assert.equal((await request(clients[0], 'room:settings', { code: room.code, expectedVersion: room.version, settings: { ...room.settings, playerCount: 4 } })).ok, false);
});

test('party waiting count changes cannot remove an occupied fourth seat or accept invalid settings', async (t) => {
  const f = await fixture(t, { now: () => 1000 });
  const green = await f.client();
  const created = await requestOk(green, 'room:create', { name: 'Green friend', color: 'green', settings: { mode: 'party', playerCount: 4 } });
  const room = created.room;
  for (const settings of [{ ...room.settings, playerCount: 3 }, { ...room.settings, playerCount: 2 }, { ...room.settings, timeControl: 'invalid' }]) {
    assert.equal((await request(green, 'room:settings', { code: room.code, expectedVersion: room.version, settings })).ok, false);
  }
  const unchanged = (await requestOk(green, 'room:sync', { code: room.code })).room;
  assert.deepEqual(unchanged, room);
});

test('party starts only after an occupied disconnected seat authenticates again, with no waiting-time clock charge', async (t) => {
  let timestamp = 1000;
  const f = await fixture(t, { now: () => timestamp, tickIntervalMs: 100000 });
  let { clients, room, players } = await table(f, 3, { timeControl: 'blitz' }, 2);
  await requestOk(clients[0], 'room:leave', { code: room.code });
  timestamp = 90000;
  const third = await f.client();
  room = (await requestOk(third, 'room:join', { code: room.code, name: 'Third' })).room;
  assert.equal(room.status, 'waiting');
  assert.equal(room.players.red.connected, false);
  assert.deepEqual(room.clocks, { red: 300000, blue: 300000, yellow: 300000 });
  assert.deepEqual(room.legalMoves, []);
  assert.equal((await request(clients[1], 'game:move', { code: room.code, expectedVersion: room.version, expectedPly: 0, from: 'ba2', to: 'ba3' })).ok, false);
  const oldReady = await requestOk(third, 'game:ready', { code: room.code, expectedVersion: room.version, ready: true });
  assert.equal(oldReady.room.status, 'waiting');
  assert.ok(Object.values(oldReady.room.ready).every((value) => !value));
  const replacement = await f.client();
  assert.equal((await request(replacement, 'room:resume', { code: room.code, token: '0'.repeat(64) })).ok, false);
  timestamp = 120000;
  room = (await requestOk(replacement, 'room:resume', { code: room.code, token: players[0].token })).room;
  assert.equal(room.status, 'playing');
  assert.equal(room.version, 1);
  assert.deepEqual(room.clocks, { red: 300000, blue: 300000, yellow: 300000 });
  timestamp += 1000;
  const clocked = (await requestOk(clients[1], 'room:sync', { code: room.code })).room;
  assert.equal(clocked.clocks.red, 299000);
  const duplicate = (await requestOk(replacement, 'room:join', { code: room.code, token: players[0].token })).room;
  assert.equal(duplicate.version, clocked.version);
  assert.deepEqual(duplicate.clocks, clocked.clocks);
  const oldClient = (await requestOk(replacement, 'game:ready', { code: room.code, expectedVersion: room.version, ready: false })).room;
  assert.equal(oldClient.status, 'playing');
  assert.deepEqual(oldClient.clocks, clocked.clocks);
  assert.equal(oldClient.version, clocked.version);
  assert.equal((await request(replacement, 'room:join', { code: room.code, name: 'Duplicate seat' })).ok, false);
  assert.equal((await request(replacement, 'game:ready', { code: room.code, expectedVersion: room.version - 1 })).ok, false);
  assert.equal((await requestOk(third, 'room:sync', { code: room.code })).room.version, clocked.version);
});

test('persisted waiting party rooms do not start until every credentialed seat has reconnected', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'between-party-waiting-test-'));
  const dataFile = join(directory, 'rooms.json');
  let timestamp = 1000;
  const f = await fixture(t, { dataFile, now: () => timestamp });
  let restored;
  t.after(async () => { await f.close(); await restored?.close(); await rm(directory, { recursive: true, force: true }); });
  let { clients, room, players } = await table(f, 4, { timeControl: 'bullet' }, 3);
  await requestOk(clients[0], 'room:leave', { code: room.code });
  const last = await f.client();
  const joined = await requestOk(last, 'room:join', { code: room.code, name: 'Fourth' });
  players.push(joined.player);
  assert.equal(joined.room.status, 'waiting');
  await f.close();
  timestamp = 200000;
  restored = await fixture(t, { dataFile, now: () => timestamp });
  for (let index = 0; index < players.length; index++) {
    const client = await restored.client();
    room = (await requestOk(client, 'room:resume', { code: room.code, token: players[index].token })).room;
    assert.equal(room.status, index === players.length - 1 ? 'playing' : 'waiting');
    assert.deepEqual(room.clocks, { red: 180000, blue: 180000, yellow: 180000, green: 180000 });
    assert.equal(room.history.length, 0);
  }
  assert.equal(room.version, 1);
});

test('remote all-seat takeback consent, independent budgets, unanimous draw and complete rematch votes', async (t) => {
  const f = await fixture(t);
  let { clients, room } = await table(f, 4, { undoMode: 'approval', undoLimit: 1 });
  room = await action(clients[0], 'game:move', room, room.legalMoves[0]);
  room = await action(clients[0], 'game:undo', room, { plies: 1 });
  assert.equal((await request(clients[0], 'game:respond-undo', { code: room.code, expectedVersion: room.version, accept: true })).ok, false);
  room = await action(clients[1], 'game:respond-undo', room, { accept: true });
  room = await action(clients[2], 'game:respond-undo', room, { accept: true });
  assert.equal(room.history.length, 1);
  room = await action(clients[3], 'game:respond-undo', room, { accept: true });
  assert.equal(room.history.length, 0);
  assert.deepEqual(room.undoUsed, { red: 1, blue: 0, yellow: 0, green: 0 });
  room = await action(clients[0], 'game:move', room, room.legalMoves[0]);
  assert.equal((await request(clients[0], 'game:undo', { code: room.code, expectedVersion: room.version, expectedPly: 1, plies: 1 })).ok, false);
  room = await action(clients[0], 'game:offer-draw', room);
  for (const client of clients.slice(1)) room = await action(client, 'game:respond-draw', room, { accept: true });
  assert.equal(room.status, 'finished');
  assert.equal((await request(clients[3], 'game:rematch', { code: room.code, expectedVersion: room.version - 1 })).ok, false);
  assert.deepEqual((await requestOk(clients[0], 'room:sync', { code: room.code })).room.rematchVotes, []);
  for (const client of clients.slice(0, 3)) room = await action(client, 'game:rematch', room);
  assert.equal(room.status, 'finished');
  room = await action(clients[3], 'game:rematch', room);
  assert.equal(room.status, 'playing');
  assert.equal(room.history.length, 0);
  assert.ok(Object.values(room.undoUsed).every((value) => value === 0));
});

test('remote party persistence keeps credentials, eliminated seats, pending consent, and remaining clocks', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'between-party-test-'));
  let restored;
  t.after(async () => { await f.close(); await restored?.close(); await rm(directory, { recursive: true, force: true }); });
  const dataFile = join(directory, 'rooms.json');
  let timestamp = 0;
  const f = await fixture(t, { dataFile, now: () => timestamp });
  let { clients, room, players } = await table(f, 4, { undoMode: 'approval', timeControl: 'blitz' });
  timestamp = 1000;
  room = await action(clients[0], 'game:move', room, room.legalMoves[0]);
  timestamp = 2000;
  room = await action(clients[1], 'game:resign', room);
  room = await action(clients[2], 'game:move', room, room.legalMoves[0]);
  timestamp = 3000;
  room = await action(clients[2], 'game:undo', room, { plies: 1 });
  room = await action(clients[0], 'game:respond-undo', room, { accept: true });
  await f.close();
  const stored = await readFile(dataFile, 'utf8');
  assert.equal(stored.includes(players[0].token), false);
  restored = await fixture(t, { dataFile, now: () => timestamp });
  const resumed = [];
  for (const player of players) {
    const client = await restored.client(); resumed.push(client);
    room = (await requestOk(client, 'room:resume', { code: room.code, token: player.token })).room;
  }
  assert.ok(!room.activeColors.includes('blue'));
  assert.ok(room.undoRequest.required.includes('blue'));
  assert.ok(room.undoRequest.approvals.includes('red'));
  room = await action(resumed[1], 'game:respond-undo', room, { accept: true });
  room = await action(resumed[3], 'game:respond-undo', room, { accept: true });
  assert.equal(room.history.length, 1);
  assert.equal(room.turn, 'yellow');
  assert.ok(!room.activeColors.includes('blue'));
});


test('pending party consent charges its requester until timeout, then resumes remaining players', () => {
  const session = createLocalSession({ mode: 'party', playerCount: 3, undoMode: 'approval', timeControl: 'bullet' }, {}, 0);
  localAction(session, 'game:move', legalMove(session), 1000);
  localAction(session, 'game:undo', { color: 'red', plies: 1 }, 2000);
  const restored = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(session))), 184000);
  assert.equal(restored.status, 'playing');
  assert.equal(restored.clocks.red, 0);
  assert.equal(restored.clocks.blue, 179000);
  assert.equal(restored.game.turn(), 'blue');
  assert.equal(restored.undoRequest, null);
  assert.equal(restored.undoBoundary, 1);
  assert.deepEqual(restored.game.activeColors(), ['blue', 'yellow']);
});

test('server timeout removes one party seat and final resignation awards the last active player', async (t) => {
  let timestamp = 0;
  const f = await fixture(t, { now: () => timestamp, tickIntervalMs: 100000 });
  let { clients, room } = await table(f, 3, { timeControl: 'bullet' });
  timestamp = 180001;
  room = (await requestOk(clients[1], 'room:sync', { code: room.code })).room;
  assert.equal(room.status, 'playing');
  assert.deepEqual(room.activeColors, ['blue', 'yellow']);
  assert.equal(room.clocks.red, 0);
  assert.equal(room.turn, 'blue');
  assert.equal((await request(clients[0], 'game:offer-draw', { code: room.code, expectedVersion: room.version })).ok, false);
  room = await action(clients[1], 'game:resign', room);
  assert.equal(room.status, 'finished');
  assert.equal(room.result.winner, 'yellow');
});

const TEAM_SETTINGS = { mode: 'party', playerCount: 4, partyVariant: 'teams' };
const TEAM_COLORS = ['red', 'blue', 'yellow', 'green'];
function teamDefeat(defeated, reason) {
  const winners = ['red', 'yellow'].includes(defeated) ? ['blue', 'green'] : ['red', 'yellow'];
  return { winner: winners[0], winners, winningTeam: winners.join('-'), reason, defeated };
}

test('same-device teams preserve all four names, turn order, replay and independent takeback budgets', () => {
  const session = createLocalSession({ ...TEAM_SETTINGS, undoMode: 'free', undoLimit: 4, timeControl: 'blitz' },
    { red: 'Ada', blue: 'Linus', yellow: 'Grace', green: 'Alan' }, 0);
  for (const [index, color] of TEAM_COLORS.entries()) {
    assert.equal(session.game.turn(), color);
    localAction(session, 'game:move', { ...legalMove(session), color }, (index + 1) * 1000);
  }
  const restored = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(session))), 4000);
  assert.equal(restored.settings.partyVariant, 'teams');
  assert.deepEqual(localSnapshot(restored, 4000), localSnapshot(session, 4000));
  assert.equal(restored.players.yellow.name, 'Grace');
  const before = localClocks(restored, 5000);
  localAction(restored, 'game:undo', { color: 'red', plies: 4 }, 5000);
  assert.equal(restored.game.history().length, 0);
  assert.equal(restored.game.turn(), 'red');
  assert.deepEqual(restored.undoUsed, { red: 4, blue: 0, yellow: 0, green: 0 });
  for (const color of TEAM_COLORS) assert.ok(restored.clocks[color] <= before[color]);
  assert.deepEqual(restored.clocks, { red: 299000, blue: 299000, yellow: 299000, green: 299000 });
  localAction(restored, 'game:move', legalMove(restored), 5000);
  assert.throws(() => localAction(restored, 'game:undo', { color: 'red', plies: 1 }, 5000), /allowance/);
});

test('a legal team mating move reaches the full shared result and freezes clocks without elimination', () => {
  const session = createLocalSession({ ...TEAM_SETTINGS, timeControl: 'blitz' }, {}, 0);
  session.game = new PartyChess(session.settings, { pieces: [
    { square: 'c6', color: 'red', type: 'k' }, { square: 'c7', color: 'red', type: 'q' },
    { square: 'a7', color: 'blue', type: 'k' }, { square: 'g14', color: 'yellow', type: 'k' },
    { square: 'n8', color: 'green', type: 'k' },
  ] });
  assert.equal(session.game.outcome(), null);
  const result = localAction(session, 'game:move', { color: 'red', from: 'c7', to: 'b7' }, 1000);
  assert.equal(result.status, 'finished');
  assert.deepEqual(result.result, teamDefeat('blue', 'checkmate'));
  assert.deepEqual(result.activeColors, TEAM_COLORS);
  assert.deepEqual(result.eliminations, []);
  assert.deepEqual(result.legalMoves, []);
  assert.deepEqual(localClocks(session, 900000), { red: 302000, blue: 300000, yellow: 300000, green: 300000 });
  assert.equal(session.turnStartedAt, null);
});

test('a team resignation awards both opponents, ends all clocks and survives same-device restoration', () => {
  for (const defeated of TEAM_COLORS) {
    const session = createLocalSession({ ...TEAM_SETTINGS, undoMode: 'free', timeControl: 'blitz' }, {}, 0);
    localAction(session, 'game:move', legalMove(session), 1000);
    localAction(session, 'game:resign', { color: defeated }, 2000);
    assert.equal(session.status, 'finished');
    assert.deepEqual(session.result, teamDefeat(defeated, 'resignation'));
    assert.deepEqual(session.game.activeColors(), TEAM_COLORS);
    assert.equal(session.turnStartedAt, null);
    assert.deepEqual(localClocks(session, 500000), session.clocks);
    assert.throws(() => localAction(session, 'game:undo', { color: 'red', plies: 1 }, 3000), /active game/);
    const restored = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(session))), 500000);
    assert.deepEqual(restored.result, session.result);
    assert.deepEqual(localSnapshot(restored, 500000).legalMoves, []);
    assert.equal(checkLocalTimeout(restored, 500000), false);
  }
});

test('team pending takeback timeout loses the requester’s whole team without charging their partner', () => {
  const session = createLocalSession({ ...TEAM_SETTINGS, undoMode: 'approval', timeControl: 'bullet' }, {}, 0);
  localAction(session, 'game:move', legalMove(session), 1000);
  localAction(session, 'game:undo', { color: 'red', plies: 1 }, 2000);
  localAction(session, 'game:respond-undo', { color: 'yellow', accept: true }, 2000);
  const restored = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(session))), 184000);
  assert.equal(restored.status, 'finished');
  assert.deepEqual(restored.result, teamDefeat('red', 'timeout'));
  assert.deepEqual(restored.clocks, { red: 0, blue: 179000, yellow: 180000, green: 180000 });
  assert.equal(restored.undoRequest, null);
  assert.deepEqual(restored.undoUsed, { red: 0, blue: 0, yellow: 0, green: 0 });
  assert.equal(restored.game.history().length, 1);
  assert.equal(restored.turnStartedAt, null);
  const finished = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(restored))), 500000);
  assert.deepEqual(finished.result, restored.result);
  assert.deepEqual(finished.clocks, restored.clocks);
});

test('team session restoration rejects changed team rules or winners and legacy saves remain free-for-all', () => {
  const session = createLocalSession(TEAM_SETTINGS, {}, 0);
  localAction(session, 'game:resign', { color: 'blue' }, 0);
  const saved = JSON.parse(JSON.stringify(serializeLocalSession(session)));
  const wrongWinners = structuredClone(saved);
  wrongWinners.result = teamDefeat('red', 'resignation');
  assert.throws(() => restoreLocalSession(wrongWinners, 0), /team result/);
  const wrongStatus = structuredClone(saved);
  wrongStatus.status = 'playing'; wrongStatus.turnStartedAt = 0;
  assert.throws(() => restoreLocalSession(wrongStatus, 0), /team result/);
  const wrongRules = structuredClone(saved);
  wrongRules.settings.partyVariant = 'ffa';
  assert.throws(() => restoreLocalSession(wrongRules, 0), /saved|variant/i);
  const old = createLocalSession({ mode: 'party', playerCount: 4 }, {}, 0);
  localAction(old, 'game:resign', { color: 'blue' }, 0);
  const legacy = JSON.parse(JSON.stringify(serializeLocalSession(old)));
  delete legacy.settings.partyVariant;
  delete legacy.partyState.partyVariant;
  const restored = restoreLocalSession(legacy, 0);
  assert.equal(restored.settings.partyVariant, 'ffa');
  assert.equal(restored.status, 'playing');
  assert.deepEqual(restored.game.activeColors(), ['red', 'yellow', 'green']);
  const agreed = createLocalSession(TEAM_SETTINGS, {}, 0);
  localAction(agreed, 'game:offer-draw', { color: 'red' }, 0);
  for (const color of TEAM_COLORS.slice(1)) localAction(agreed, 'game:respond-draw', { color, accept: true }, 0);
  const draw = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(agreed))), 900000);
  assert.equal(draw.status, 'finished');
  assert.deepEqual(draw.result, { winner: null, reason: 'agreement' });
});

test('four remote teammates auto-start, control only their own army and synchronize local-equivalent moves', async (t) => {
  const f = await fixture(t, { now: () => 0 });
  let { clients, room, players } = await table(f, 4, { partyVariant: 'teams' });
  const local = createLocalSession(TEAM_SETTINGS, {}, 0);
  assert.equal(room.status, 'playing');
  assert.equal(room.settings.partyVariant, 'teams');
  const first = room.legalMoves[0];
  assert.equal((await request(clients[2], 'game:move', { code: room.code, expectedVersion: room.version,
    expectedPly: 0, ...first, color: 'red' })).ok, false);
  // Red cannot move Yellow's pieces even while it is Red's own turn.
  assert.equal((await request(clients[0], 'game:move', { code: room.code, expectedVersion: room.version,
    expectedPly: 0, from: 'g13', to: 'g12', color: 'yellow' })).ok, false);
  assert.equal((await request(clients[0], 'room:settings', { code: room.code, expectedVersion: room.version,
    settings: { ...room.settings, partyVariant: 'ffa' } })).ok, false);
  for (const [index, color] of TEAM_COLORS.entries()) {
    const move = room.legalMoves[0];
    room = await action(clients[index], 'game:move', room, move);
    localAction(local, 'game:move', { ...move, color }, 0);
    assert.equal(room.fen, local.game.fen());
    for (const client of clients) {
      const synchronized = (await requestOk(client, 'room:sync', { code: room.code })).room;
      assert.equal(synchronized.fen, room.fen);
      assert.deepEqual(synchronized.history, room.history);
      assert.equal(synchronized.settings.partyVariant, 'teams');
    }
  }
  const replacement = await f.client();
  assert.equal((await request(replacement, 'room:resume', { code: room.code, token: '0'.repeat(64) })).ok, false);
  const resumed = await requestOk(replacement, 'room:resume', { code: room.code, token: players[2].token });
  assert.equal(resumed.player.color, 'yellow');
  assert.equal(resumed.room.fen, room.fen);
  assert.equal((await request(clients[2], 'room:sync', { code: room.code })).ok, false);
});

test('team waiting rooms reject three-player teams, retain automatic start and lock agreed team rules', async (t) => {
  const f = await fixture(t, { now: () => 0 });
  const invalid = await f.client();
  assert.equal((await request(invalid, 'room:create', { name: 'Invalid', color: 'red',
    settings: { mode: 'party', playerCount: 3, partyVariant: 'teams' } })).ok, false);
  let { clients, room } = await table(f, 4, {}, 3);
  room = await action(clients[0], 'room:settings', room, { settings: { ...room.settings, partyVariant: 'teams' } });
  assert.equal(room.status, 'waiting');
  assert.ok(Object.values(room.ready).every((ready) => !ready));
  assert.equal((await request(clients[1], 'room:settings', { code: room.code, expectedVersion: room.version,
    settings: { ...room.settings, playerCount: 3 } })).ok, false);
  const fourth = await f.client();
  room = (await requestOk(fourth, 'room:join', { code: room.code, name: 'Green friend' })).room;
  assert.equal(room.status, 'playing');
  assert.equal(room.settings.partyVariant, 'teams');
  const version = room.version;
  room = await action(clients[1], 'game:ready', room, { ready: false });
  assert.equal(room.status, 'playing');
  assert.equal(room.version, version);
});

test('teams still require all four seats for takebacks, draws and rematches', async (t) => {
  let timestamp = 0;
  const f = await fixture(t, { now: () => timestamp, tickIntervalMs: 100000 });
  let { clients, room } = await table(f, 4, { partyVariant: 'teams', undoMode: 'approval', undoLimit: 1, timeControl: 'blitz' });
  timestamp = 1000;
  room = await action(clients[0], 'game:move', room, room.legalMoves[0]);
  timestamp = 2000;
  room = await action(clients[0], 'game:undo', room, { plies: 1 });
  assert.deepEqual(room.undoRequest.required, ['blue', 'yellow', 'green']);
  const stale = room.version;
  timestamp = 5000;
  room = await action(clients[2], 'game:respond-undo', room, { accept: true });
  assert.equal(room.history.length, 1);
  assert.equal((await request(clients[1], 'game:respond-undo', { code: room.code, expectedVersion: stale, accept: true })).ok, false);
  room = await action(clients[1], 'game:respond-undo', room, { accept: true });
  assert.equal(room.history.length, 1);
  room = await action(clients[3], 'game:respond-undo', room, { accept: true });
  assert.equal(room.history.length, 0);
  assert.deepEqual(room.undoUsed, { red: 1, blue: 0, yellow: 0, green: 0 });
  assert.deepEqual(room.clocks, { red: 299000, blue: 299000, yellow: 300000, green: 300000 });
  room = await action(clients[0], 'game:offer-draw', room);
  for (const index of [2, 1]) room = await action(clients[index], 'game:respond-draw', room, { accept: true });
  assert.equal(room.status, 'playing');
  room = await action(clients[3], 'game:respond-draw', room, { accept: true });
  assert.deepEqual(room.result, { winner: null, reason: 'agreement' });
  for (const index of [0, 2, 1]) room = await action(clients[index], 'game:rematch', room);
  assert.equal(room.status, 'finished');
  room = await action(clients[3], 'game:rematch', room);
  assert.equal(room.status, 'playing');
  assert.equal(room.settings.partyVariant, 'teams');
  assert.equal(room.turn, 'red');
  assert.equal(room.result, null);
  assert.ok(Object.values(room.undoUsed).every((value) => value === 0));
  assert.deepEqual(room.clocks, { red: 300000, blue: 300000, yellow: 300000, green: 300000 });
});

test('remote team outcomes and pending consent survive server persistence without exposing seat credentials', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'queenie-team-session-test-'));
  const dataFile = join(directory, 'rooms.json');
  let timestamp = 0;
  let restored;
  let finished;
  const f = await fixture(t, { dataFile, now: () => timestamp, tickIntervalMs: 100000 });
  t.after(async () => { await f.close(); await restored?.close(); await finished?.close(); await rm(directory, { recursive: true, force: true }); });
  let { clients, room, players } = await table(f, 4, { partyVariant: 'teams', undoMode: 'approval', timeControl: 'blitz' });
  timestamp = 1000;
  room = await action(clients[0], 'game:move', room, room.legalMoves[0]);
  timestamp = 2000;
  room = await action(clients[0], 'game:undo', room, { plies: 1 });
  room = await action(clients[2], 'game:respond-undo', room, { accept: true });
  await f.close();
  const stored = await readFile(dataFile, 'utf8');
  for (const player of players) assert.equal(stored.includes(player.token), false);
  timestamp = 3000;
  restored = await fixture(t, { dataFile, now: () => timestamp, tickIntervalMs: 100000 });
  const resumed = [];
  for (const player of players) {
    const client = await restored.client(); resumed.push(client);
    room = (await requestOk(client, 'room:resume', { code: room.code, token: player.token })).room;
  }
  assert.equal(room.settings.partyVariant, 'teams');
  assert.deepEqual(room.undoRequest.approvals, ['red', 'yellow']);
  assert.deepEqual(room.undoRequest.required, ['blue', 'yellow', 'green']);
  room = await action(resumed[1], 'game:respond-undo', room, { accept: true });
  room = await action(resumed[3], 'game:respond-undo', room, { accept: true });
  assert.deepEqual(room.clocks, { red: 299000, blue: 299000, yellow: 300000, green: 300000 });
  timestamp = 4000;
  room = await action(resumed[3], 'game:resign', room);
  assert.equal(room.status, 'finished');
  assert.deepEqual(room.result, teamDefeat('green', 'resignation'));
  for (const client of resumed) assert.deepEqual((await requestOk(client, 'room:sync', { code: room.code })).room.result, room.result);
  await restored.close();
  timestamp = 900000;
  finished = await fixture(t, { dataFile, now: () => timestamp });
  const returned = await finished.client();
  const final = (await requestOk(returned, 'room:resume', { code: room.code, token: players[2].token })).room;
  assert.equal(final.status, 'finished');
  assert.deepEqual(final.result, room.result);
  assert.deepEqual(final.clocks, room.clocks);
  assert.deepEqual(final.legalMoves, []);
});

test('a remote team timeout awards the opposing pair immediately and stops every clock', async (t) => {
  let timestamp = 0;
  const f = await fixture(t, { now: () => timestamp, tickIntervalMs: 100000 });
  let { clients, room } = await table(f, 4, { partyVariant: 'teams', timeControl: 'bullet' });
  timestamp = 180001;
  room = (await requestOk(clients[3], 'room:sync', { code: room.code })).room;
  assert.equal(room.status, 'finished');
  assert.deepEqual(room.result, teamDefeat('red', 'timeout'));
  assert.deepEqual(room.clocks, { red: 0, blue: 180000, yellow: 180000, green: 180000 });
  assert.deepEqual(room.activeColors, TEAM_COLORS);
  timestamp = 500000;
  assert.deepEqual((await requestOk(clients[2], 'room:sync', { code: room.code })).room.clocks, room.clocks);
  assert.equal((await request(clients[1], 'game:move', { code: room.code, expectedVersion: room.version,
    expectedPly: room.history.length, from: 'b8', to: 'c8' })).ok, false);
});
