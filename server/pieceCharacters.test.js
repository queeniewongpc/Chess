import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, createArenaPosition, STANDARD_ROSTER } from '../shared/game.js';
import { partyColors, partyHomeSquare } from '../shared/partyGeometry.js';
import { buildCharacterTimeline } from '../shared/pieceCharacters.js';

const timeline = (settings, game) => buildCharacterTimeline(settings, game.history({ verbose: true }), game.board());
const identity = ({ id, origin, birthType, variant, ordinal, typeOrdinal, color }) => ({ id, origin, birthType, variant, ordinal, typeOrdinal, color });
const counts = (values = {}) => ({ p: 0, n: 0, b: 0, r: 0, q: 0, k: 0, ...values });
const playOtherSeats = game => {
  while (game.turn() !== 'red') game.move(game.moves({ verbose: true }).find(move => move.piece === 'p') ?? game.moves({ verbose: true })[0]);
};

test('every starting physical piece has a unique deterministic character, including opposing and adjacent pawns', () => {
  const first = buildCharacterTimeline({ mode: 'classic' });
  const second = buildCharacterTimeline({ mode: 'classic' });
  assert.deepEqual(first, second);
  assert.equal(first.roster.length, 32);
  assert.equal(new Set(first.roster.map(piece => piece.id)).size, 32);
  assert.equal(new Set(first.roster.map(piece => piece.variant)).size, 32);
  for (const [rank, color] of [[2, 'w'], [7, 'b']]) {
    const pawns = Array.from({ length: 8 }, (_, file) => first.pieces[`${'abcdefgh'[file]}${rank}`]);
    assert.deepEqual(pawns.map(piece => piece.typeOrdinal), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.ok(pawns.every(piece => piece.birthType === 'p' && piece.color === color));
  }
  assert.notEqual(first.pieces.a2.variant, first.pieces.b2.variant);
  assert.notEqual(first.pieces.a2.variant, first.pieces.a7.variant);
});

test('captures feature the actual two pawns and keep immutable character snapshots across later moves', () => {
  const settings = { mode: 'classic' };
  const game = createGame(settings);
  for (const move of ['e4', 'd5', 'exd5', 'Nf6', 'd6']) game.move(move);
  const result = timeline(settings, game);
  const capture = result.events[2];
  assert.equal(capture.actor.id, 'w:e2');
  assert.equal(capture.victim.id, 'b:d7');
  assert.equal(capture.capturedSquare, 'd5');
  assert.deepEqual(capture.motions.map(({ from, to }) => [from, to]), [['e4', 'd5']]);
  assert.equal(result.pieces.d6.id, capture.actor.id);
  assert.equal(result.pieces.d5, undefined);
  assert.equal(capture.move.to, 'd5');
  assert.deepEqual(identity(result.pieces.d6), identity(result.roster.find(piece => piece.id === 'w:e2')));
  assert.deepEqual(result, buildCharacterTimeline(settings, JSON.parse(JSON.stringify(game.history({ verbose: true }))), JSON.parse(JSON.stringify(game.board()))));
});

test('undo, branch, and replay restore original characters instead of assigning a new pawn appearance', () => {
  const settings = { mode: 'classic' };
  const game = createGame(settings);
  for (const move of ['e4', 'd5', 'exd5']) game.move(move);
  const captured = timeline(settings, game);
  game.undo();
  const restored = timeline(settings, game);
  assert.equal(restored.pieces.e4.id, captured.events[2].actor.id);
  assert.equal(restored.pieces.d5.id, captured.events[2].victim.id);
  game.move('e5');
  const branch = timeline(settings, game);
  assert.deepEqual(identity(branch.pieces.e5), identity(restored.pieces.e4));
  assert.notEqual(branch.events[2].key, captured.events[2].key);
  game.undo();
  game.move('exd5');
  assert.deepEqual(timeline(settings, game), captured);
});

test('en passant animates the pawn on the captured square, not an imaginary piece at the landing square', () => {
  const settings = { mode: 'classic' };
  const game = createGame(settings);
  for (const move of ['e4', 'a6', 'e5', 'd5', 'exd6']) game.move(move);
  const result = timeline(settings, game);
  const event = result.events.at(-1);
  assert.equal(event.actor.id, 'w:e2');
  assert.equal(event.victim.id, 'b:d7');
  assert.equal(event.capturedSquare, 'd5');
  assert.equal(event.move.to, 'd6');
  assert.equal(result.pieces.d6.id, 'w:e2');
  assert.equal(result.pieces.d5, undefined);
});

test('both castling directions move each original king and rook as separate characters', () => {
  const settings = { mode: 'custom', customFen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1' };
  const game = createGame(settings);
  game.move('O-O');
  game.move('O-O-O');
  const result = timeline(settings, game);
  assert.deepEqual(result.events[0].motions.map(motion => [motion.from, motion.to, motion.character.id]), [['e1', 'g1', 'w:e1'], ['h1', 'f1', 'w:h1']]);
  assert.deepEqual(result.events[1].motions.map(motion => [motion.from, motion.to, motion.character.id]), [['e8', 'c8', 'b:e8'], ['a8', 'd8', 'b:a8']]);
  assert.equal(result.pieces.f1.id, 'w:h1');
  assert.equal(result.pieces.d8.id, 'b:a8');
  assert.equal(result.events[0].victim, null);
});

test('promotion changes the role while keeping the physical pawn identity, costume variant, and undo appearance', () => {
  const settings = { mode: 'custom', customFen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1' };
  const game = createGame(settings);
  const pawn = timeline(settings, game).pieces.a7;
  game.move({ from: 'a7', to: 'a8', promotion: 'q' });
  const promoted = timeline(settings, game);
  assert.deepEqual(identity(promoted.pieces.a8), identity(pawn));
  assert.equal(promoted.pieces.a8.type, 'q');
  assert.equal(promoted.pieces.a8.birthType, 'p');
  assert.equal(promoted.events[0].actor.type, 'p');
  assert.equal(promoted.events[0].arriving.type, 'q');
  game.undo();
  assert.deepEqual(timeline(settings, game).pieces.a7, pawn);
});

for (const shape of ['8x4', '4x8', '8x8']) {
  test(`${shape} custom layouts produce stable identities regardless of the stored position array order`, () => {
    const settings = { mode: 'half', halfShape: shape, halfWin: 'capture-all', halfPlacement: 'anywhere', halfCounts: { w: { ...STANDARD_ROSTER }, b: { ...STANDARD_ROSTER } } };
    const position = createArenaPosition(settings);
    const first = buildCharacterTimeline({ ...settings, halfPosition: position });
    const reordered = buildCharacterTimeline({ ...settings, halfPosition: position.slice().reverse() });
    assert.deepEqual(first, reordered);
    assert.equal(first.roster.length, 32);
    assert.equal(new Set(first.roster.map(piece => piece.variant)).size, 32);
  });
}

test('Chaos Kingdom capture-promotions show both physical characters and tolerate incomplete capture-king drafts', () => {
  const settings = {
    mode: 'half', halfShape: '8x4', halfPlacement: 'anywhere',
    halfCounts: { w: counts({ p: 1 }), b: counts({ r: 1 }) },
    halfPosition: [{ square: 'a3', type: 'p', color: 'w' }, { square: 'b4', type: 'r', color: 'b' }],
  };
  const game = createGame(settings);
  game.move({ from: 'a3', to: 'b4', promotion: 'n' });
  const result = timeline(settings, game);
  assert.equal(result.events[0].actor.id, 'w:a3');
  assert.equal(result.events[0].victim.id, 'b:b4');
  assert.equal(result.pieces.b4.id, 'w:a3');
  assert.equal(result.pieces.b4.type, 'n');
  assert.equal(result.pieces.b4.birthType, 'p');
  assert.equal(buildCharacterTimeline({ ...settings, halfWin: 'capture-king' }).roster.length, 2);
});

for (const count of [3, 4]) {
  test(`${count}-player identities agree across seat orientations and a move history with a resignation`, () => {
    const settings = { mode: 'party', playerCount: count };
    const game = createGame(settings);
    const before = timeline(settings, game);
    assert.equal(new Set(before.roster.map(piece => piece.variant)).size, count * 16);
    for (const color of partyColors(count)) {
      assert.deepEqual(Array.from({ length: 8 }, (_, file) => before.pieces[partyHomeSquare(count, color, file, 1)].typeOrdinal), [0, 1, 2, 3, 4, 5, 6, 7]);
    }
    const redOrigin = partyHomeSquare(count, 'red', 4, 1);
    const redDestination = partyHomeSquare(count, 'red', 4, 3);
    game.move({ from: redOrigin, to: redDestination });
    game.eliminate('blue', 'resignation');
    game.move(game.moves({ verbose: true })[0]);
    const result = timeline(settings, game);
    assert.deepEqual(identity(result.pieces[redDestination]), identity(before.pieces[redOrigin]));
    assert.equal(result.events.length, 2);
    assert.equal(result.events[1].actor.color, 'yellow');
    assert.ok(Object.values(result.pieces).filter(piece => piece.color === 'blue').every(piece => piece.inactive));
    assert.deepEqual(result, buildCharacterTimeline(JSON.parse(JSON.stringify(settings)), JSON.parse(JSON.stringify(game.history({ verbose: true }))), JSON.parse(JSON.stringify(game.board()))));
  });

  test(`${count}-player public castling history reconstructs the correct rook without private engine metadata`, () => {
    const settings = { mode: 'party', playerCount: count };
    const game = createGame(settings);
    const square = (file, rank = 0) => partyHomeSquare(count, 'red', file, rank);
    const plans = [
      { from: square(6), to: square(5, 2) },
      { from: square(4, 1), to: square(4, 3) },
      { from: square(5), to: square(4, 1) },
      { from: square(4), to: square(6) },
    ];
    for (const plan of plans) {
      game.move(plan);
      if (plan !== plans.at(-1)) playOtherSeats(game);
    }
    const result = timeline(settings, game);
    const event = result.events.at(-1);
    assert.equal(event.move.castle, undefined);
    assert.equal(event.motions.length, 2);
    assert.deepEqual(event.motions.map(motion => [motion.from, motion.to]), [[square(4), square(6)], [square(7), square(5)]]);
    assert.equal(result.pieces[square(5)].id, `red:${square(7)}`);
  });
}

test('multiplayer capture events identify the opposing individual pawn, not just its piece type or army', () => {
  const settings = { mode: 'party', playerCount: 4 };
  const game = createGame(settings);
  game.move({ from: 'd2', to: 'd4' });
  game.move({ from: 'b5', to: 'd5' });
  playOtherSeats(game);
  game.move({ from: 'e2', to: 'e3' });
  game.move({ from: 'd5', to: 'e5' });
  playOtherSeats(game);
  game.move({ from: 'd4', to: 'e5' });
  const result = timeline(settings, game);
  const capture = result.events.at(-1);
  assert.equal(capture.actor.id, 'red:d2');
  assert.equal(capture.victim.id, 'blue:b5');
  assert.notEqual(capture.actor.variant, capture.victim.variant);
  assert.equal(result.pieces.e5.id, 'red:d2');
  assert.equal(capture.capturedSquare, 'e5');
});

test('capturing a resigned army preserves the victim’s inactive appearance at that ply, including after undo', () => {
  const settings = { mode: 'party', playerCount: 4 };
  const game = createGame(settings);
  game.move({ from: 'd2', to: 'd4' });
  game.move({ from: 'b5', to: 'd5' });
  playOtherSeats(game);
  game.move({ from: 'e2', to: 'e3' });
  game.move({ from: 'd5', to: 'e5' });
  playOtherSeats(game);
  game.eliminate('blue', 'resignation');
  game.move({ from: 'd4', to: 'e5' });
  const result = buildCharacterTimeline(settings, game.history({ verbose: true }), game.board(), game.eliminations());
  assert.equal(result.events.at(-1).victim.id, 'blue:b5');
  assert.equal(result.events.at(-1).victim.inactive, true);
  assert.equal(result.events[1].actor.inactive, false, 'a move before resignation still shows an active army');
  game.undo();
  const restored = buildCharacterTimeline(settings, game.history({ verbose: true }), game.board(), game.eliminations());
  assert.equal(restored.pieces.e5.id, 'blue:b5');
  assert.equal(restored.pieces.e5.inactive, true);
  // Engine replay can restore the state before a resignation; current snapshot
  // metadata, not a remembered elimination list, must determine the costume.
  game.undo();
  assert.deepEqual(game.eliminations(), []);
  const earlier = buildCharacterTimeline(settings, game.history({ verbose: true }), game.board(), game.eliminations());
  assert.equal(earlier.pieces.e5.inactive, false);
});

test('a three-player pawn keeps its identity across a sector seam, a second capture, and promotion', () => {
  const settings = { mode: 'party', playerCount: 3 };
  const game = createGame(settings);
  const original = timeline(settings, game).pieces.ra2;
  game.move({ from: 'ra2', to: 'ra4' });
  game.move({ from: 'bg2', to: 'bg4' });
  playOtherSeats(game);
  const plans = [
    { from: 'ra4', to: 'bg4' }, { from: 'bg4', to: 'bg3' },
    { from: 'bg3', to: 'bg2' }, { from: 'bg2', to: 'bf1', promotion: 'n' },
  ];
  for (const move of plans) {
    game.move(move);
    if (move !== plans.at(-1)) playOtherSeats(game);
  }
  const result = timeline(settings, game);
  assert.deepEqual(identity(result.pieces.bf1), identity(original));
  assert.equal(result.pieces.bf1.type, 'n');
  const captures = result.events.filter(event => event.actor.id === original.id && event.victim);
  assert.deepEqual(captures.map(event => event.victim.id), ['blue:bg2', 'blue:bf1']);
  assert.equal(captures[1].actor.birthType, 'p');
  assert.equal(captures[1].arriving.type, 'n');
  game.undo();
  const restored = timeline(settings, game);
  assert.equal(restored.pieces.bg2.id, original.id);
  assert.equal(restored.pieces.bg2.type, 'p');
  assert.equal(restored.pieces.bf1.id, 'blue:bf1');
});

test('the cosmetic utility neither mutates its inputs nor guesses characters for unknown board squares', () => {
  const settings = { mode: 'classic' };
  const game = createGame(settings);
  game.move('e4');
  const history = game.history({ verbose: true });
  const board = game.board();
  const saved = JSON.stringify({ settings, history, board });
  buildCharacterTimeline(settings, history, board);
  assert.equal(JSON.stringify({ settings, history, board }), saved);
  assert.deepEqual(buildCharacterTimeline(settings, history, [[{ square: 'a4', type: 'q', color: 'w' }]]).pieces, {});
});
