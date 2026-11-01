import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, normalizeSettings, getGameOutcome, STANDARD_ROSTER, getArenaDimensions, createArenaPosition, swapArenaPieces, hasMissingArenaKings } from '../shared/game.js';
import { ENDGAMES } from '../shared/endgames.js';

const roster = (pieces = {}) => ({ p: 0, n: 0, b: 0, r: 0, q: 0, k: 0, ...pieces });
const half = (white, black, halfKing = false, halfShape = '8x4') => createGame({ mode: 'half', halfKing, halfShape, halfCounts: { w: roster(white), b: roster(black) } });

test('multiplayer format defaults to free-for-all and validates fixed four-player teams', () => {
  for (const playerCount of [3, 4]) {
    const legacy = normalizeSettings({ mode: 'party', playerCount });
    assert.equal(legacy.partyVariant, 'ffa');
    assert.deepEqual(normalizeSettings(legacy), legacy);
  }
  const teams = normalizeSettings({ mode: 'party', playerCount: 4, partyVariant: 'teams' });
  assert.equal(teams.partyVariant, 'teams');
  assert.equal(teams.undoMode, 'off');
  assert.deepEqual(normalizeSettings(teams), teams);
  assert.throws(() => normalizeSettings({ mode: 'party', playerCount: 3, partyVariant: 'teams' }), /four players/);
  for (const partyVariant of ['team', 'random', null, undefined, 2, {}, ['teams']]) {
    assert.throws(() => normalizeSettings({ mode: 'party', partyVariant }), /multiplayer format/);
  }
  // Other categories may retain the selection for a later return to multiplayer.
  const classic = createGame({ mode: 'classic', playerCount: 3, partyVariant: 'teams' });
  assert.equal(classic.moves().length, 20);
  assert.equal(classic.turn(), 'w');
});

test('settings enforce finite positive takeback budgets and bounded non-empty half rosters', () => {
  assert.equal(normalizeSettings({ undoLimit: null }).undoLimit, null);
  assert.equal(normalizeSettings({ undoLimit: Number.MAX_SAFE_INTEGER }).undoLimit, Number.MAX_SAFE_INTEGER);
  for (const undoLimit of [0, -1, Infinity, 1.5, 'unlimited', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => normalizeSettings({ undoLimit }));
  }
  assert.throws(() => half({ p: 9 }, { q: 1 }));
  assert.throws(() => half({}, { q: 1 }));
  const full = half(STANDARD_ROSTER, STANDARD_ROSTER, true);
  assert.equal(full.board().length, 4);
  assert.equal(full.board().flat().filter(Boolean).length, 32);
  assert.equal(full.board().flat().filter((piece) => piece?.type === 'k').length, 2);
});

test('half board respects boundaries and sliding blockers, omits double pawn pushes, and requires promotion choice', () => {
  const game = half({ p: 1 }, { r: 1 });
  assert.deepEqual(game.moves({ square: 'd2', verbose: true }).map((move) => move.to), ['d3']);
  assert.throws(() => game.move({ from: 'd2', to: 'd4' }));
  game.move({ from: 'd2', to: 'd3' });
  game.move({ from: 'a4', to: 'b4' });
  assert.throws(() => game.move({ from: 'd3', to: 'd4' }));
  game.move({ from: 'd3', to: 'd4', promotion: 'n' });
  assert.equal(game.get('d4').type, 'n');
  assert.equal(game.history({ verbose: true }).at(-1).promotion, 'n');
  game.undo();
  assert.equal(game.get('d3').type, 'p');
  assert.equal(game.get('d4'), undefined);
  assert.equal(game.turn(), 'w');
  const blocked = half({ r: 1, n: 1 }, { q: 1 });
  assert.equal(blocked.moves({ square: 'a1', verbose: true }).some((move) => move.to === 'c1'), false);
  assert.equal(blocked.moves({ verbose: true }).every((move) => /^[a-h][1-4]$/.test(move.to)), true);
});

test('half chess permits capturing a king but only ends when the last opposing piece is captured', () => {
  const game = half({ q: 1 }, { r: 1 }, true);
  game.move({ from: 'd1', to: 'd4' });
  game.move({ from: 'e4', to: 'e3' });
  game.move({ from: 'd4', to: 'e3' });
  assert.equal(game.history({ verbose: true }).at(-1).captured, 'k');
  assert.equal(game.isCheck(), false);
  assert.equal(getGameOutcome(game, { mode: 'half' }), null);
  game.move({ from: 'a4', to: 'a3' });
  game.move({ from: 'e3', to: 'a3' });
  assert.deepEqual(getGameOutcome(game, { mode: 'half' }), { winner: 'w', reason: 'capture-all' });
  game.undo();
  assert.equal(game.get('a3').color, 'b');
  assert.equal(getGameOutcome(game, { mode: 'half' }), null);
});

test('single-pawn half rosters are playable and repeated positions draw without insufficient-material rules', () => {
  const pawns = half({ p: 1 }, { p: 1 });
  assert.equal(getGameOutcome(pawns, { mode: 'half' }), null);
  pawns.move({ from: 'd2', to: 'e3' });
  assert.deepEqual(getGameOutcome(pawns, { mode: 'half' }), { winner: 'w', reason: 'capture-all' });
  const kings = half({}, {}, true);
  assert.equal(kings.isInsufficientMaterial(), false);
  for (let round = 0; round < 2; round++) {
    kings.move({ from: 'e1', to: 'd1' });
    kings.move({ from: 'e4', to: 'd4' });
    kings.move({ from: 'd1', to: 'e1' });
    kings.move({ from: 'd4', to: 'e4' });
  }
  assert.equal(kings.isThreefoldRepetition(), true);
  kings.undo();
  assert.equal(kings.isThreefoldRepetition(), false);
});

test('all classic endgames load, retain their side to move, and support custom sparse positions', () => {
  for (const position of ENDGAMES) {
    const game = createGame({ mode: 'endgame', endgameId: position.id });
    assert.equal(game.fen(), position.fen);
    assert.equal(game.turn(), position.fen.split(' ')[1]);
    assert.ok(game.moves().length > 0, position.name);
    assert.equal(getGameOutcome(game, { mode: 'endgame' }), null, position.name);
  }
  const fen = '7k/8/8/8/8/8/8/KR6 w - - 0 1';
  assert.equal(createGame({ mode: 'endgame', endgameId: 'custom', customFen: fen }).fen(), fen);
  assert.throws(() => createGame({ mode: 'endgame', endgameId: 'custom', customFen: '8/8/8/8/8/8/8/8 w - - 0 1' }));
  assert.throws(() => createGame({ mode: 'endgame', endgameId: 'custom', customFen: '8/8/8/8/8/8/8/Kk6 w - - 0 1' }));
  assert.throws(() => createGame({ mode: 'endgame', endgameId: 'custom', customFen: '7k/8/8/8/8/8/8/K6R w - - 0 1' }));
  assert.throws(() => createGame({ mode: 'endgame', endgameId: 'custom', customFen: '4k3/8/8/8/8/8/8/4K2Q w K - 0 1' }));
  assert.throws(() => createGame({ mode: 'endgame', endgameId: 'custom', customFen: '4k3/8/8/4P3/8/8/8/4K3 w - d6 0 1' }));
  const validEp = createGame({ mode: 'endgame', endgameId: 'custom', customFen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1' });
  assert.equal(validEp.moves().includes('exd6'), true);
});

test('half-board shapes validate, old settings retain the wide board, and both shapes fit complete armies', () => {
  assert.equal(normalizeSettings({ mode: 'half' }).halfShape, '8x4');
  for (const halfShape of ['4x4', '8×4', null, 4]) {
    assert.throws(() => normalizeSettings({ halfShape }), /Chaos Kingdom board/);
  }
  const wide = half(STANDARD_ROSTER, STANDARD_ROSTER, true);
  assert.equal(wide.fen(), 'rnbqkbnr/pppppppp/PPPPPPPP/RNBQKBNR w - - 0 1');
  const narrow = half(STANDARD_ROSTER, STANDARD_ROSTER, true, '4x8');
  assert.equal(narrow.board().length, 8);
  assert.ok(narrow.board().every(row => row.length === 4));
  assert.equal(narrow.fen(), 'rnnr/bkqb/pppp/pppp/PPPP/PPPP/BQKB/RNNR w - - 0 1');
  for (const game of [wide, narrow]) {
    for (const color of ['w', 'b']) {
      const inventory = Object.fromEntries(Object.keys(STANDARD_ROSTER).map(type => [type, game.board().flat().filter(piece => piece?.color === color && piece.type === type).length]));
      assert.deepEqual(inventory, STANDARD_ROSTER);
    }
    assert.equal(getGameOutcome(game, { mode: 'half' }), null);
  }
});

test('four-file movement reaches rank eight while enforcing file bounds and blockers', () => {
  const game = half({ r: 1, n: 1 }, { r: 1 }, false, '4x8');
  const rookTargets = game.moves({ square: 'a1', verbose: true }).map(move => move.to);
  assert.ok(rookTargets.includes('a8'));
  assert.equal(rookTargets.includes('c1'), false);
  assert.ok(game.moves({ verbose: true }).every(move => /^[a-d][1-8]$/.test(move.to)));
  for (const square of ['e1', 'h8', 'a9', 'a0']) assert.equal(game.get(square), undefined);
  assert.throws(() => game.move({ from: 'a1', to: 'e1' }), /Illegal move/);
  const initial = game.fen();
  game.move({ from: 'a1', to: 'a8' });
  assert.equal(game.get('a8').color, 'w');
  game.move({ from: 'd8', to: 'd4' });
  assert.equal(game.get('d4').color, 'b');
  game.undo();
  game.undo();
  assert.equal(game.fen(), initial);
  assert.equal(game.history().length, 0);
});

test('four-file pawns promote on ranks eight and one, with promotion and capture restored by undo', () => {
  const whitePawn = half({ p: 1 }, { r: 1 }, false, '4x8');
  assert.throws(() => whitePawn.move({ from: 'b3', to: 'b5' }), /Illegal move/);
  for (const [from, to] of [['b3', 'b4'], ['d8', 'c8'], ['b4', 'b5'], ['c8', 'd8'], ['b5', 'b6'], ['d8', 'c8'], ['b6', 'b7'], ['c8', 'c7']]) whitePawn.move({ from, to });
  assert.equal(whitePawn.get('b7').type, 'p');
  assert.deepEqual(whitePawn.moves({ square: 'b7', verbose: true }).map(move => move.promotion).sort(), ['b', 'n', 'q', 'r']);
  assert.throws(() => whitePawn.move({ from: 'b7', to: 'b8' }), /Illegal move/);
  const beforePromotion = whitePawn.fen();
  whitePawn.move({ from: 'b7', to: 'b8', promotion: 'n' });
  assert.equal(whitePawn.get('b8').type, 'n');
  assert.equal(whitePawn.history({ verbose: true }).at(-1).promotion, 'n');
  whitePawn.undo();
  assert.equal(whitePawn.fen(), beforePromotion);

  const blackPawn = half({ r: 1 }, { p: 1 }, false, '4x8');
  for (const [from, to] of [['a1', 'a2'], ['c6', 'c5'], ['a2', 'a1'], ['c5', 'c4'], ['a1', 'a2'], ['c4', 'c3'], ['a2', 'a1'], ['c3', 'c2'], ['a1', 'b1']]) blackPawn.move({ from, to });
  assert.throws(() => blackPawn.move({ from: 'c2', to: 'b1' }), /Illegal move/);
  const beforeCapture = blackPawn.fen();
  blackPawn.move({ from: 'c2', to: 'b1', promotion: 'q' });
  assert.deepEqual(blackPawn.get('b1'), { color: 'b', type: 'q' });
  assert.deepEqual(getGameOutcome(blackPawn, { mode: 'half' }), { winner: 'b', reason: 'capture-all' });
  blackPawn.undo();
  assert.equal(blackPawn.fen(), beforeCapture);
  assert.deepEqual(blackPawn.get('b1'), { color: 'w', type: 'r' });
  assert.deepEqual(blackPawn.get('c2'), { color: 'b', type: 'p' });
});

test('four-file single-pawn armies have playable staggered openings and retain capture-all rules', () => {
  const game = half({ p: 1 }, { p: 1 }, false, '4x8');
  assert.deepEqual(game.get('b3'), { color: 'w', type: 'p' });
  assert.deepEqual(game.get('c6'), { color: 'b', type: 'p' });
  assert.equal(getGameOutcome(game, { mode: 'half' }), null);
  game.move({ from: 'b3', to: 'b4' });
  game.move({ from: 'c6', to: 'c5' });
  game.move({ from: 'b4', to: 'c5' });
  assert.deepEqual(getGameOutcome(game, { mode: 'half' }), { winner: 'w', reason: 'capture-all' });
  game.undo();
  assert.equal(getGameOutcome(game, { mode: 'half' }), null);
  assert.equal(game.get('c5').color, 'b');
});

test('full-board arenas start from standard piece squares while preserving arena movement rules and legacy defaults', () => {
  assert.deepEqual(getArenaDimensions('8x8'), { width: 8, height: 8 });
  assert.deepEqual(getArenaDimensions('8x4'), { width: 8, height: 4 });
  assert.deepEqual(getArenaDimensions('4x8'), { width: 4, height: 8 });
  const legacy = normalizeSettings({ mode: 'half' });
  assert.equal(legacy.halfPlacement, 'territory');
  assert.equal(legacy.halfPosition, null);
  const game = half(STANDARD_ROSTER, STANDARD_ROSTER, true, '8x8');
  assert.equal(game.fen(), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1');
  assert.equal(game.board().length, 8);
  assert.ok(game.board().every(row => row.length === 8));
  assert.deepEqual(game.moves({ square: 'e2', verbose: true }).map(move => move.to), ['e3']);
  assert.throws(() => game.move({ from: 'e2', to: 'e4' }), /Illegal move/);
  assert.equal(game.isCheck(), false);
  assert.equal(createArenaPosition({ halfShape: '8x8' }).length, 16);
});

test('arena placement rejects malformed, overlapping, out-of-bounds, wrong-roster and wrong-territory payloads', () => {
  const base = { mode: 'half', halfShape: '8x8', halfCounts: { w: roster({ r: 1 }), b: roster({ n: 1 }) } };
  const valid = [{ square: 'a2', type: 'r', color: 'w' }, { square: 'd7', type: 'n', color: 'b' }];
  assert.deepEqual(createArenaPosition({ ...base, halfPosition: valid }), valid);
  const invalid = [
    {}, 'a2', [], [null, valid[1]], [[], valid[1]],
    [{ ...valid[0], color: 'white' }, valid[1]],
    [{ ...valid[0], type: '__proto__' }, valid[1]],
    [{ ...valid[0], type: 'q' }, valid[1]],
    [{ ...valid[0], square: 'a9' }, valid[1]],
    [{ ...valid[0], square: ['a2'] }, valid[1]],
    [valid[0], { ...valid[1], square: 'a2' }],
    [{ ...valid[0], square: 'a5' }, valid[1]],
    [valid[0], { ...valid[1], square: 'd4' }],
    [valid[0]], Array(33).fill(valid[0]),
    Object.assign(Array(3), { 0: valid[0], 2: valid[1] }),
  ];
  for (const halfPosition of invalid) assert.throws(() => createArenaPosition({ ...base, halfPosition }));
  assert.throws(() => normalizeSettings({ ...base, halfPlacement: 'custom' }), /placement rule/);
  assert.throws(() => createArenaPosition({ ...base, halfShape: '4x8', halfPosition: [{ ...valid[0], square: 'e2' }, valid[1]] }), /inside/);
  assert.throws(() => createArenaPosition({ ...base, halfShape: '8x4', halfPosition: [{ ...valid[0], square: 'a3' }, { ...valid[1], square: 'd4' }] }), /Own half/);
  assert.throws(() => createArenaPosition({ ...base, halfKing: true, halfPosition: valid }), /exactly/);
  const withKings = [...valid, { square: 'b1', color: 'w', type: 'k' }, { square: 'c8', color: 'b', type: 'k' }];
  assert.deepEqual(createArenaPosition({ ...base, halfKing: true, halfPosition: withKings }), withKings);
  const anywhere = [{ ...valid[0], square: 'a8' }, { ...valid[1], square: 'd1' }];
  assert.deepEqual(createArenaPosition({ ...base, halfPlacement: 'anywhere', halfPosition: anywhere }), anywhere);
  const normalized = normalizeSettings({ ...base, halfPosition: valid });
  normalized.halfPosition[0].square = 'h4';
  assert.equal(valid[0].square, 'a2');
});

test('arena editor moves and swaps preserve full rosters, enforce territory, and never mutate input positions', () => {
  const full = { mode: 'half', halfKing: true, halfCounts: { w: STANDARD_ROSTER, b: STANDARD_ROSTER } };
  const position = createArenaPosition(full);
  assert.equal(position.length, 32);
  const settings = { ...full, halfPosition: position };
  const initial = JSON.stringify(position);
  const swapped = swapArenaPieces(settings, 'a1', 'b1');
  assert.deepEqual(swapped.find(piece => piece.square === 'b1'), { square: 'b1', color: 'w', type: 'r' });
  assert.deepEqual(swapped.find(piece => piece.square === 'a1'), { square: 'a1', color: 'w', type: 'n' });
  assert.equal(swapped.length, 32);
  assert.throws(() => swapArenaPieces(settings, 'a1', 'a4'), /Own half/);
  assert.equal(JSON.stringify(position), initial);
  const crossed = swapArenaPieces({ ...settings, halfPlacement: 'anywhere' }, 'a1', 'a4');
  assert.equal(crossed.find(piece => piece.square === 'a4').color, 'w');
  assert.equal(crossed.find(piece => piece.square === 'a1').color, 'b');
  const moved = swapArenaPieces({ ...full, halfShape: '8x8' }, 'a1', 'a3');
  assert.equal(moved.find(piece => piece.square === 'a3').type, 'r');
  assert.equal(moved.some(piece => piece.square === 'a1'), false);
  assert.throws(() => swapArenaPieces({ ...full, halfShape: '8x8' }, 'a3', 'a4'), /piece to move/);
  assert.throws(() => swapArenaPieces(settings, 'a1', 'a8'), /inside/);
});

test('arbitrary full-board arena positions allow far-rank pawns and capturable kings without changing capture-all', () => {
  const settings = {
    mode: 'half', halfShape: '8x8', halfPlacement: 'anywhere', halfKing: true,
    halfCounts: { w: roster({ p: 1, r: 1 }), b: roster({ r: 1 }) },
    halfPosition: [
      { square: 'a8', color: 'w', type: 'p' }, { square: 'h4', color: 'w', type: 'r' }, { square: 'b1', color: 'w', type: 'k' },
      { square: 'h5', color: 'b', type: 'k' }, { square: 'h8', color: 'b', type: 'r' },
    ],
  };
  const game = createGame(settings);
  assert.deepEqual(game.moves({ square: 'a8' }), []);
  assert.equal(game.get('a8').type, 'p');
  game.move({ from: 'h4', to: 'h5' });
  assert.equal(game.history({ verbose: true }).at(-1).captured, 'k');
  assert.equal(game.isCheck(), false);
  assert.equal(getGameOutcome(game, settings), null);
  game.move({ from: 'h8', to: 'h6' });
  game.move({ from: 'h5', to: 'h6' });
  assert.deepEqual(getGameOutcome(game, settings), { winner: 'w', reason: 'capture-all' });
  game.undo();
  assert.equal(game.get('h6').color, 'b');
  assert.equal(getGameOutcome(game, settings), null);
});

test('legacy king toggles migrate once while new arena rosters retain independent king counts', () => {
  for (const halfKing of [false, true]) {
    const migrated = normalizeSettings({ mode: 'half', halfKing, halfCounts: { w: roster({ r: 1, k: 1 }), b: roster({ r: 1, k: 0 }) } });
    assert.equal(migrated.halfWin, 'capture-all');
    assert.equal(migrated.halfCounts.w.k, halfKing ? 1 : 0);
    assert.equal(migrated.halfCounts.b.k, halfKing ? 1 : 0);
    assert.deepEqual(normalizeSettings(migrated), migrated);
  }
  const independent = normalizeSettings({ mode: 'half', halfWin: 'capture-all', halfKing: true, halfCounts: { w: roster({ r: 1, k: 1 }), b: roster({ r: 1 }) } });
  assert.equal(independent.halfCounts.w.k, 1);
  assert.equal(independent.halfCounts.b.k, 0);
  assert.equal(independent.halfKing, false);
  assert.deepEqual(normalizeSettings(independent), independent);
  assert.equal(createArenaPosition(independent).filter(piece => piece.type === 'k').length, 1);
  for (const k of [-1, 2, 0.5, '1']) assert.throws(() => normalizeSettings({ ...independent, halfCounts: { ...independent.halfCounts, b: { ...independent.halfCounts.b, k } } }));
  for (const halfWin of [null, 'checkmate', true, undefined]) assert.throws(() => normalizeSettings({ halfWin }), /win condition/);
});

test('capture-king drafts remain editable but strict game creation requires one king on each side', () => {
  for (const halfShape of ['8x4', '4x8', '8x8']) {
    const draft = normalizeSettings({ mode: 'half', halfWin: 'capture-king', halfShape, halfCounts: { w: roster({ r: 1, k: 1 }), b: roster({ r: 1 }) } });
    assert.equal(hasMissingArenaKings(draft), true);
    assert.equal(createArenaPosition(draft).filter(piece => piece.type === 'k').length, 1);
    assert.throws(() => createGame(draft), /one king for each player/);
    const preview = createGame(draft, { allowIncompleteArena: true });
    assert.equal(preview.board().flat().filter(piece => piece?.type === 'k').length, 1);
    const complete = { ...draft, halfCounts: { ...draft.halfCounts, b: { ...draft.halfCounts.b, k: 1 } } };
    assert.equal(hasMissingArenaKings(complete), false);
    assert.equal(createGame(complete).isGameOver(), false);
  }
});

test('both arena win conditions capture kings normally, but only capture-king ends immediately across every board shape', () => {
  for (const halfShape of ['8x4', '4x8', '8x8']) {
    for (const halfWin of ['capture-all', 'capture-king']) {
      const settings = {
        mode: 'half', halfShape, halfWin, halfPlacement: 'anywhere',
        halfCounts: { w: roster({ q: 1, k: 1 }), b: roster({ r: 1, k: 1 }) },
        halfPosition: [{ square: 'a1', color: 'w', type: 'k' }, { square: 'b2', color: 'w', type: 'q' }, { square: 'b3', color: 'b', type: 'k' }, { square: 'd4', color: 'b', type: 'r' }],
      };
      const game = createGame(settings);
      const initial = game.fen();
      game.move({ from: 'b2', to: 'b3' });
      assert.equal(game.get('d4').color, 'b');
      assert.equal(game.isCheck(), false);
      assert.equal(game.isCheckmate(), false);
      if (halfWin === 'capture-king') {
        assert.equal(game.isGameOver(), true);
        assert.deepEqual(getGameOutcome(game, { mode: 'half' }), { winner: 'w', reason: 'capture-king' });
        const replayed = createGame(settings);
        for (const { from, to, promotion } of game.history({ verbose: true })) replayed.move({ from, to, ...(promotion ? { promotion } : {}) });
        assert.equal(replayed.isGameOver(), true);
        assert.deepEqual(getGameOutcome(replayed, settings), { winner: 'w', reason: 'capture-king' });
        assert.throws(() => game.move({ from: 'd4', to: 'd3' }), /ended/);
      } else {
        assert.equal(game.isGameOver(), false);
        assert.equal(getGameOutcome(game, settings), null);
      }
      game.undo();
      assert.equal(game.fen(), initial);
      assert.equal(game.isGameOver(), false);
    }
    const blackWins = createGame({
      mode: 'half', halfShape, halfWin: 'capture-king', halfPlacement: 'anywhere',
      halfCounts: { w: roster({ r: 1, k: 1 }), b: roster({ q: 1, k: 1 }) },
      halfPosition: [{ square: 'b2', color: 'w', type: 'k' }, { square: 'd1', color: 'w', type: 'r' }, { square: 'a4', color: 'b', type: 'k' }, { square: 'b3', color: 'b', type: 'q' }],
    });
    blackWins.move({ from: 'd1', to: 'd2' });
    blackWins.move({ from: 'b3', to: 'b2' });
    assert.deepEqual(getGameOutcome(blackWins, { mode: 'half' }), { winner: 'b', reason: 'capture-king' });
  }
});
