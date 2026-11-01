import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, getGameOutcome, getPlayerColors, normalizeSettings, PartyChess } from '../shared/game.js';
import { getPartyGeometry, partyColors, partyCoordinate, partyDiagonalSteps, partyHomeSquare, partyStep } from '../shared/partyGeometry.js';
import { isPartyTeams, partyTeamColors, partyTeamFor, partyTeamLabel, samePartyTeam } from '../shared/partyTeams.js';

const piece = (square, color, type, extra = {}) => ({ square, color, type, ...extra });
const kings = count => partyColors(count).map(color => piece(partyHomeSquare(count, color, 4), color, 'k'));
const sparse = (count, pieces, extra = {}) => new PartyChess({ playerCount: count }, { pieces, ...extra });
const targets = (game, square) => game.moves({ square, verbose: true }).map(move => move.to);
const teamSettings = { mode: 'party', playerCount: 4, partyVariant: 'teams' };
const teamSparse = (pieces, extra = {}) => new PartyChess(teamSettings, { pieces, ...extra });

for (const count of [3, 4]) {
  test(`${count}-player board has the advertised real geometry, standard armies and clockwise turn order`, () => {
    const game = createGame({ mode: 'party', playerCount: count });
    const geometry = getPartyGeometry(count);
    assert.equal(geometry.cells.length, count === 3 ? 96 : 160);
    assert.equal(new Set(geometry.cells.map(cell => cell.square)).size, geometry.cells.length);
    assert.equal(game.board().flat().filter(Boolean).length, count * 16);
    assert.equal(game.moves().length, 20);
    assert.deepEqual(getPlayerColors({ mode: 'party', playerCount: count }), partyColors(count));
    for (const color of partyColors(count)) {
      const army = game.board().flat().filter(value => value?.color === color);
      assert.equal(army.filter(value => value.type === 'p').length, 8);
      assert.equal(army.filter(value => value.type === 'k').length, 1);
      assert.equal(game.turn(), color);
      const moves = game.moves({ verbose: true });
      assert.ok(moves.length > 0);
      game.move(moves.find(move => move.flags === 'b' && move.from === partyHomeSquare(count, color, 4, 1)));
    }
    assert.equal(game.turn(), 'red');
    assert.equal(game.history().length, count);
    assert.equal(getGameOutcome(game, { mode: 'party' }), null);
    assert.equal(normalizeSettings({ mode: 'party', playerCount: count }).undoMode, 'off');
    assert.equal(normalizeSettings({ mode: 'party', playerCount: count, undoMode: 'approval' }).undoMode, 'approval');
  });

  test(`${count}-player castling moves the original rook and is forbidden through check`, () => {
    const rookSquare = partyHomeSquare(count, 'red', 7);
    const kingSquare = partyHomeSquare(count, 'red', 4);
    const destination = partyHomeSquare(count, 'red', 6);
    const rookDestination = partyHomeSquare(count, 'red', 5);
    const game = sparse(count, [...kings(count), piece(rookSquare, 'red', 'r')]);
    assert.ok(targets(game, kingSquare).includes(destination));
    game.move({ from: kingSquare, to: destination });
    assert.equal(game.get(rookDestination).type, 'r');
    assert.equal(game.get(rookSquare), undefined);
    assert.equal(game.history({ verbose: true })[0].san, 'O-O');
    game.undo();
    assert.ok(targets(game, kingSquare).includes(destination));

    const attacked = count === 4 ? 'i4' : 'rf4';
    const blocked = sparse(count, [...kings(count), piece(rookSquare, 'red', 'r'), piece(attacked, 'blue', 'r')]);
    assert.equal(blocked.isCheck(), false);
    assert.equal(targets(blocked, kingSquare).includes(destination), false);
    const moved = sparse(count, [...kings(count), piece(rookSquare, 'red', 'r', { moved: true })]);
    assert.equal(targets(moved, kingSquare).includes(destination), false);
  });

  test(`${count}-player promotion requires an explicit legal choice and undo restores the pawn`, () => {
    const from = count === 4 ? 'h7' : 'bd2';
    const to = count === 4 ? 'h8' : 'bd1';
    const game = sparse(count, [...kings(count), piece(from, 'red', 'p', { moved: true, forward: -1 })]);
    assert.deepEqual(game.moves({ square: from, verbose: true }).filter(move => move.to === to).map(move => move.promotion), ['q', 'r', 'b', 'n']);
    assert.throws(() => game.move({ from, to }));
    game.move({ from, to, promotion: 'n' });
    assert.equal(game.get(to).type, 'n');
    game.undo();
    assert.equal(game.get(from).type, 'p');
    assert.equal(game.get(to), undefined);
  });

  test(`${count}-player repetition and fifty complete rounds yield a draw`, () => {
    const game = createGame({ mode: 'party', playerCount: count });
    for (let cycle = 0; cycle < 2; cycle++) {
      for (const forward of [true, false]) for (const color of partyColors(count)) {
        const home = partyHomeSquare(count, color, 1, 0);
        const out = partyHomeSquare(count, color, 2, 2);
        game.move({ from: forward ? home : out, to: forward ? out : home });
      }
    }
    assert.deepEqual(game.outcome(), { winner: null, reason: 'threefold-repetition' });
    game.undo();
    assert.equal(game.outcome(), null);

    const quiet = sparse(count, kings(count), { halfmove: 50 * count - 1 });
    quiet.move({ from: partyHomeSquare(count, 'red', 4), to: partyHomeSquare(count, 'red', 3) });
    assert.deepEqual(quiet.outcome(), { winner: null, reason: 'fifty-move-rule' });
  });
}

test('hex seams share the actual rendered edges, are reciprocal, and diagonal steps preserve tile shade', () => {
  const geometry = getPartyGeometry(3);
  const cells = new Map(geometry.cells.map(cell => [cell.square, cell]));
  const samePoint = (a, b) => Math.abs(a[0] - b[0]) < 0.002 && Math.abs(a[1] - b[1]) < 0.002;
  for (const cell of geometry.cells) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = partyStep(3, cell.square, dx, dy);
      if (!next) continue;
      const neighbor = cells.get(next.square);
      assert.equal(cell.points.filter(point => neighbor.points.some(other => samePoint(point, other))).length, 2, `${cell.square} to ${next.square}`);
      assert.equal(partyStep(3, next.square, -dx * next.frame, -dy * next.frame).square, cell.square);
    }
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
      for (const next of partyDiagonalSteps(3, cell.square, dx, dy)) assert.equal(cells.get(next.square).shade, cell.shade, `${cell.square} diagonal ${next.square}`);
    }
  }
  assert.equal(partyCoordinate(4, 'a1'), null);
  assert.equal(partyCoordinate(4, 'n14'), null);
  assert.ok(partyCoordinate(4, 'd1'));
  assert.ok(partyCoordinate(4, 'a4'));
});

test('hex bishops branch across the center and knights follow valid L paths to opposite-shade cells', () => {
  const bishop = sparse(3, [...kings(3), piece('rd4', 'red', 'b')]);
  assert.ok(targets(bishop, 'rd4').includes('bd4'));
  assert.ok(targets(bishop, 'rd4').includes('yd4'));
  const knight = sparse(3, [...kings(3), piece('rd4', 'red', 'n')]);
  const destinations = targets(knight, 'rd4');
  assert.equal(destinations.length, 10);
  const cells = new Map(getPartyGeometry(3).cells.map(cell => [cell.square, cell]));
  for (const destination of destinations) assert.notEqual(cells.get(destination).shade, cells.get('rd4').shade);
  assert.ok(destinations.includes('bd3'));
  assert.ok(destinations.includes('yd3'));
});

test('hex pawns cross a center file, keep their new forward direction, and may capture along either center branch', () => {
  const game = sparse(3, [...kings(3), piece('ra4', 'red', 'p', { moved: true })]);
  game.move({ from: 'ra4', to: 'bh4' });
  assert.equal(game.get('bh4').forward, -1);
  game.move({ from: 'be1', to: 'be2' });
  game.move({ from: 'ye1', to: 'ye2' });
  assert.ok(targets(game, 'bh4').includes('bh3'));
  assert.equal(targets(game, 'bh4').includes('ra4'), false);

  const capture = sparse(3, [...kings(3), piece('rd4', 'red', 'p', { moved: true }), piece('bd4', 'blue', 'p'), piece('yd4', 'yellow', 'p')]);
  assert.ok(targets(capture, 'rd4').includes('bd4'));
  assert.ok(targets(capture, 'rd4').includes('yd4'));
  capture.move({ from: 'rd4', to: 'bd4' });
  assert.equal(capture.get('bd4').forward, -1);
  assert.equal(capture.history({ verbose: true })[0].capturedColor, 'blue');
});

test('Party moves must protect their own king, cannot capture active kings, and ignore inactive attackers', () => {
  const pinned = sparse(4, [...kings(4), piece('h2', 'red', 'r'), piece('h8', 'blue', 'r')]);
  assert.equal(targets(pinned, 'h2').includes('g2'), false);
  assert.throws(() => pinned.move({ from: 'h2', to: 'g2' }));
  const threatened = sparse(4, [...kings(4), piece('a4', 'red', 'r')]);
  assert.equal(targets(threatened, 'a4').includes('a7'), false);
  assert.throws(() => threatened.move({ from: 'a4', to: 'a7' }));

  const checked = sparse(4, [...kings(4), piece('h4', 'blue', 'r')]);
  assert.equal(checked.isCheck(), true);
  checked.eliminate('blue', 'resignation');
  assert.equal(checked.isCheck(), false);
  assert.equal(checked.get('h4').inactive, true);
  assert.ok(checked.board().flat().some(value => value?.color === 'blue' && value.inactive));
});

test('checkmate and stalemate eliminate at the beginning of that seat’s turn, and move undo restores the seat', () => {
  for (const { from, to, army, reason } of [
    { from: 'c7', to: 'b7', army: [piece('c6', 'red', 'k'), piece('c7', 'red', 'q')], reason: 'checkmate' },
    { from: 'd8', to: 'c8', army: [piece('c7', 'red', 'k'), piece('c6', 'red', 'r'), piece('d8', 'red', 'r')], reason: 'stalemate' },
  ]) {
    const position = [...army, ...kings(4).filter(value => value.color !== 'red')];
    const game = sparse(4, position);
    assert.deepEqual(game.activeColors(), partyColors(4));
    game.move({ from, to });
    assert.equal(game.turn(), 'yellow');
    assert.deepEqual(game.eliminations(), [{ color: 'blue', reason, ply: 1 }]);
    assert.equal(game.get('a7').inactive, true);
    assert.equal(game.history({ verbose: true })[0].eliminated[0].reason, reason);
    game.undo();
    assert.equal(game.turn(), 'red');
    assert.deepEqual(game.activeColors(), partyColors(4));
    assert.equal(game.get(from).color, 'red');
  }
});

test('durable move and elimination events restore the same board and last surviving player wins', () => {
  const settings = { mode: 'party', playerCount: 4 };
  const game = createGame(settings);
  game.move(game.moves({ verbose: true })[0]);
  game.eliminate('blue', 'resignation');
  game.move(game.moves({ verbose: true })[0]);
  const restored = PartyChess.restore(settings, JSON.parse(JSON.stringify(game.exportState())));
  assert.equal(restored.fen(), game.fen());
  assert.deepEqual(restored.history({ verbose: true }), game.history({ verbose: true }));
  assert.deepEqual(restored.eliminations(), game.eliminations());
  assert.deepEqual(restored.moves(), game.moves());
  restored.undo();
  assert.equal(restored.turn(), 'yellow');
  assert.equal(restored.activeColors().includes('blue'), false);
  restored.eliminate('green', 'timeout');
  restored.eliminate('yellow', 'resignation');
  assert.deepEqual(getGameOutcome(restored, settings), { winner: 'red', reason: 'last-player-standing' });
  assert.throws(() => restored.move({ from: 'e1', to: 'f3' }));
  assert.throws(() => PartyChess.restore(settings, { version: 1, playerCount: 4, events: [{ kind: 'move', from: 'd2', to: 'd9' }] }));
});

test('2 vs 2 binds opposite partners without changing armies, board geometry or clockwise turns', () => {
  assert.equal(isPartyTeams(teamSettings), true);
  assert.equal(isPartyTeams({ ...teamSettings, mode: 'classic' }), false);
  assert.equal(isPartyTeams({ ...teamSettings, playerCount: 3 }), false);
  assert.equal(isPartyTeams({ mode: 'party', playerCount: 4 }), false);
  assert.equal(partyTeamFor('red'), 'red-yellow');
  assert.equal(partyTeamFor('yellow'), 'red-yellow');
  assert.equal(partyTeamFor('blue'), 'blue-green');
  assert.equal(partyTeamFor('green'), 'blue-green');
  assert.equal(partyTeamFor('w'), null);
  assert.equal(samePartyTeam('red', 'yellow'), true);
  assert.equal(samePartyTeam('red', 'blue'), false);
  assert.equal(samePartyTeam('w', 'b'), false);
  assert.deepEqual(partyTeamColors('red-yellow'), ['red', 'yellow']);
  assert.equal(partyTeamLabel('blue-green'), 'Blue & Green');
  partyTeamColors('red-yellow').pop();
  assert.deepEqual(partyTeamColors('red-yellow'), ['red', 'yellow']);

  const game = createGame(teamSettings);
  const free = createGame({ mode: 'party', playerCount: 4 });
  assert.equal(game.geometry, getPartyGeometry(4));
  assert.equal(game.geometry.cells.length, 160);
  assert.deepEqual(game.board(), free.board());
  assert.equal(game.moves().length, 20);
  for (const color of partyColors(4)) {
    assert.equal(game.turn(), color);
    assert.equal(game.moves({ square: partyHomeSquare(4, partyColors(4)[(partyColors(4).indexOf(color) + 2) % 4], 4, 1) }).length, 0);
    game.move({ from: partyHomeSquare(4, color, 4, 1), to: partyHomeSquare(4, color, 4, 3) });
  }
  assert.equal(game.turn(), 'red');
  assert.equal(game.outcome(), null);
  assert.throws(() => new PartyChess({ playerCount: 3, partyVariant: 'teams' }), /four players/);
});

test('all six roles cannot capture a partner, and allied pieces block sliding and pawn movement', () => {
  for (const [type, to] of [['r', 'e7'], ['b', 'g7'], ['q', 'e7'], ['n', 'f7'], ['p', 'f6'], ['k', 'f6']]) {
    const base = [...kings(4).filter(value => type !== 'k' || value.color !== 'red'), piece('e5', 'red', type)];
    const allied = teamSparse([...base, piece(to, 'yellow', 'p')]);
    assert.equal(targets(allied, 'e5').includes(to), false, type);
    assert.throws(() => allied.move({ from: 'e5', to }), /not legal/);
    const enemy = teamSparse([...base, piece(to, 'blue', 'p')]);
    assert.ok(targets(enemy, 'e5').includes(to), type);
    enemy.move({ from: 'e5', to });
    assert.equal(enemy.history({ verbose: true })[0].capturedColor, 'blue');
  }
  const blocked = teamSparse([...kings(4), piece('e5', 'red', 'r'), piece('e7', 'yellow', 'p'), piece('f5', 'red', 'p'), piece('f6', 'yellow', 'n')]);
  assert.ok(targets(blocked, 'e5').includes('e6'));
  assert.equal(targets(blocked, 'e5').includes('e8'), false);
  assert.equal(targets(blocked, 'f5').includes('f6'), false);
  const allyKing = teamSparse([...kings(4), piece('g12', 'red', 'r')]);
  assert.equal(targets(allyKing, 'g12').includes('g14'), false);
  const enemyKing = teamSparse([...kings(4), piece('a4', 'red', 'r')]);
  assert.equal(targets(enemyKing, 'a4').includes('a7'), false);
});

test('team kings ignore allied attacks but moving pieces must still protect their own king', () => {
  const ally = teamSparse([...kings(4), piece('h4', 'yellow', 'r')]);
  const enemy = teamSparse([...kings(4), piece('h4', 'blue', 'r')]);
  assert.equal(ally.isCheck('red'), false);
  assert.equal(enemy.isCheck('red'), true);
  const adjacent = teamSparse([...kings(4).filter(value => value.color !== 'yellow'), piece('h2', 'yellow', 'k')]);
  assert.equal(adjacent.isCheck('red'), false);
  assert.ok(targets(adjacent, 'h1').includes('g1'));
  const pinned = teamSparse([...kings(4), piece('h2', 'red', 'r'), piece('h8', 'blue', 'r')]);
  assert.equal(targets(pinned, 'h2').includes('g2'), false);
  assert.throws(() => pinned.move({ from: 'h2', to: 'g2' }), /not legal/);
  const unpinned = teamSparse([...kings(4), piece('h2', 'red', 'r'), piece('h8', 'yellow', 'r')]);
  assert.ok(targets(unpinned, 'h2').includes('g2'));
  const guarded = teamSparse([...kings(4).filter(value => !['red', 'blue'].includes(value.color)), piece('e5', 'red', 'k'), piece('g7', 'blue', 'k')]);
  assert.equal(targets(guarded, 'e5').includes('f6'), false);
});

test('a player may rescue their checked partner or make another legal move before that partner’s turn', () => {
  const position = [...kings(4), piece('g12', 'blue', 'r'), piece('h12', 'red', 'r'), piece('d2', 'red', 'p')];
  const rescue = teamSparse(position);
  assert.equal(rescue.isCheck('yellow'), true);
  assert.equal(rescue.isCheck('red'), false);
  assert.ok(targets(rescue, 'd2').includes('d3'));
  rescue.move({ from: 'h12', to: 'g12' });
  assert.equal(rescue.isCheck('yellow'), false);
  assert.equal(rescue.outcome(), null);
  const otherMove = teamSparse(position);
  otherMove.move({ from: 'd2', to: 'd3' });
  assert.equal(otherMove.isCheck('yellow'), true);
  assert.equal(otherMove.outcome(), null);
  assert.equal(otherMove.turn(), 'blue');
});

test('team castling ignores allied attacks but still requires its own unmoved rook, clear path and enemy-safe transit', () => {
  const position = [...kings(4), piece('k1', 'red', 'r')];
  const alliedRay = teamSparse([...position, piece('i4', 'yellow', 'r')]);
  assert.ok(targets(alliedRay, 'h1').includes('j1'));
  alliedRay.move({ from: 'h1', to: 'j1' });
  assert.equal(alliedRay.get('i1').color, 'red');
  assert.equal(alliedRay.get('i1').type, 'r');
  alliedRay.undo();
  assert.ok(targets(alliedRay, 'h1').includes('j1'));
  const enemyRay = teamSparse([...position, piece('i4', 'blue', 'r')]);
  assert.equal(targets(enemyRay, 'h1').includes('j1'), false);
  const allyBlock = teamSparse([...position, piece('i1', 'yellow', 'n')]);
  assert.equal(targets(allyBlock, 'h1').includes('j1'), false);
  const borrowed = teamSparse([...kings(4), piece('k1', 'yellow', 'r')]);
  assert.equal(targets(borrowed, 'h1').includes('j1'), false);
});

test('team promotion retains the eighth-rank choice and does not introduce en passant', () => {
  const game = teamSparse([...kings(4), piece('h7', 'red', 'p', { moved: true }), piece('i8', 'blue', 'r')]);
  assert.deepEqual(game.moves({ square: 'h7', verbose: true }).filter(move => move.to === 'i8').map(move => move.promotion), ['q', 'r', 'b', 'n']);
  assert.throws(() => game.move({ from: 'h7', to: 'i8' }), /not legal/);
  game.move({ from: 'h7', to: 'i8', promotion: 'n' });
  assert.equal(game.get('i8').type, 'n');
  assert.equal(game.get('i8').color, 'red');
  assert.equal(game.history({ verbose: true })[0].capturedColor, 'blue');
  game.undo();
  assert.equal(game.get('h7').type, 'p');
  assert.equal(game.get('i8').color, 'blue');

  const noEnPassant = teamSparse([...kings(4), piece('d2', 'red', 'p'), piece('c4', 'blue', 'p', { moved: true })]);
  noEnPassant.move({ from: 'd2', to: 'd4' });
  assert.equal(targets(noEnPassant, 'c4').includes('d3'), false);
});

test('checkmating either opposing army wins for both partners and undo restores the complete pre-move state', () => {
  const position = [piece('c6', 'red', 'k'), piece('c7', 'red', 'q'), ...kings(4).filter(value => value.color !== 'red')];
  const game = teamSparse(position);
  const before = game.fen();
  game.move({ from: 'c7', to: 'b7' });
  const result = { winner: 'red', winners: ['red', 'yellow'], winningTeam: 'red-yellow', reason: 'checkmate', defeated: 'blue' };
  assert.deepEqual(game.outcome(), result);
  assert.equal(game.isCheckmate(), true);
  assert.equal(game.isStalemate(), false);
  assert.equal(game.turn(), 'blue');
  assert.deepEqual(game.activeColors(), partyColors(4));
  assert.deepEqual(game.eliminations(), []);
  assert.equal(game.get('a7').inactive, false);
  assert.equal(game.moves().length, 0);
  assert.throws(() => game.move({ from: 'g14', to: 'g13' }), /ended/);
  game.outcome().winners.pop();
  assert.deepEqual(game.outcome(), result);
  game.undo();
  assert.equal(game.outcome(), null);
  assert.equal(game.isCheckmate(), false);
  assert.equal(game.fen(), before);
  assert.equal(game.history().length, 0);
  game.move({ from: 'c7', to: 'b7' });
  assert.deepEqual(game.outcome(), result);
});

test('team mate is adjudicated only at the affected seat’s turn, allowing intervening partner rescue', () => {
  const position = [piece('c6', 'red', 'k'), piece('b7', 'red', 'q'), piece('e2', 'red', 'p'), ...kings(4).filter(value => value.color !== 'red')];
  const delayed = teamSparse(position, { turn: 'green' });
  assert.equal(delayed.isCheck('blue'), true);
  assert.equal(delayed.outcome(), null);
  delayed.move({ from: 'n8', to: 'n9' });
  assert.equal(delayed.turn(), 'red');
  assert.equal(delayed.outcome(), null);
  delayed.move({ from: 'e2', to: 'e3' });
  assert.equal(delayed.turn(), 'blue');
  assert.equal(delayed.outcome().reason, 'checkmate');

  const rescued = teamSparse([...position, piece('b10', 'green', 'r')], { turn: 'green' });
  assert.equal(rescued.outcome(), null);
  rescued.move({ from: 'b10', to: 'b7' });
  assert.equal(rescued.isCheck('blue'), false);
  rescued.move({ from: 'e2', to: 'e3' });
  assert.equal(rescued.turn(), 'blue');
  assert.equal(rescued.outcome(), null);
  assert.ok(rescued.moves().length > 0);
});

test('team stalemate draws the entire game without eliminating an army, and undo reopens play', () => {
  const position = [piece('c7', 'red', 'k'), piece('c6', 'red', 'r'), piece('d8', 'red', 'r'), ...kings(4).filter(value => value.color !== 'red')];
  const game = teamSparse(position);
  game.move({ from: 'd8', to: 'c8' });
  assert.deepEqual(game.outcome(), { winner: null, reason: 'stalemate' });
  assert.equal(game.turn(), 'blue');
  assert.equal(game.isCheckmate(), false);
  assert.equal(game.isStalemate(), true);
  assert.deepEqual(game.activeColors(), partyColors(4));
  assert.deepEqual(game.eliminations(), []);
  game.undo();
  assert.equal(game.outcome(), null);
  assert.equal(game.isStalemate(), false);
});

test('team resignation and timeout end immediately for the whole side and persist as replayable team results', () => {
  for (const color of partyColors(4)) for (const reason of ['resignation', 'timeout']) {
    const game = createGame(teamSettings);
    game.move({ from: 'h2', to: 'h4' });
    game.eliminate(color, reason);
    const winningTeam = ['red', 'yellow'].includes(color) ? 'blue-green' : 'red-yellow';
    const winners = partyTeamColors(winningTeam);
    const result = { winner: winners[0], winners, winningTeam, reason, defeated: color };
    assert.deepEqual(game.outcome(), result);
    assert.deepEqual(game.activeColors(), partyColors(4));
    assert.deepEqual(game.eliminations(), []);
    assert.equal(game.board().flat().some(value => value?.inactive), false);
    assert.throws(() => game.eliminate('blue', 'resignation'), /ended/);
    assert.throws(() => game.move({ from: 'b7', to: 'd7' }), /ended/);
    const saved = JSON.parse(JSON.stringify(game.exportState()));
    const restored = PartyChess.restore(teamSettings, saved);
    assert.equal(restored.fen(), game.fen());
    assert.deepEqual(restored.history({ verbose: true }), game.history({ verbose: true }));
    assert.deepEqual(restored.outcome(), result);
    const instance = createGame(teamSettings);
    instance.restoreState(saved);
    assert.deepEqual(instance.outcome(), result);
    assert.throws(() => PartyChess.restore(teamSettings, { ...saved, events: [...saved.events, { kind: 'eliminate', color, reason }] }), /ended/);
  }
});

test('team saved states cannot silently load as free-for-all, while legacy saves remain free-for-all', () => {
  const game = createGame(teamSettings);
  for (const color of partyColors(4)) game.move({ from: partyHomeSquare(4, color, 4, 1), to: partyHomeSquare(4, color, 4, 3) });
  const saved = game.exportState();
  assert.equal(saved.partyVariant, 'teams');
  const restored = PartyChess.restore(teamSettings, saved);
  assert.equal(restored.fen(), game.fen());
  assert.deepEqual(restored.moves(), game.moves());
  restored.undo();
  game.undo();
  assert.equal(restored.fen(), game.fen());
  assert.throws(() => PartyChess.restore({ playerCount: 4 }, saved), /saved Party/);
  assert.throws(() => createGame({ mode: 'party', playerCount: 4 }).restoreState(saved), /saved Party/);
  assert.throws(() => PartyChess.restore({ playerCount: 3, partyVariant: 'teams' }, saved), /saved Party/);
  const legacy = createGame({ mode: 'party', playerCount: 4 }).exportState();
  delete legacy.partyVariant;
  const free = PartyChess.restore({ playerCount: 4 }, legacy);
  assert.equal(free.partyVariant, 'ffa');
  assert.throws(() => PartyChess.restore(teamSettings, legacy), /saved Party/);
  const enemy = sparse(4, [...kings(4), piece('h4', 'yellow', 'r')]);
  assert.equal(enemy.isCheck('red'), true);
});

test('teams retain threefold repetition and the 200-ply no-progress draw', () => {
  const game = createGame(teamSettings);
  for (let cycle = 0; cycle < 2; cycle++) for (const forward of [true, false]) for (const color of partyColors(4)) {
    const home = partyHomeSquare(4, color, 1, 0);
    const out = partyHomeSquare(4, color, 2, 2);
    game.move({ from: forward ? home : out, to: forward ? out : home });
  }
  assert.deepEqual(game.outcome(), { winner: null, reason: 'threefold-repetition' });
  const restored = PartyChess.restore(teamSettings, game.exportState());
  assert.deepEqual(restored.outcome(), game.outcome());
  restored.undo();
  assert.equal(restored.outcome(), null);
  const quiet = teamSparse(kings(4), { halfmove: 199 });
  quiet.move({ from: 'h1', to: 'g1' });
  assert.deepEqual(quiet.outcome(), { winner: null, reason: 'fifty-move-rule' });
  quiet.undo();
  assert.equal(quiet.outcome(), null);
});
