import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAnimationPreferences, choosePieceStyle, setAnimationChannel } from '../shared/animationPreferences.js';

const preference = (pieceStyle, board, players) => ({ pieceStyle, board, players });
const effective = value => ({ ...value, board: value.pieceStyle === 'cartoon' && value.board });

test('new devices default to cartoon artwork with both animation channels on', () => {
  assert.deepEqual(normalizeAnimationPreferences(), preference('cartoon', true, true));
  assert.deepEqual(normalizeAnimationPreferences({}), preference('cartoon', true, true));
  for (const missing of ['', null, undefined]) {
    assert.deepEqual(normalizeAnimationPreferences({ pieceStyle: missing, board: missing, players: missing, enabled: missing, placement: missing }), preference('cartoon', true, true));
  }
});

test('the fresh defaults never replace an explicitly disabled stored channel', () => {
  assert.deepEqual(normalizeAnimationPreferences({ board: 'off' }), preference('cartoon', false, true));
  assert.deepEqual(normalizeAnimationPreferences({ players: 'off' }), preference('cartoon', true, false));
  assert.deepEqual(normalizeAnimationPreferences({ pieceStyle: 'classic', players: 'off' }), preference('classic', true, false));
  assert.deepEqual(normalizeAnimationPreferences({ board: 'off', players: 'off', enabled: '', placement: '' }), preference('cartoon', false, false));
});

test('all six effective artwork/channel combinations survive storage normalization', () => {
  const combinations = [
    preference('cartoon', false, false), preference('cartoon', true, false),
    preference('cartoon', false, true), preference('cartoon', true, true),
    preference('classic', false, false), preference('classic', false, true),
  ];
  for (const expected of combinations) {
    assert.deepEqual(normalizeAnimationPreferences(expected), expected);
    assert.deepEqual(normalizeAnimationPreferences({ ...expected, board: expected.board ? 'on' : 'off', players: expected.players ? 'on' : 'off' }), expected);
  }
});

test('the two cartoon animation switches are independent and never change artwork', () => {
  let current = preference('cartoon', false, false);
  current = setAnimationChannel(current, 'board', true);
  assert.deepEqual(current, preference('cartoon', true, false));
  current = setAnimationChannel(current, 'players', true);
  assert.deepEqual(current, preference('cartoon', true, true));
  current = setAnimationChannel(current, 'board', 'off');
  assert.deepEqual(current, preference('cartoon', false, true));
  current = setAnimationChannel(current, 'players', 'off');
  assert.deepEqual(current, preference('cartoon', false, false));
});

test('Classic hides board motion while remembering it and never enables the player-side show implicitly', () => {
  for (const board of [false, true]) for (const players of [false, true]) {
    const cartoon = preference('cartoon', board, players);
    const classic = choosePieceStyle(cartoon, 'classic');
    assert.deepEqual(classic, preference('classic', board, players));
    assert.deepEqual(effective(classic), preference('classic', false, players));
    assert.deepEqual(setAnimationChannel(classic, 'board', !board), classic);
    assert.deepEqual(choosePieceStyle(classic, 'cartoon'), cartoon);
    const changedShow = setAnimationChannel(classic, 'players', !players);
    assert.deepEqual(changedShow, preference('classic', board, !players));
    assert.deepEqual(choosePieceStyle(changedShow, 'cartoon'), preference('cartoon', board, !players));
  }
});

test('the original two-key settings migrate without changing the previously visible artwork', () => {
  const cases = [
    [{ enabled: 'off', placement: 'board' }, preference('classic', false, false)],
    [{ enabled: false, placement: 'edge' }, preference('classic', false, false)],
    [{ enabled: 'on', placement: 'edge' }, preference('classic', false, true)],
    [{ enabled: true, placement: 'board' }, preference('cartoon', true, false)],
    [{ enabled: 'on' }, preference('cartoon', true, false)],
    [{ placement: 'edge' }, preference('classic', false, true)],
  ];
  for (const [raw, expected] of cases) {
    assert.deepEqual(normalizeAnimationPreferences(raw), expected);
    assert.deepEqual(normalizeAnimationPreferences({ ...raw, pieceStyle: null }), expected);
    assert.deepEqual(normalizeAnimationPreferences({ ...raw, pieceStyle: '' }), expected);
  }
});

test('the previous independent artwork plus exclusive animation selection migrates to the matching channels', () => {
  const cases = [
    [{ pieceStyle: 'cartoon', enabled: false, placement: 'board' }, preference('cartoon', false, false)],
    [{ pieceStyle: 'cartoon', enabled: true, placement: 'board' }, preference('cartoon', true, false)],
    [{ pieceStyle: 'cartoon', enabled: true, placement: 'edge' }, preference('cartoon', false, true)],
    [{ pieceStyle: 'classic', enabled: false, placement: 'edge' }, preference('classic', false, false)],
    [{ pieceStyle: 'classic', enabled: true, placement: 'edge' }, preference('classic', false, true)],
  ];
  for (const [raw, expected] of cases) assert.deepEqual(normalizeAnimationPreferences(raw), expected);
});

test('new per-channel values take precedence over legacy keys independently and idempotently', () => {
  const raw = { pieceStyle: 'cartoon', board: 'on', players: 'on', enabled: 'off', placement: 'board' };
  assert.deepEqual(normalizeAnimationPreferences(raw), preference('cartoon', true, true));
  assert.deepEqual(normalizeAnimationPreferences({ ...raw, board: 'off', players: 'off', enabled: 'on' }), preference('cartoon', false, false));
  assert.deepEqual(normalizeAnimationPreferences({ pieceStyle: 'cartoon', board: false, enabled: 'on', placement: 'edge' }), preference('cartoon', false, true));
  assert.deepEqual(normalizeAnimationPreferences({ pieceStyle: 'cartoon', players: true, enabled: 'on', placement: 'board' }), preference('cartoon', true, true));
  const classic = normalizeAnimationPreferences({ pieceStyle: 'classic', board: 'on', players: 'off', enabled: 'on', placement: 'edge' });
  assert.deepEqual(classic, preference('classic', true, false));
  assert.deepEqual(normalizeAnimationPreferences(classic), classic);
});

test('unknown stored values and invalid channel actions safely preserve preferences without mutation', () => {
  for (const raw of [null, undefined, [], 'cartoon', 12, { pieceStyle: 'unknown', board: 'unknown', players: 'unknown' }]) {
    assert.deepEqual(normalizeAnimationPreferences(raw), preference('cartoon', true, true));
  }
  const current = Object.freeze(preference('cartoon', false, true));
  assert.deepEqual(choosePieceStyle(current, 'unknown'), current);
  assert.deepEqual(setAnimationChannel(current, 'unknown', true), current);
  assert.deepEqual(setAnimationChannel(current, 'board', 'false'), current);
  assert.deepEqual(setAnimationChannel(current, 'players', null), current);
  choosePieceStyle(current, 'classic');
  setAnimationChannel(current, 'board', true);
  assert.deepEqual(current, preference('cartoon', false, true));
});
