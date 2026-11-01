import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildCharacterTimeline } from '../shared/pieceCharacters.js';
import { DEFAULT_SETTINGS } from '../shared/game.js';
import { advanceAnimationFeed, animationHistoryKeys, appendAnimationMoments, createAnimationMoment, completeAnimationChannel } from '../shared/animationPlayback.js';

export default function usePieceAnimations({ settings, board, history, eliminations = [], context, ready, boardEnabled, playersEnabled, orientation }) {
  const enabled = boardEnabled || playersEnabled;
  const settingsKey = JSON.stringify(settings);
  const keys = animationHistoryKeys(history);
  const historyKey = JSON.stringify(keys);
  const boardKey = JSON.stringify(board);
  const eliminationsKey = JSON.stringify(eliminations);
  const timeline = useMemo(() => {
    try { return buildCharacterTimeline(settings, history, board, eliminations); }
    catch { return buildCharacterTimeline(DEFAULT_SETTINGS, [], board); }
  }, [settingsKey, historyKey, boardKey, eliminationsKey]);
  const feed = useRef(null);
  const sequence = useRef(0);
  const [moments, setMoments] = useState([]);
  const finish = useCallback(id => setMoments(previous => completeAnimationChannel(previous, id, 'players')), []);
  const finishBoard = useCallback(id => setMoments(previous => completeAnimationChannel(previous, id, 'board')), []);
  const animationContext = `${context}:${settingsKey}:${boardEnabled}:${playersEnabled}:${orientation}`;

  useLayoutEffect(() => {
    const next = advanceAnimationFeed(feed.current, { context: animationContext, keys, ready, enabled });
    feed.current = next.state;
    if (next.reset || document.hidden) { setMoments([]); return; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const incoming = timeline.events.filter(event => event.ply > next.from).map(event => createAnimationMoment(event, {
      animationId: ++sequence.current, board: boardEnabled, players: playersEnabled, reduced,
    })).filter(Boolean);
    if (incoming.length) setMoments(active => appendAnimationMoments(active, incoming));
  }, [animationContext, historyKey, ready, enabled]);

  // A newer show can replace a scene before its callback runs. Every effect
  // still has its own expiry, including board movement that finishes earlier.
  useEffect(() => {
    if (!moments.length) return undefined;
    const timer = setTimeout(() => setMoments(active => active.filter(event => event.expiresAt > Date.now())), Math.max(0, Math.min(...moments.map(event => event.expiresAt)) - Date.now()));
    return () => clearTimeout(timer);
  }, [moments]);

  useLayoutEffect(() => {
    const clear = () => setMoments([]);
    document.addEventListener('visibilitychange', clear);
    return () => document.removeEventListener('visibilitychange', clear);
  }, []);

  return { characters: timeline.pieces, moments: enabled ? moments : [], finish, finishBoard };
}
