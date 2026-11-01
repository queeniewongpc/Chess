import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { getMoveHints } from '../shared/moveHints.js';

test('hints identify movable pieces, then only legal destinations for the selected piece', () => {
  const game = new Chess('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');
  const moves = game.moves({ verbose: true });
  const before = getMoveHints(moves, null);
  assert.deepEqual(before.origins, new Set(['e2', 'e1']));
  assert.equal(before.destinations.size, 0);
  const selected = getMoveHints(moves, 'e2');
  assert.equal(selected.origins.size, 0);
  assert.equal(selected.destinations.has('e3'), true);
  assert.equal(selected.destinations.has('d2'), false, 'a pinned rook cannot expose its king');
  assert.equal(selected.captures.has('e8'), true);
  assert.equal(game.fen(), '4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1', 'hints do not change the game');
});

test('en passant is marked as a capture even though its destination square is empty', () => {
  const game = new Chess();
  for (const move of ['e4', 'a6', 'e5', 'd5']) game.move(move);
  const hints = getMoveHints(game.moves({ verbose: true }), 'e5');
  assert.equal(game.get('d6'), undefined);
  assert.equal(hints.destinations.has('d6'), true);
  assert.equal(hints.captures.has('d6'), true);
  assert.equal(hints.captures.has('e6'), false);
});

test('promotion choices share one destination marker and blocked pieces show no targets', () => {
  const game = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');
  const moves = game.moves({ verbose: true });
  assert.equal(moves.filter(move => move.from === 'a7').length, 4);
  assert.deepEqual(getMoveHints(moves, 'a7').destinations, new Set(['a8']));
  assert.equal(getMoveHints(moves, 'b7').destinations.size, 0);
});

test('disabled hints and noninteractive turns reveal no move markers', () => {
  const moves = new Chess().moves({ verbose: true });
  for (const options of [{ enabled: false }, { canPlay: false }]) {
    for (const selected of [null, 'e2']) {
      const hints = getMoveHints(moves, selected, options);
      assert.equal(hints.origins.size + hints.destinations.size + hints.captures.size, 0);
    }
  }
});
