import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceAnimationFeed, animationHistoryKeys, appendAnimationMoments, createAnimationMoment, completeAnimationChannel } from '../shared/animationPlayback.js';
import { BOARD_CAPTURE_MS, PLAYER_SHOW_CAPTURE_MS, PLAYER_SHOW_REDUCED_MS } from '../shared/animationTimings.js';

const snapshot = (keys, extra = {}) => ({ context: 'room:classic:board:white', keys, ready: true, enabled: true, ...extra });
test('live move animates once despite repeated clock snapshots and acknowledgement', () => {
  const baseline = advanceAnimationFeed(null, snapshot([]));
  assert.equal(baseline.reset, true);
  const move = advanceAnimationFeed(baseline.state, snapshot(['e2-e4']));
  assert.equal(move.reset, false); assert.equal(move.from, 0);
  const repeat = advanceAnimationFeed(move.state, snapshot(['e2-e4']));
  assert.equal(repeat.from, 1);
  assert.notEqual(animationHistoryKeys([{color:'w',piece:'p',from:'e7',to:'e8',promotion:'q'}])[0], animationHistoryKeys([{color:'w',piece:'p',from:'e7',to:'e8',promotion:'n'}])[0]);
});
test('reload, reconnect, off/on, style change, and undo never replay old moves', () => {
  const base = snapshot(['a','b']);
  for (const previous of [null, snapshot(['a'], {ready:false}), snapshot(['a'], {enabled:false}), snapshot(['a'], {context:'other'})]) {
    assert.equal(advanceAnimationFeed(previous, base).reset, true);
    assert.equal(advanceAnimationFeed(previous, base).from, 2);
  }
  const undo = advanceAnimationFeed(base, snapshot(['a']));
  assert.equal(undo.reset, true);
  const replay = advanceAnimationFeed(undo.state, base);
  assert.equal(replay.reset, false); assert.equal(replay.from, 1);
  assert.equal(advanceAnimationFeed(base, snapshot(['a','new-branch'])).reset, true);
});
test('quick independent moves overlap, but a capture clears the victim’s older motion', () => {
  const event = (id, victim) => ({actor:{id}, victim:victim?{id:victim}:null,motions:[{character:{id}}]});
  const first = event('white-pawn'), second = event('black-pawn');
  assert.deepEqual(appendAnimationMoments([first], [second]), [first, second]);
  const capture = event('white-bishop','black-pawn');
  assert.deepEqual(appendAnimationMoments([first,second], [capture]), [first,capture]);
  assert.deepEqual(appendAnimationMoments([], [first,second,capture]), [first,capture]);
});

test('a shorter new show permanently supersedes an older capture instead of replaying it after completion', () => {
  const capture = { animationId: 1, actor: { id: 'white-rook' }, victim: { id: 'black-pawn' }, motions: [{ character: { id: 'white-rook' } }], hasShow: true, expiresAt: 2860 };
  const quiet = { animationId: 2, actor: { id: 'black-knight' }, victim: null, motions: [{ character: { id: 'black-knight' } }], hasShow: true, expiresAt: 2260 };
  const latestShow = events => events.findLast(event => event.hasShow && !event.showSuperseded);
  const playing = appendAnimationMoments([capture], [quiet]);
  assert.equal(latestShow(playing).animationId, 2);
  assert.equal(playing[0].showSuperseded, true);
  assert.equal(playing[0].motions, capture.motions, 'superseding a show must preserve its independent board animation');
  assert.equal(capture.showSuperseded, undefined, 'the previous state is not mutated');
  const afterQuietFinishes = playing.filter(event => event.animationId !== 2);
  assert.equal(afterQuietFinishes[0].expiresAt, 2860, 'the older capture can still be alive in the effect queue');
  assert.equal(latestShow(afterQuietFinishes), undefined, 'an older scene must never restart');
  assert.deepEqual(appendAnimationMoments([], [capture, quiet]), playing, 'batched snapshots have the same latest-show behavior');
});

test('a board-only move does not cancel the currently playing capture scene', () => {
  const capture = { animationId: 1, actor: { id: 'white-rook' }, victim: { id: 'black-pawn' }, motions: [{ character: { id: 'white-rook' } }], hasShow: true };
  const quiet = { animationId: 2, actor: { id: 'black-knight' }, victim: null, motions: [{ character: { id: 'black-knight' } }], hasShow: false };
  const playing = appendAnimationMoments([capture], [quiet]);
  assert.equal(playing.findLast(event => event.hasShow && !event.showSuperseded).animationId, 1);
  assert.equal(playing[0].showSuperseded, undefined);
  assert.equal(playing.length, 2);
});

test('capture respects all four independent location combinations, including both off', () => {
  const capture = { actor: { id: 'w:e2' }, victim: { id: 'b:d7' }, motions: [{ character: { id: 'w:e2' } }] };
  for (const board of [false, true]) for (const players of [false, true]) {
    const event = createAnimationMoment(capture, { animationId: 1, board, players, now: 100 });
    if (!board && !players) { assert.equal(event, null); continue; }
    assert.equal(event.hasBoard, board);
    assert.equal(event.hasShow, players, 'a capture must never implicitly enable player-side animation');
    assert.equal(event.actor, capture.actor);
    assert.equal(event.victim, capture.victim);
    assert.ok(event.expiresAt > 100 + (players ? PLAYER_SHOW_CAPTURE_MS : BOARD_CAPTURE_MS));
  }
});

test('finishing either location leaves the other location playing until it finishes', () => {
  const event = createAnimationMoment({ victim: { id: 'opponent' } }, { animationId: 7, board: true, players: true, now: 0 });
  for (const first of ['board', 'players']) {
    const next = completeAnimationChannel([event], 7, first);
    assert.equal(next.length, 1);
    assert.equal(next[0][first === 'board' ? 'boardDone' : 'showDone'], true);
    assert.equal(next[0][first === 'board' ? 'showDone' : 'boardDone'], undefined);
    assert.deepEqual(completeAnimationChannel(next, 7, first === 'board' ? 'players' : 'board'), []);
  }
  assert.equal(event.boardDone, undefined);
  assert.equal(event.showDone, undefined);
});

test('superseded shows cannot interrupt board fights, and reduced motion has a short expiry', () => {
  const first = createAnimationMoment({ actor: { id: 'rook' }, victim: { id: 'pawn' }, motions: [{ character: { id: 'rook' } }] }, { animationId: 1, board: true, players: true, reduced: true, now: 100 });
  const second = createAnimationMoment({ actor: { id: 'knight' }, motions: [{ character: { id: 'knight' } }] }, { animationId: 2, board: true, players: true, reduced: true, now: 101 });
  assert.ok(first.expiresAt <= 100 + PLAYER_SHOW_REDUCED_MS + 100);
  const next = appendAnimationMoments([first], [second]);
  assert.equal(next[0].showSuperseded, true);
  assert.equal(next[0].boardDone, undefined);
  assert.equal(completeAnimationChannel(next, 1, 'board').length, 1);
  assert.equal(completeAnimationChannel(next, 1, 'board')[0].animationId, 2);
});
