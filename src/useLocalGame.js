import { useCallback, useEffect, useRef, useState } from 'react';
import { createLocalSession, restoreLocalSession, serializeLocalSession, localSnapshot, checkLocalTimeout, applyLocalAction } from '../shared/localGame.js';

const STORAGE_KEY = 'between:local:v1';

function save(session) {
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeLocalSession(session)));
  } catch { /* Play remains available when the browser blocks storage. */ }
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? restoreLocalSession(saved) : null;
  } catch { return null; }
}

export default function useLocalGame(onError) {
  const session = useRef(undefined);
  if (session.current === undefined) session.current = restore();
  const [room, setRoom] = useState(() => localSnapshot(session.current));
  const refresh = useCallback(() => { save(session.current); setRoom(localSnapshot(session.current)); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = session.current;
      if (!current || current.status !== 'playing' || Object.values(current.clocks).every((clock) => clock === null)) return;
      if (checkLocalTimeout(current)) save(current);
      setRoom(localSnapshot(current));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const start = useCallback((settings, names) => {
    try {
      session.current = createLocalSession(settings, names);
      refresh();
      return true;
    } catch (error) { onError(error.message); return false; }
  }, [onError, refresh]);

  const request = useCallback(async (event, payload = {}) => {
    if (!session.current) return null;
    try {
      const response = applyLocalAction(session.current, event, payload);
      refresh();
      return response;
    } catch (error) {
      refresh();
      onError(error.message);
      return null;
    }
  }, [onError, refresh]);

  const leave = useCallback(() => { session.current = null; refresh(); }, [refresh]);
  return { room, start, request, leave };
}
