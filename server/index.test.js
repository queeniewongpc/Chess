import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { io } from 'socket.io-client';
import { createGameServer } from './index.js';

const quietLogger = { info() {}, warn() {}, error() {} };

async function fixture(t, options = {}) {
  const server = await createGameServer({ dataFile: null, logger: quietLogger, ...options });
  const address = await server.listen(0, '127.0.0.1');
  const clients = [];
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    clients.forEach((client) => client.disconnect());
    await server.close();
  };
  t.after(close);
  return {
    server,
    close,
    async client() {
      const client = io(`http://127.0.0.1:${address.port}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        timeout: 3000,
      });
      clients.push(client);
      await new Promise((resolve, reject) => {
        client.once('connect', resolve);
        client.once('connect_error', reject);
      });
      return client;
    },
  };
}

function request(client, event, payload) {
  return client.timeout(3000).emitWithAck(event, payload);
}

function nextState(client, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('room:state', listener);
      reject(new Error('Timed out waiting for the room update'));
    }, 3000);
    const listener = (room) => {
      if (!predicate(room)) return;
      clearTimeout(timer);
      client.off('room:state', listener);
      resolve(room);
    };
    client.on('room:state', listener);
  });
}

async function players(f, timeControl = 'unlimited') {
  const white = await f.client();
  const created = await request(white, 'room:create', { name: 'Ada', color: 'w', timeControl });
  assert.equal(created.ok, true);
  assert.equal(created.player.color, 'w');
  assert.equal(created.room.status, 'waiting');
  const black = await f.client();
  const joined = await request(black, 'room:join', { code: created.room.code, name: 'Linus' });
  assert.equal(joined.ok, true);
  assert.equal(joined.player.color, 'b');
  assert.equal(joined.room.status, 'playing');
  return { white, black, code: created.room.code, created, joined };
}

async function move(client, code, from, to, expectedPly, promotion) {
  const result = await request(client, 'game:move', { code, from, to, expectedPly, promotion });
  assert.equal(result.ok, true, result.error);
  return result.room;
}

test('two remote clients share the same board and cannot overwrite it with stale moves', async (t) => {
  const f = await fixture(t);
  const { white, black, code } = await players(f);
  const update = nextState(black, (room) => room.history.length === 1);
  const moved = await move(white, code, 'e2', 'e4', 0);
  const received = await update;
  assert.equal(received.fen, moved.fen);
  assert.equal(received.history[0].san, 'e4');
  assert.equal(received.turn, 'b');
  assert.equal(received.players.w.name, 'Ada');
  assert.equal(received.players.b.name, 'Linus');
  assert.equal(JSON.stringify(received).includes('token'), false);

  const stale = await request(black, 'game:move', { code, from: 'e7', to: 'e5', expectedPly: 0 });
  assert.equal(stale.ok, false);
  const replied = await move(black, code, 'e7', 'e5', 1);
  assert.equal(replied.history.length, 2);
  const synced = await request(white, 'room:sync', { code });
  assert.equal(synced.ok, true);
  assert.equal(synced.room.fen, replied.fen);
});

test('the server rejects illegal moves, out-of-turn moves, and unseated clients', async (t) => {
  const f = await fixture(t);
  const { white, black, code, created } = await players(f);
  const stranger = await f.client();
  const thirdSeat = await request(stranger, 'room:join', { code, name: 'Eve' });
  assert.equal(thirdSeat.ok, false);
  const outsiderSync = await request(stranger, 'room:sync', { code });
  assert.equal(outsiderSync.ok, false);
  const illegal = await request(white, 'game:move', { code, from: 'e2', to: 'e5', expectedPly: 0 });
  assert.equal(illegal.ok, false);
  const wrongTurn = await request(black, 'game:move', { code, from: 'e7', to: 'e5', expectedPly: 0 });
  assert.equal(wrongTurn.ok, false);
  const spoofed = await request(stranger, 'game:move', {
    code, from: 'e2', to: 'e4', expectedPly: 0, color: 'w', token: created.player.token,
  });
  assert.equal(spoofed.ok, false);
  const synced = await request(white, 'room:sync', { code });
  assert.equal(synced.room.history.length, 0);
  assert.equal(synced.room.turn, 'w');
});

test('checkmate ends the game and a rematch requires both players', async (t) => {
  const f = await fixture(t);
  const { white, black, code } = await players(f);
  await move(white, code, 'f2', 'f3', 0);
  await move(black, code, 'e7', 'e5', 1);
  await move(white, code, 'g2', 'g4', 2);
  const mate = await move(black, code, 'd8', 'h4', 3);
  assert.equal(mate.status, 'finished');
  assert.equal(mate.result.winner, 'b');
  assert.match(mate.result.reason, /checkmate/i);
  const afterGame = await request(white, 'game:move', { code, from: 'a2', to: 'a3', expectedPly: 4 });
  assert.equal(afterGame.ok, false);
  const firstVote = await request(white, 'game:rematch', { code });
  assert.equal(firstVote.ok, true);
  assert.equal(firstVote.room.status, 'finished');
  assert.equal(firstVote.room.rematchVotes.length, 1);
  const bothVotes = await request(black, 'game:rematch', { code });
  assert.equal(bothVotes.ok, true);
  assert.equal(bothVotes.room.status, 'playing');
  assert.equal(bothVotes.room.history.length, 0);
  assert.equal(bothVotes.room.result, null);
  assert.equal(bothVotes.room.turn, 'w');
});

test('special moves preserve castling, en passant, and the selected promotion piece', async (t) => {
  const f = await fixture(t);
  const castling = await players(f);
  const opening = [
    ['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'],
    ['f1', 'c4'], ['g8', 'f6'], ['e1', 'g1'],
  ];
  let castled;
  for (const [ply, [from, to]] of opening.entries()) {
    castled = await move(ply % 2 ? castling.black : castling.white, castling.code, from, to, ply);
  }
  assert.equal(castled.history.at(-1).san, 'O-O');
  assert.equal(castled.fen.split(' ')[0].split('/').at(-1), 'RNBQ1RK1');

  const enPassant = await players(f);
  const pawnMoves = [['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5'], ['e5', 'd6']];
  let captured;
  for (const [ply, [from, to]] of pawnMoves.entries()) {
    captured = await move(ply % 2 ? enPassant.black : enPassant.white, enPassant.code, from, to, ply);
  }
  assert.equal(captured.history.at(-1).captured, 'p');
  assert.equal(captured.fen.split(' ')[0].split('/')[3], '8');

  const promotion = await players(f);
  const promotionMoves = [
    ['a2', 'a4'], ['h7', 'h5'], ['a4', 'a5'], ['h5', 'h4'],
    ['a5', 'a6'], ['h4', 'h3'], ['a6', 'b7'], ['h3', 'g2'],
  ];
  for (const [ply, [from, to]] of promotionMoves.entries()) {
    await move(ply % 2 ? promotion.black : promotion.white, promotion.code, from, to, ply);
  }
  const missingPiece = await request(promotion.white, 'game:move', {
    code: promotion.code, from: 'b7', to: 'a8', expectedPly: 8,
  });
  assert.equal(missingPiece.ok, false);
  const promoted = await move(promotion.white, promotion.code, 'b7', 'a8', 8, 'n');
  assert.equal(promoted.history.at(-1).promotion, 'n');
  assert.equal(promoted.fen[0], 'N');
});

test('a disconnected player can resume their reserved seat with their private token', async (t) => {
  const f = await fixture(t);
  const { white, black, code, created } = await players(f);
  await move(white, code, 'e2', 'e4', 0);
  const disconnected = nextState(black, (room) => room.players.w.connected === false);
  white.disconnect();
  await disconnected;
  const returned = await f.client();
  const rejected = await request(returned, 'room:resume', { code, token: 'wrong-token' });
  assert.equal(rejected.ok, false);
  const resumed = await request(returned, 'room:resume', { code, token: created.player.token });
  assert.equal(resumed.ok, true);
  assert.equal(resumed.player.color, 'w');
  assert.equal(resumed.room.players.w.name, 'Ada');
  assert.equal(resumed.room.players.w.connected, true);
  assert.equal(resumed.room.history.length, 1);
  await move(black, code, 'e7', 'e5', 1);
  const continued = await move(returned, code, 'g1', 'f3', 2);
  assert.equal(continued.history.length, 3);
});

test('persisted games survive a server restart and both seats can reconnect', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'chess-room-test-'));
  const instances = [];
  t.after(async () => {
    for (const instance of instances) await instance.close();
    await rm(directory, { recursive: true, force: true });
  });
  const dataFile = join(directory, 'rooms.json');
  const first = await fixture(t, { dataFile });
  instances.push(first);
  const { white, black, code, created, joined } = await players(first);
  await move(white, code, 'd2', 'd4', 0);
  const previous = await move(black, code, 'd7', 'd5', 1);
  await first.close();

  const restarted = await fixture(t, { dataFile });
  instances.push(restarted);
  const whiteAgain = await restarted.client();
  const blackAgain = await restarted.client();
  const whiteResume = await request(whiteAgain, 'room:resume', { code, token: created.player.token });
  const blackResume = await request(blackAgain, 'room:resume', { code, token: joined.player.token });
  assert.equal(whiteResume.ok, true);
  assert.equal(blackResume.ok, true);
  assert.equal(blackResume.room.fen, previous.fen);
  assert.equal(blackResume.room.history.length, 2);
  assert.equal(blackResume.room.players.w.connected, true);
  assert.equal(blackResume.room.players.b.connected, true);
  const continued = await move(whiteAgain, code, 'c2', 'c4', 2);
  assert.equal(continued.history[2].san, 'c4');
});

test('the server owns clock accounting, applies increments, and settles timeouts', async (t) => {
  let currentTime = 1_000_000;
  const f = await fixture(t, { now: () => currentTime, tickIntervalMs: 60_000 });
  const { white, black, code } = await players(f, 'blitz');
  currentTime += 5000;
  const moved = await move(white, code, 'e2', 'e4', 0);
  assert.equal(moved.clocks.w, 298_000);
  assert.equal(moved.clocks.b, 300_000);
  currentTime += 300_001;
  const timedOut = await request(white, 'room:sync', { code });
  assert.equal(timedOut.ok, true);
  assert.equal(timedOut.room.status, 'finished');
  assert.equal(timedOut.room.result.winner, 'w');
  assert.equal(timedOut.room.clocks.b, 0);
  const lateMove = await request(black, 'game:move', { code, from: 'e7', to: 'e5', expectedPly: 1 });
  assert.equal(lateMove.ok, false);
});

test('a draw needs an opponent response and resignation awards the opponent', async (t) => {
  const f = await fixture(t);
  const { white, black, code } = await players(f);
  const offer = await request(white, 'game:offer-draw', { code });
  assert.equal(offer.ok, true);
  assert.equal(offer.room.drawOffer, 'w');
  const ownAccept = await request(white, 'game:respond-draw', { code, accept: true });
  assert.equal(ownAccept.ok, false);
  const declined = await request(black, 'game:respond-draw', { code, accept: false });
  assert.equal(declined.ok, true);
  assert.equal(declined.room.status, 'playing');
  assert.equal(declined.room.drawOffer, null);
  await request(black, 'game:offer-draw', { code });
  const accepted = await request(white, 'game:respond-draw', { code, accept: true });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.room.status, 'finished');
  assert.equal(accepted.room.result.winner, null);

  await request(white, 'game:rematch', { code });
  await request(black, 'game:rematch', { code });
  const resigned = await request(black, 'game:resign', { code });
  assert.equal(resigned.ok, true);
  assert.equal(resigned.room.status, 'finished');
  assert.equal(resigned.room.result.winner, 'w');
  assert.match(resigned.room.result.reason, /resign/i);
});

test('leaving a room releases the connection but preserves the player seat', async (t) => {
  const f = await fixture(t);
  const { white, black, code, created } = await players(f);
  const leftState = nextState(black, (room) => room.players.w.connected === false);
  const left = await request(white, 'room:leave', { code });
  assert.equal(left.ok, true);
  await leftState;
  const replacement = await f.client();
  const cannotSteal = await request(replacement, 'room:join', { code, name: 'Eve' });
  assert.equal(cannotSteal.ok, false);
  const resumed = await request(white, 'room:resume', { code, token: created.player.token });
  assert.equal(resumed.ok, true);
  assert.equal(resumed.room.players.w.name, 'Ada');
});

async function variantPlayers(f, settings = {}, start = true) {
  const white = await f.client();
  const created = await request(white, 'room:create', { name: 'Ada', color: 'w', settings });
  assert.equal(created.ok, true, created.error);
  const black = await f.client();
  const code = created.room.code;
  const joined = await request(black, 'room:join', { code, name: 'Linus' });
  assert.equal(joined.ok, true, joined.error);
  assert.equal(joined.room.status, 'waiting');
  let room = joined.room;
  if (start) {
    const whiteReady = await request(white, 'game:ready', { code, expectedVersion: room.version });
    assert.equal(whiteReady.ok, true, whiteReady.error);
    const blackReady = await request(black, 'game:ready', { code, expectedVersion: room.version });
    assert.equal(blackReady.ok, true, blackReady.error);
    room = blackReady.room;
  }
  return { white, black, code, created, joined, room };
}

async function variantMove(client, room, from, to, promotion) {
  const result = await request(client, 'game:move', { code: room.code, from, to, promotion, expectedPly: room.history.length, expectedVersion: room.version });
  assert.equal(result.ok, true, result.error);
  return result.room;
}

test('both players confirm rules; changing rules clears confirmations and stale confirmations fail', async (t) => {
  const f = await fixture(t);
  const { white, black, code, room } = await variantPlayers(f, {}, false);
  const early = await request(white, 'game:move', { code, from: 'e2', to: 'e4', expectedPly: 0, expectedVersion: room.version });
  assert.equal(early.ok, false);
  const ready = await request(white, 'game:ready', { code, expectedVersion: room.version });
  assert.equal(ready.room.ready.w, true);
  assert.equal(ready.room.status, 'waiting');
  const changed = await request(black, 'room:settings', { code, expectedVersion: room.version, settings: { undoMode: 'free', undoLimit: 2 } });
  assert.equal(changed.ok, true, changed.error);
  assert.deepEqual(changed.room.ready, { w: false, b: false });
  const stale = await request(white, 'game:ready', { code, expectedVersion: room.version });
  assert.equal(stale.ok, false);
  await request(white, 'game:ready', { code, expectedVersion: changed.room.version });
  const begun = await request(black, 'game:ready', { code, expectedVersion: changed.room.version });
  assert.equal(begun.room.status, 'playing');
  assert.equal(begun.room.settings.undoMode, 'free');
  assert.equal(begun.room.board.length, 8);
  assert.equal(begun.room.legalMoves.length, 20);
  const lateRules = await request(white, 'room:settings', { code, expectedVersion: begun.room.version, settings: {} });
  assert.equal(lateRules.ok, false);
});

test('terminal starting positions are rejected without altering a waiting room or its confirmations', async (t) => {
  const f = await fixture(t);
  const terminal = { mode: 'endgame', endgameId: 'custom', customFen: '7k/8/8/8/8/8/8/K7 w - - 0 1' };
  const client = await f.client();
  const rejectedCreate = await request(client, 'room:create', { name: 'Ada', color: 'w', settings: terminal });
  assert.equal(rejectedCreate.ok, false);
  assert.match(rejectedCreate.error, /already ended/);

  const { white, black, code, room } = await variantPlayers(f, {}, false);
  const confirmed = await request(white, 'game:ready', { code, expectedVersion: room.version });
  const rejectedChange = await request(black, 'room:settings', { code, expectedVersion: room.version, settings: terminal });
  assert.equal(rejectedChange.ok, false);
  assert.match(rejectedChange.error, /already ended/);
  const unchanged = await request(white, 'room:sync', { code });
  assert.equal(unchanged.room.fen, confirmed.room.fen);
  assert.equal(unchanged.room.version, confirmed.room.version);
  assert.deepEqual(unchanged.room.settings, confirmed.room.settings);
  assert.deepEqual(unchanged.room.ready, { w: true, b: false });
  assert.equal(unchanged.room.status, 'waiting');
});

test('free takebacks apply immediately, consume individual move budgets, and reject stale moves even after replay', async (t) => {
  const f = await fixture(t);
  const pair = await variantPlayers(f, { undoMode: 'free', undoLimit: 2 });
  let room = await variantMove(pair.white, pair.room, 'e2', 'e4');
  const staleVersion = room.version;
  room = await variantMove(pair.black, room, 'e7', 'e5');
  const undone = await request(pair.white, 'game:undo', { code: pair.code, plies: 2, expectedPly: 2, expectedVersion: room.version });
  assert.equal(undone.ok, true, undone.error);
  assert.equal(undone.room.history.length, 0);
  assert.deepEqual(undone.room.undoUsed, { w: 2, b: 0 });
  assert.equal(undone.room.undoRequest, null);
  room = await variantMove(pair.white, undone.room, 'e2', 'e4');
  const staleMove = await request(pair.black, 'game:move', { code: pair.code, from: 'e7', to: 'e5', expectedPly: 1, expectedVersion: staleVersion });
  assert.equal(staleMove.ok, false);
  const overBudget = await request(pair.white, 'game:undo', { code: pair.code, plies: 1, expectedPly: 1, expectedVersion: room.version });
  assert.equal(overBudget.ok, false);
  const otherBudget = await request(pair.black, 'game:undo', { code: pair.code, plies: 1, expectedPly: 1, expectedVersion: room.version });
  assert.equal(otherBudget.ok, true, otherBudget.error);
  assert.deepEqual(otherBudget.room.undoUsed, { w: 2, b: 1 });
});

test('approval takebacks freeze moves, reject self-approval, and consume allowance only when accepted', async (t) => {
  const f = await fixture(t);
  const pair = await variantPlayers(f, { undoMode: 'approval', undoLimit: null });
  const room = await variantMove(pair.white, pair.room, 'e2', 'e4');
  const payload = { code: pair.code, plies: 1, expectedPly: 1, expectedVersion: room.version };
  const asked = await request(pair.white, 'game:undo', payload);
  assert.equal(asked.ok, true, asked.error);
  assert.equal(asked.room.undoRequest.color, 'w');
  const selfAccept = await request(pair.white, 'game:respond-undo', { code: pair.code, accept: true });
  assert.equal(selfAccept.ok, false);
  const frozen = await request(pair.black, 'game:move', { code: pair.code, from: 'e7', to: 'e5', expectedPly: 1, expectedVersion: room.version });
  assert.equal(frozen.ok, false);
  const declined = await request(pair.black, 'game:respond-undo', { code: pair.code, accept: false });
  assert.equal(declined.ok, true);
  assert.equal(declined.room.history.length, 1);
  assert.equal(declined.room.undoUsed.w, 0);
  await request(pair.white, 'game:undo', payload);
  const accepted = await request(pair.black, 'game:respond-undo', { code: pair.code, accept: true });
  assert.equal(accepted.ok, true, accepted.error);
  assert.equal(accepted.room.history.length, 0);
  assert.equal(accepted.room.undoUsed.w, 1);
  assert.equal(accepted.room.turn, 'w');
});

test('undo approval time is charged to the requester and takebacks do not restore spent clock time', async (t) => {
  let currentTime = 1_000_000;
  const f = await fixture(t, { now: () => currentTime, tickIntervalMs: 60_000 });
  const pair = await variantPlayers(f, { timeControl: 'blitz', undoMode: 'approval' });
  currentTime += 5000;
  const room = await variantMove(pair.white, pair.room, 'e2', 'e4');
  assert.equal(room.clocks.w, 298_000);
  currentTime += 2000;
  await request(pair.white, 'game:undo', { code: pair.code, plies: 1, expectedPly: 1, expectedVersion: room.version });
  currentTime += 4000;
  const accepted = await request(pair.black, 'game:respond-undo', { code: pair.code, accept: true });
  assert.equal(accepted.ok, true, accepted.error);
  assert.equal(accepted.room.clocks.w, 294_000);
  assert.equal(accepted.room.clocks.b, 298_000);
  assert.equal(accepted.room.turn, 'w');
});

test('half-board multiplayer captures kings normally, finishes on capture-all, and rematches the chosen roster', async (t) => {
  const f = await fixture(t);
  const pieces = (extra) => ({ p: 0, n: 0, b: 0, r: 0, q: 0, k: 1, ...extra });
  const pair = await variantPlayers(f, { mode: 'half', halfKing: true, halfCounts: { w: pieces({ q: 1 }), b: pieces({ r: 1 }) } });
  assert.equal(pair.room.board.length, 4);
  let room = await variantMove(pair.white, pair.room, 'd1', 'd4');
  room = await variantMove(pair.black, room, 'e4', 'e3');
  room = await variantMove(pair.white, room, 'd4', 'e3');
  assert.equal(room.history.at(-1).captured, 'k');
  assert.equal(room.status, 'playing');
  room = await variantMove(pair.black, room, 'a4', 'a3');
  room = await variantMove(pair.white, room, 'e3', 'a3');
  assert.equal(room.status, 'finished');
  assert.deepEqual(room.result, { winner: 'w', reason: 'capture-all' });
  await request(pair.white, 'game:rematch', { code: pair.code });
  const rematch = await request(pair.black, 'game:rematch', { code: pair.code });
  assert.equal(rematch.room.fen, pair.room.fen);
  assert.equal(rematch.room.settings.mode, 'half');
  assert.equal(rematch.room.history.length, 0);
});

test('variant settings, history, undo budgets, and version survive a server restart', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'chess-variant-test-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const dataFile = join(directory, 'rooms.json');
  const first = await fixture(t, { dataFile });
  const pair = await variantPlayers(first, { mode: 'endgame', endgameId: 'lucena', undoMode: 'free', undoLimit: 7 });
  const initialMove = pair.room.legalMoves[0];
  let room = await variantMove(pair.white, pair.room, initialMove.from, initialMove.to, initialMove.promotion);
  const undone = await request(pair.white, 'game:undo', { code: pair.code, plies: 1, expectedPly: 1, expectedVersion: room.version });
  assert.equal(undone.ok, true, undone.error);
  room = await variantMove(pair.white, undone.room, initialMove.from, initialMove.to, initialMove.promotion);
  await first.close();
  const restarted = await fixture(t, { dataFile });
  const client = await restarted.client();
  const restored = await request(client, 'room:resume', { code: pair.code, token: pair.created.player.token });
  assert.equal(restored.ok, true, restored.error);
  assert.equal(restored.room.settings.endgameId, 'lucena');
  assert.equal(restored.room.fen, room.fen);
  assert.equal(restored.room.version, room.version);
  assert.equal(restored.room.undoUsed.w, 1);
});

test('remote half-board shape changes require fresh consent and synchronize four-file play, takebacks and rematches', async (t) => {
  const f = await fixture(t);
  const pieces = { p: 1, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const pair = await variantPlayers(f, { mode: 'half', halfCounts: { w: pieces, b: pieces }, undoMode: 'free', undoLimit: 2 }, false);
  assert.equal(pair.room.settings.halfShape, '8x4');
  const ready = await request(pair.white, 'game:ready', { code: pair.code, expectedVersion: pair.room.version });
  assert.equal(ready.room.ready.w, true);
  const invalid = await request(pair.black, 'room:settings', { code: pair.code, expectedVersion: ready.room.version, settings: { ...ready.room.settings, halfShape: '4x4' } });
  assert.equal(invalid.ok, false);
  const unchanged = await request(pair.white, 'room:sync', { code: pair.code });
  assert.deepEqual(unchanged.room.ready, ready.room.ready);
  assert.equal(unchanged.room.version, ready.room.version);

  const shapeUpdate = nextState(pair.white, room => room.settings.halfShape === '4x8');
  const changed = await request(pair.black, 'room:settings', { code: pair.code, expectedVersion: ready.room.version, settings: { ...ready.room.settings, halfShape: '4x8' } });
  assert.equal(changed.ok, true, changed.error);
  const receivedShape = await shapeUpdate;
  assert.equal(receivedShape.fen, changed.room.fen);
  assert.equal(receivedShape.board.length, 8);
  assert.ok(receivedShape.board.every(row => row.length === 4));
  assert.deepEqual(changed.room.ready, { w: false, b: false });
  const staleReady = await request(pair.white, 'game:ready', { code: pair.code, expectedVersion: ready.room.version });
  assert.equal(staleReady.ok, false);
  await request(pair.white, 'game:ready', { code: pair.code, expectedVersion: changed.room.version });
  const started = await request(pair.black, 'game:ready', { code: pair.code, expectedVersion: changed.room.version });
  assert.equal(started.ok, true, started.error);
  const initial = started.room.fen;

  const blackUpdate = nextState(pair.black, room => room.history.length === 1);
  let room = await variantMove(pair.white, started.room, 'b3', 'b4');
  assert.equal((await blackUpdate).fen, room.fen);
  const whiteUpdate = nextState(pair.white, room => room.history.length === 2);
  room = await variantMove(pair.black, room, 'c6', 'c5');
  assert.equal((await whiteUpdate).fen, room.fen);
  const outside = await request(pair.white, 'game:move', { code: pair.code, expectedVersion: room.version, expectedPly: 2, from: 'b4', to: 'e5' });
  assert.equal(outside.ok, false);
  const undone = await request(pair.white, 'game:undo', { code: pair.code, expectedVersion: room.version, expectedPly: 2, plies: 2 });
  assert.equal(undone.ok, true, undone.error);
  assert.equal(undone.room.fen, initial);
  assert.equal(undone.room.settings.halfShape, '4x8');
  room = await variantMove(pair.white, undone.room, 'b3', 'b4');
  room = await variantMove(pair.black, room, 'c6', 'c5');
  room = await variantMove(pair.white, room, 'b4', 'c5');
  assert.deepEqual(room.result, { winner: 'w', reason: 'capture-all' });
  await request(pair.white, 'game:rematch', { code: pair.code });
  const rematch = await request(pair.black, 'game:rematch', { code: pair.code });
  assert.equal(rematch.ok, true, rematch.error);
  assert.equal(rematch.room.settings.halfShape, '4x8');
  assert.equal(rematch.room.fen, initial);
  assert.deepEqual(rematch.room.undoUsed, { w: 0, b: 0 });
});

test('four-file remote games reconstruct their geometry and undo history after a server restart', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'chess-narrow-test-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const dataFile = join(directory, 'rooms.json');
  const first = await fixture(t, { dataFile });
  const pieces = { p: 1, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const pair = await variantPlayers(first, { mode: 'half', halfShape: '4x8', halfCounts: { w: pieces, b: pieces }, undoMode: 'free', undoLimit: 2 });
  let room = await variantMove(pair.white, pair.room, 'b3', 'b4');
  room = await variantMove(pair.black, room, 'c6', 'c5');
  await first.close();

  const restarted = await fixture(t, { dataFile });
  const client = await restarted.client();
  const restored = await request(client, 'room:resume', { code: pair.code, token: pair.created.player.token });
  assert.equal(restored.ok, true, restored.error);
  assert.equal(restored.room.settings.halfShape, '4x8');
  assert.equal(restored.room.fen, room.fen);
  assert.deepEqual(restored.room.history, room.history);
  assert.equal(restored.room.board.length, 8);
  assert.ok(restored.room.board.every(row => row.length === 4));
  assert.ok(restored.room.legalMoves.some(move => move.from === 'b4' && move.to === 'c5' && move.captured === 'p'));
  const undone = await request(client, 'game:undo', { code: pair.code, expectedVersion: restored.room.version, expectedPly: 2, plies: 2 });
  assert.equal(undone.ok, true, undone.error);
  assert.equal(undone.room.fen, pair.room.fen);
  assert.equal(undone.room.undoUsed.w, 2);
});

test('remote custom arenas validate placement, reset agreement, and retain the agreed board through restart, undo and rematch', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'chess-arena-test-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const dataFile = join(directory, 'rooms.json');
  const first = await fixture(t, { dataFile });
  const pair = await variantPlayers(first, { mode: 'half', halfShape: '8x8', halfCounts: { w: { r: 1 }, b: { r: 1 } }, undoMode: 'free', undoLimit: 2 }, false);
  const ready = await request(pair.white, 'game:ready', { code: pair.code, expectedVersion: pair.room.version });
  assert.equal(ready.room.ready.w, true);
  const halfPosition = [{ square: 'a6', type: 'r', color: 'w' }, { square: 'd3', type: 'r', color: 'b' }];
  const settings = { ...ready.room.settings, halfPlacement: 'anywhere', halfPosition };
  const invalid = await request(pair.black, 'room:settings', {
    code: pair.code, expectedVersion: ready.room.version,
    settings: { ...settings, halfPosition: [halfPosition[0], { ...halfPosition[1], square: 'a6' }] },
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /same square/);
  const unchanged = await request(pair.white, 'room:sync', { code: pair.code });
  assert.equal(unchanged.room.fen, ready.room.fen);
  assert.equal(unchanged.room.version, ready.room.version);
  assert.deepEqual(unchanged.room.ready, { w: true, b: false });

  const updated = nextState(pair.white, room => room.settings.halfPosition !== null);
  const changed = await request(pair.black, 'room:settings', { code: pair.code, expectedVersion: ready.room.version, settings });
  assert.equal(changed.ok, true, changed.error);
  const received = await updated;
  assert.deepEqual(received.settings.halfPosition, halfPosition);
  assert.deepEqual(received.ready, { w: false, b: false });
  assert.equal(received.settings.halfPlacement, 'anywhere');
  assert.equal(received.board.length, 8);
  assert.ok(received.board.every(row => row.length === 8));
  assert.equal(received.board.flat().find(piece => piece?.square === 'a6').color, 'w');
  assert.equal(received.board.flat().find(piece => piece?.square === 'd3').color, 'b');
  const stale = await request(pair.white, 'game:ready', { code: pair.code, expectedVersion: ready.room.version });
  assert.equal(stale.ok, false);
  await request(pair.white, 'game:ready', { code: pair.code, expectedVersion: changed.room.version });
  const started = await request(pair.black, 'game:ready', { code: pair.code, expectedVersion: changed.room.version });
  assert.equal(started.ok, true, started.error);
  const initialFen = started.room.fen;
  let room = await variantMove(pair.white, started.room, 'a6', 'a5');
  room = await variantMove(pair.black, room, 'd3', 'd4');
  const synchronized = await request(pair.white, 'room:sync', { code: pair.code });
  assert.equal(synchronized.room.fen, room.fen);
  await first.close();

  const restarted = await fixture(t, { dataFile });
  const white = await restarted.client();
  const restored = await request(white, 'room:resume', { code: pair.code, token: pair.created.player.token });
  assert.equal(restored.ok, true, restored.error);
  assert.equal(restored.room.fen, room.fen);
  assert.deepEqual(restored.room.settings.halfPosition, halfPosition);
  assert.equal(restored.room.settings.halfPlacement, 'anywhere');
  const black = await restarted.client();
  const blackRestored = await request(black, 'room:resume', { code: pair.code, token: pair.joined.player.token });
  assert.equal(blackRestored.ok, true, blackRestored.error);
  const undone = await request(white, 'game:undo', { code: pair.code, expectedVersion: restored.room.version, expectedPly: 2, plies: 2 });
  assert.equal(undone.ok, true, undone.error);
  assert.equal(undone.room.fen, initialFen);
  assert.equal(undone.room.undoUsed.w, 2);
  room = await variantMove(white, undone.room, 'a6', 'd6');
  room = await variantMove(black, room, 'd3', 'd5');
  room = await variantMove(white, room, 'd6', 'd5');
  assert.deepEqual(room.result, { winner: 'w', reason: 'capture-all' });
  await request(white, 'game:rematch', { code: pair.code });
  const rematch = await request(black, 'game:rematch', { code: pair.code });
  assert.equal(rematch.ok, true, rematch.error);
  assert.equal(rematch.room.fen, initialFen);
  assert.deepEqual(rematch.room.settings.halfPosition, halfPosition);
});

test('online capture-king drafts allow removing and restoring a king, survive restart, and reject readiness without mutating consent', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'chess-king-draft-test-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const dataFile = join(directory, 'rooms.json');
  const first = await fixture(t, { dataFile });
  const settings = {
    mode: 'half', halfShape: '4x8', halfPlacement: 'anywhere', halfWin: 'capture-king',
    halfCounts: { w: { q: 1, k: 1 }, b: { r: 1, k: 1 } },
    halfPosition: [{ square: 'a1', color: 'w', type: 'k' }, { square: 'b2', color: 'w', type: 'q' }, { square: 'b3', color: 'b', type: 'k' }, { square: 'd4', color: 'b', type: 'r' }],
  };
  const pair = await variantPlayers(first, settings, false);
  const confirmed = await request(pair.white, 'game:ready', { code: pair.code, expectedVersion: pair.room.version });
  assert.equal(confirmed.room.ready.w, true);
  const draft = {
    ...confirmed.room.settings, halfCounts: { ...confirmed.room.settings.halfCounts, b: { ...confirmed.room.settings.halfCounts.b, k: 0 } },
    halfPosition: settings.halfPosition.filter(piece => !(piece.color === 'b' && piece.type === 'k')),
  };
  const changed = await request(pair.black, 'room:settings', { code: pair.code, expectedVersion: confirmed.room.version, settings: draft });
  assert.equal(changed.ok, true, changed.error);
  assert.equal(changed.room.status, 'waiting');
  assert.equal(changed.room.settings.halfCounts.w.k, 1);
  assert.equal(changed.room.settings.halfCounts.b.k, 0);
  assert.equal(changed.room.board.flat().filter(piece => piece?.type === 'k').length, 1);
  assert.deepEqual(changed.room.ready, { w: false, b: false });
  for (const client of [pair.white, pair.black]) {
    const refused = await request(client, 'game:ready', { code: pair.code, expectedVersion: changed.room.version });
    assert.equal(refused.ok, false);
    assert.match(refused.error, /one king for each player/);
  }
  const unaltered = await request(pair.white, 'room:sync', { code: pair.code });
  assert.deepEqual(unaltered.room.ready, { w: false, b: false });
  assert.equal(unaltered.room.version, changed.room.version);
  const earlyMove = await request(pair.white, 'game:move', { code: pair.code, expectedVersion: changed.room.version, expectedPly: 0, from: 'b2', to: 'b3' });
  assert.equal(earlyMove.ok, false);
  const other = await first.client();
  const createInvalid = await request(other, 'room:create', { name: 'Eve', color: 'w', settings: draft });
  assert.equal(createInvalid.ok, false);
  assert.match(createInvalid.error, /one king for each player/);
  await first.close();

  const restarted = await fixture(t, { dataFile });
  const white = await restarted.client();
  const restored = await request(white, 'room:resume', { code: pair.code, token: pair.created.player.token });
  assert.equal(restored.ok, true, restored.error);
  assert.equal(restored.room.status, 'waiting');
  assert.equal(restored.room.history.length, 0);
  assert.deepEqual(restored.room.settings, changed.room.settings);
  assert.equal(restored.room.fen, changed.room.fen);
  const black = await restarted.client();
  const resumedBlack = await request(black, 'room:resume', { code: pair.code, token: pair.joined.player.token });
  assert.equal(resumedBlack.ok, true, resumedBlack.error);
  const stillInvalid = await request(white, 'game:ready', { code: pair.code, expectedVersion: restored.room.version });
  assert.equal(stillInvalid.ok, false);
  const completed = await request(black, 'room:settings', { code: pair.code, expectedVersion: restored.room.version, settings });
  assert.equal(completed.ok, true, completed.error);
  assert.deepEqual(completed.room.ready, { w: false, b: false });
  await request(white, 'game:ready', { code: pair.code, expectedVersion: completed.room.version });
  const begun = await request(black, 'game:ready', { code: pair.code, expectedVersion: completed.room.version });
  assert.equal(begun.ok, true, begun.error);
  assert.equal(begun.room.status, 'playing');
  const won = await variantMove(white, begun.room, 'b2', 'b3');
  assert.deepEqual(won.result, { winner: 'w', reason: 'capture-king' });
  assert.equal(won.board.flat().some(piece => piece?.color === 'b' && piece.type === 'r'), true);
});

test('remote king capture immediately finishes the chosen mode and restores the same result after restart', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'chess-king-result-test-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const dataFile = join(directory, 'rooms.json');
  const first = await fixture(t, { dataFile });
  const pair = await variantPlayers(first, {
    mode: 'half', halfShape: '8x8', halfPlacement: 'anywhere', halfWin: 'capture-king',
    halfCounts: { w: { r: 1, k: 1 }, b: { q: 1, k: 1 } },
    halfPosition: [{ square: 'b2', color: 'w', type: 'k' }, { square: 'd1', color: 'w', type: 'r' }, { square: 'a4', color: 'b', type: 'k' }, { square: 'b3', color: 'b', type: 'q' }],
  });
  let room = await variantMove(pair.white, pair.room, 'd1', 'd2');
  const finishUpdate = nextState(pair.white, room => room.status === 'finished');
  room = await variantMove(pair.black, room, 'b3', 'b2');
  assert.deepEqual(room.result, { winner: 'b', reason: 'capture-king' });
  assert.deepEqual((await finishUpdate).result, room.result);
  assert.equal(room.board.flat().some(piece => piece?.color === 'w' && piece.type === 'r'), true);
  const afterGame = await request(pair.white, 'game:move', { code: pair.code, expectedVersion: room.version, expectedPly: 2, from: 'd2', to: 'd3' });
  assert.equal(afterGame.ok, false);
  await first.close();

  const restarted = await fixture(t, { dataFile });
  const white = await restarted.client();
  const restored = await request(white, 'room:resume', { code: pair.code, token: pair.created.player.token });
  assert.equal(restored.ok, true, restored.error);
  assert.equal(restored.room.settings.halfWin, 'capture-king');
  assert.equal(restored.room.status, 'finished');
  assert.equal(restored.room.fen, room.fen);
  assert.deepEqual(restored.room.result, { winner: 'b', reason: 'capture-king' });
  const black = await restarted.client();
  await request(black, 'room:resume', { code: pair.code, token: pair.joined.player.token });
  await request(white, 'game:rematch', { code: pair.code });
  const rematch = await request(black, 'game:rematch', { code: pair.code });
  assert.equal(rematch.ok, true, rematch.error);
  assert.equal(rematch.room.status, 'playing');
  assert.equal(rematch.room.fen, pair.room.fen);
  assert.equal(rematch.room.settings.halfWin, 'capture-king');
  assert.equal(rematch.room.board.flat().filter(piece => piece?.type === 'k').length, 2);
});
