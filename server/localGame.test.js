import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalSession, applyLocalAction, localClocks, checkLocalTimeout, serializeLocalSession, restoreLocalSession, localSnapshot } from '../shared/localGame.js';

function action(session, event, payload, now) {
  return applyLocalAction(session, event, { expectedVersion: session.version, expectedPly: session.game.history().length, ...payload }, now);
}

test('one shared local confirmation starts every seat with names and clocks for two, three and four players', () => {
  const names = { w: '  Queenie  ', b: '陈', red: 'Queenie', blue: 'Alex', yellow: 'Sam', green: 'Riley' };
  for (const mode of [{ mode: 'classic' }, { mode: 'party', playerCount: 3 }, { mode: 'party', playerCount: 4 }]) {
    const session = createLocalSession({ ...mode, timeControl: 'rapid' }, names, 1000);
    const first = localSnapshot(session, 1000);
    assert.equal(first.status, 'playing');
    assert.deepEqual(first.ready, Object.fromEntries(first.colors.map(color => [color, true])));
    for (const color of first.colors) {
      assert.equal(first.players[color].name, names[color].trim());
      assert.equal(first.clocks[color], 600000);
    }
    const running = localClocks(session, 1500);
    assert.equal(running[first.turn], 599500);
    assert.ok(first.legalMoves.length > 0);

    const rematchNames = Object.fromEntries(first.colors.map(color => [color, first.players[color].name]));
    const rematch = localSnapshot(createLocalSession(first.settings, rematchNames, 2000), 2000);
    assert.deepEqual(rematch.players, first.players);
    assert.equal(rematch.history.length, 0);
    assert.deepEqual(rematch.ready, first.ready);
  }
});

test('shared local start still rejects invalid settings and unplayable positions', () => {
  assert.throws(() => createLocalSession({ undoLimit: 0 }), /allowance/i);
  assert.throws(() => createLocalSession({ mode: 'party', playerCount: 2 }), /three|four|3|4/i);
  assert.throws(() => createLocalSession({ mode: 'endgame', endgameId: 'custom', customFen: '8/8/8/8/8/8/8/K7 w - - 0 1' }), /king/i);
  assert.throws(() => createLocalSession({ mode: 'endgame', endgameId: 'custom', customFen: '7k/5K2/6Q1/8/8/8/8/8 b - - 0 1' }), /already ended/i);
});

test('local approval time charges the requester, rejection resumes the active clock, and accepted undo never refunds time', () => {
  const session = createLocalSession({ timeControl: 'blitz', undoMode: 'approval' }, {}, 0);
  action(session, 'game:move', { from: 'e2', to: 'e4' }, 5000);
  assert.equal(session.clocks.w, 298000);
  action(session, 'game:undo', { color: 'w', plies: 1 }, 7000);
  assert.deepEqual(localClocks(session, 11000), { w: 294000, b: 298000 });
  action(session, 'game:respond-undo', { color: 'b', accept: false }, 11000);
  assert.deepEqual(localClocks(session, 12000), { w: 294000, b: 297000 });
  assert.equal(session.undoUsed.w, 0);
  action(session, 'game:undo', { color: 'w', plies: 1 }, 12000);
  action(session, 'game:respond-undo', { color: 'b', accept: true }, 14000);
  assert.deepEqual(session.clocks, { w: 292000, b: 297000 });
  assert.equal(session.game.history().length, 0);
  assert.equal(session.undoUsed.w, 1);
  assert.equal(session.game.turn(), 'w');
});

test('free local takebacks remove earned increments and cannot farm time through repeated replay', () => {
  const session = createLocalSession({ timeControl: 'blitz', undoMode: 'free', undoLimit: null }, {}, 0);
  for (let repeat = 0; repeat < 4; repeat++) {
    action(session, 'game:move', { from: 'e2', to: 'e4' }, 1000);
    assert.equal(session.clocks.w, 302000);
    action(session, 'game:undo', { color: 'w', plies: 1 }, 1000);
    assert.equal(session.clocks.w, 299000);
  }
  assert.equal(session.undoUsed.w, 4);
  assert.equal(session.clockHistory.length, 0);
});

test('local persistence reconstructs the variant, history, pending consent and undo clock history', () => {
  const session = createLocalSession({ mode: 'endgame', endgameId: 'lucena', timeControl: 'blitz', undoMode: 'approval' }, { w: 'Ada', b: 'Linus' }, 0);
  const move = session.game.moves({ verbose: true })[0];
  action(session, 'game:move', { from: move.from, to: move.to, promotion: move.promotion }, 1000);
  action(session, 'game:undo', { color: 'w', plies: 1 }, 2000);
  const saved = JSON.parse(JSON.stringify(serializeLocalSession(session)));
  const restored = restoreLocalSession(saved, 5000);
  assert.equal(restored.game.fen(), session.game.fen());
  assert.deepEqual(restored.clockHistory, session.clockHistory);
  assert.equal(restored.undoRequest.color, 'w');
  assert.equal(restored.players.b.name, 'Linus');
  assert.equal(restored.settings.endgameId, 'lucena');
  assert.deepEqual(localClocks(restored, 5000), { w: 299000, b: 299000 });
  action(restored, 'game:respond-undo', { color: 'b', accept: true }, 5000);
  assert.equal(restored.game.history().length, 0);
  assert.deepEqual(restored.clocks, { w: 299000, b: 299000 });
});

test('local expiry is settled immediately on actions and restoration, including approval requester timeout', () => {
  const session = createLocalSession({ timeControl: 'bullet' }, {}, 0);
  assert.throws(() => action(session, 'game:move', { from: 'e2', to: 'e4' }, 180001));
  assert.deepEqual(session.result, { winner: 'b', reason: 'timeout' });
  assert.equal(session.status, 'finished');
  assert.equal(session.turnStartedAt, null);

  const pending = createLocalSession({ timeControl: 'bullet' }, {}, 0);
  action(pending, 'game:move', { from: 'e2', to: 'e4' }, 1000);
  action(pending, 'game:undo', { color: 'w', plies: 1 }, 1000);
  const restored = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(pending))), 200000);
  assert.equal(restored.status, 'finished');
  assert.deepEqual(restored.result, { winner: 'b', reason: 'timeout' });
  assert.equal(restored.undoRequest, null);
  assert.equal(checkLocalTimeout(restored, 200000), false);
});

test('local stale board actions, self approval, and over-budget undo are rejected', () => {
  const session = createLocalSession({ undoMode: 'approval', undoLimit: 1 }, {}, 0);
  action(session, 'game:move', { from: 'e2', to: 'e4' }, 0);
  const version = session.version;
  action(session, 'game:undo', { color: 'w', plies: 1 }, 0);
  assert.throws(() => action(session, 'game:respond-undo', { color: 'w', accept: true }, 0));
  assert.throws(() => action(session, 'game:move', { from: 'e7', to: 'e5' }, 0));
  action(session, 'game:respond-undo', { color: 'b', accept: true }, 0);
  action(session, 'game:move', { from: 'e2', to: 'e4' }, 0);
  assert.throws(() => applyLocalAction(session, 'game:move', { expectedVersion: version, expectedPly: 1, from: 'e7', to: 'e5' }, 0));
  assert.throws(() => action(session, 'game:undo', { color: 'w', plies: 1 }, 0));
  assert.equal(localSnapshot(session, 0).history.length, 1);
});

test('local four-file games preserve shape, history and consent across reload; older saves remain eight-file games', () => {
  const pieces = { p: 1, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const session = createLocalSession({ mode: 'half', halfShape: '4x8', halfCounts: { w: pieces, b: pieces }, undoMode: 'approval', undoLimit: 2 }, {}, 0);
  const initial = session.game.fen();
  action(session, 'game:move', { from: 'b3', to: 'b4' }, 1000);
  action(session, 'game:move', { from: 'c6', to: 'c5' }, 2000);
  action(session, 'game:undo', { color: 'w', plies: 2 }, 3000);
  const saved = JSON.parse(JSON.stringify(serializeLocalSession(session)));
  const restored = restoreLocalSession(saved, 4000);
  assert.equal(restored.settings.halfShape, '4x8');
  assert.equal(restored.game.fen(), session.game.fen());
  assert.deepEqual(restored.game.history({ verbose: true }), session.game.history({ verbose: true }));
  assert.equal(localSnapshot(restored, 4000).board.length, 8);
  assert.ok(localSnapshot(restored, 4000).board.every(row => row.length === 4));
  assert.equal(restored.undoRequest.plies, 2);
  action(restored, 'game:respond-undo', { color: 'b', accept: true }, 4000);
  assert.equal(restored.game.fen(), initial);
  assert.equal(restored.undoUsed.w, 2);

  const old = createLocalSession({ mode: 'half' }, {}, 0);
  const oldSaved = JSON.parse(JSON.stringify(serializeLocalSession(old)));
  delete oldSaved.settings.halfShape;
  delete oldSaved.settings.halfPlacement;
  delete oldSaved.settings.halfPosition;
  delete oldSaved.settings.halfWin;
  const oldRestored = restoreLocalSession(oldSaved, 1000);
  assert.equal(oldRestored.settings.halfShape, '8x4');
  assert.equal(oldRestored.settings.halfPlacement, 'territory');
  assert.equal(oldRestored.settings.halfPosition, null);
  assert.equal(oldRestored.game.fen(), old.game.fen());
  assert.equal(oldRestored.game.board().length, 4);
  assert.ok(oldRestored.game.board().every(row => row.length === 8));
});

test('local full-board arena reload and takeback preserve the agreed custom arrangement', () => {
  const settings = {
    mode: 'half', halfShape: '8x8', halfPlacement: 'anywhere', undoMode: 'free', undoLimit: 2,
    halfCounts: { w: { r: 1 }, b: { n: 1 } },
    halfPosition: [{ square: 'c6', color: 'w', type: 'r' }, { square: 'f3', color: 'b', type: 'n' }],
  };
  const session = createLocalSession(settings, {}, 0);
  const initial = session.game.fen();
  action(session, 'game:move', { from: 'c6', to: 'c5' }, 1000);
  action(session, 'game:move', { from: 'f3', to: 'h4' }, 2000);
  const saved = JSON.parse(JSON.stringify(serializeLocalSession(session)));
  const restored = restoreLocalSession(saved, 3000);
  assert.equal(restored.settings.halfShape, '8x8');
  assert.equal(restored.settings.halfPlacement, 'anywhere');
  assert.deepEqual(restored.settings.halfPosition, settings.halfPosition);
  assert.equal(restored.game.fen(), session.game.fen());
  assert.deepEqual(restored.game.history({ verbose: true }), session.game.history({ verbose: true }));
  action(restored, 'game:undo', { color: 'w', plies: 2 }, 4000);
  assert.equal(restored.game.fen(), initial);
  assert.equal(restored.game.get('c6').type, 'r');
  assert.equal(restored.game.get('f3').type, 'n');
  assert.equal(restored.undoUsed.w, 2);
});

test('local arena king-capture results and continued capture-all games survive save and restore', () => {
  for (const halfWin of ['capture-all', 'capture-king']) {
    const settings = {
      mode: 'half', halfShape: '8x8', halfPlacement: 'anywhere', halfWin,
      halfCounts: { w: { q: 1, k: 1 }, b: { r: 1, k: 1 } },
      halfPosition: [{ square: 'a1', color: 'w', type: 'k' }, { square: 'b2', color: 'w', type: 'q' }, { square: 'b3', color: 'b', type: 'k' }, { square: 'd4', color: 'b', type: 'r' }],
    };
    const session = createLocalSession(settings, {}, 0);
    action(session, 'game:move', { from: 'b2', to: 'b3' }, 1000);
    const restored = restoreLocalSession(JSON.parse(JSON.stringify(serializeLocalSession(session))), 2000);
    assert.equal(restored.settings.halfWin, halfWin);
    assert.equal(restored.game.get('d4').type, 'r');
    if (halfWin === 'capture-king') {
      assert.equal(restored.status, 'finished');
      assert.equal(restored.game.isGameOver(), true);
      assert.deepEqual(restored.result, { winner: 'w', reason: 'capture-king' });
      assert.throws(() => action(restored, 'game:move', { from: 'd4', to: 'd3' }, 3000), /ended/);
    } else {
      assert.equal(restored.status, 'playing');
      assert.equal(restored.result, null);
      action(restored, 'game:move', { from: 'd4', to: 'd3' }, 3000);
      action(restored, 'game:move', { from: 'b3', to: 'd3' }, 4000);
      assert.deepEqual(restored.result, { winner: 'w', reason: 'capture-all' });
    }
  }
  assert.throws(() => createLocalSession({ mode: 'half', halfWin: 'capture-king' }), /one king for each player/);
});
