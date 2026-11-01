import { BOARD_MOVE_MS, BOARD_CAPTURE_MS, BOARD_REDUCED_MS, PLAYER_SHOW_MOVE_MS, PLAYER_SHOW_CAPTURE_MS, PLAYER_SHOW_REDUCED_MS } from './animationTimings.js';

/** One accepted move can play independently in either or both locations. */
export function createAnimationMoment(event, { animationId, board, players, reduced = false, now = Date.now() }) {
  if (!board && !players) return null;
  const boardDuration = board ? reduced ? BOARD_REDUCED_MS : event.victim ? BOARD_CAPTURE_MS : BOARD_MOVE_MS : 0;
  const showDuration = players ? reduced ? PLAYER_SHOW_REDUCED_MS : event.victim ? PLAYER_SHOW_CAPTURE_MS : PLAYER_SHOW_MOVE_MS : 0;
  return { ...event, animationId, hasBoard: board, hasShow: players, expiresAt: now + Math.max(boardDuration, showDuration) + 60 };
}

/** Finishing one location must never dismiss the other location's animation. */
export function completeAnimationChannel(events, id, channel) {
  if (channel !== 'board' && channel !== 'players') return events;
  return events.map(event => event.animationId === id ? { ...event, [channel === 'board' ? 'boardDone' : 'showDone']: true } : event)
    .filter(event => !((!event.hasBoard || event.boardDone) && (!event.hasShow || event.showDone || event.showSuperseded)));
}

/** Public history, not clocks or transport acknowledgements, drives decoration. */
export function animationHistoryKeys(history = []) {
  return history.map(move => JSON.stringify([move.color, move.piece, move.from, move.to, move.promotion || '', move.captured || '', move.flags || '']));
}

/** A first snapshot, reconnect, undo, or replaced history is a new baseline. */
export function advanceAnimationFeed(previous, next) {
  const state = { ...next, keys: [...next.keys] };
  const prefix = previous && previous.keys.length <= next.keys.length
    && previous.keys.every((key, index) => key === next.keys[index]);
  const reset = !previous || previous.context !== next.context || !previous.ready || !next.ready
    || !previous.enabled || !next.enabled || !prefix;
  return { state, reset, from: reset ? next.keys.length : previous.keys.length };
}

/**
 * New moves supersede overlapping board motion. A newer player-side show also
 * permanently retires older shows, while their unrelated board motions finish.
 */
export function appendAnimationMoments(active, incoming) {
  return incoming.reduce((playing, next) => {
    const touched = new Set([next.actor?.id, next.victim?.id, ...next.motions.map(motion => motion.character.id)].filter(Boolean));
    const remaining = playing
      .filter(event => ![event.actor?.id, event.victim?.id, ...event.motions.map(motion => motion.character.id)].some(id => touched.has(id)))
      .map(event => next.hasShow && event.hasShow && !event.showSuperseded ? { ...event, showSuperseded: true } : event);
    return [...remaining, next].slice(-8);
  }, active);
}
