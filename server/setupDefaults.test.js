import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../shared/game.js';
import { updateSetupDefaults } from '../src/setupDefaults.js';

function setupSession(initial = DEFAULT_SETTINGS) {
  let state = { settings: structuredClone(initial), preferences: {} };
  return change => {
    state = updateSetupDefaults(state.settings, { ...state.settings, ...change }, state.preferences);
    return state.settings;
  };
}

test('first visits recommend Ask first for Classic and Free for the other game modes', () => {
  const change = setupSession();
  assert.equal(change({ mode: 'classic' }).undoMode, 'approval');
  assert.equal(change({ mode: 'endgame' }).undoMode, 'free');
  assert.equal(change({ mode: 'half' }).undoMode, 'free');
  assert.equal(change({ mode: 'classic' }).undoMode, 'approval');
});

test('multiplayer starts with takebacks off and keeps a manual rule across player counts', () => {
  const change = setupSession();
  assert.equal(change({ mode: 'party', playerCount: 3 }).undoMode, 'off');
  change({ undoMode: 'free', undoLimit: 9 });
  const four = change({ playerCount: 4 });
  assert.equal(four.undoMode, 'free');
  assert.equal(four.undoLimit, 9);
  assert.equal(change({ mode: 'classic' }).undoMode, 'approval');
  assert.equal(change({ mode: 'party' }).undoMode, 'free');
});

test('revisiting a mode restores its manual takeback choice', () => {
  const change = setupSession();
  change({ undoMode: 'off' });
  change({ mode: 'endgame' });
  change({ undoMode: 'approval' });
  assert.equal(change({ mode: 'half' }).undoMode, 'free');
  assert.equal(change({ mode: 'classic' }).undoMode, 'off');
  assert.equal(change({ mode: 'endgame' }).undoMode, 'approval');
  assert.equal(change({ mode: 'half' }).undoMode, 'free');
});

test('custom positions share the Endgames preference without resetting edits', () => {
  const change = setupSession();
  assert.equal(change({ mode: 'endgame', endgameId: 'custom' }).undoMode, 'free');
  change({ undoMode: 'off', customFen: 'a draft position' });
  assert.equal(change({ endgameId: 'lucena' }).undoMode, 'off');
  assert.equal(change({ mode: 'custom' }).undoMode, 'off');
  change({ mode: 'half' });
  assert.equal(change({ mode: 'endgame', endgameId: 'custom' }).undoMode, 'off');
});

test('mode recommendations preserve custom and unlimited allowances and other settings', () => {
  const change = setupSession();
  assert.equal(change({ mode: 'half' }).undoLimit, 3);
  change({ undoLimit: 42, timeControl: 'rapid', halfShape: '4x8' });
  const endgame = change({ mode: 'endgame' });
  assert.equal(endgame.undoLimit, 42);
  assert.equal(endgame.timeControl, 'rapid');
  assert.equal(endgame.halfShape, '4x8');
  change({ undoLimit: null });
  assert.equal(change({ mode: 'classic' }).undoLimit, null);
});

test('an existing mode preference is kept and input settings are never mutated', () => {
  const initial = Object.freeze({ ...DEFAULT_SETTINGS, mode: 'half', undoMode: 'off' });
  const preferences = Object.freeze({});
  const next = Object.freeze({ ...initial, mode: 'endgame' });
  const result = updateSetupDefaults(initial, next, preferences);
  assert.equal(initial.undoMode, 'off');
  assert.equal(next.undoMode, 'off');
  assert.deepEqual(preferences, {});
  assert.equal(result.settings.undoMode, 'free');
  const restored = updateSetupDefaults(result.settings, { ...result.settings, mode: 'half' }, result.preferences);
  assert.equal(restored.settings.undoMode, 'off');
});
