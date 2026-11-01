import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const getRoomCode = () => new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '';
export function readStorage(key, fallback = '', session = false) {
  try { return (session ? sessionStorage : localStorage).getItem(key) || fallback; } catch { return fallback; }
}
export function writeStorage(key, value, session = false) {
  try { (session ? sessionStorage : localStorage).setItem(key, value); } catch { /* Storage can be disabled in private browsers. */ }
}
export function useGame(onError) {
  const socket = useRef(null);
  const active = useRef(null);
  const [room, setRoom] = useState(null);
  const [player, setPlayer] = useState(null);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [busy, setBusy] = useState(false);
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const accept = useCallback((response) => {
    const { room: nextRoom, player: nextPlayer } = response;
    active.current = { code: nextRoom.code, token: nextPlayer.token };
    writeStorage(`chessclub:${nextRoom.code}`, nextPlayer.token, true);
    setPlayer(nextPlayer);
    setRoom(nextRoom);
    setSynced(true);
    const url = new URL(window.location.href);
    url.searchParams.set('room', nextRoom.code);
    window.history.replaceState(null, '', url);
  }, []);
  useEffect(() => {
    const client = io({ autoConnect: false });
    socket.current = client;
    client.on('connect', () => {
      setConnected(true);
      const code = active.current?.code || getRoomCode();
      const token = active.current?.token || readStorage(`chessclub:${code}`, '', true);
      if (code && token) {
        client.timeout(7000).emit('room:resume', { code, token }, (err, response) => {
          if (err || !response?.ok) {
            setSynced(false);
            errorRef.current(response?.error || 'Could not reconnect to the game. Try reconnecting.');
          } else accept(response);
        });
      } else setSynced(true);
    });
    client.on('disconnect', () => { setConnected(false); setSynced(false); });
    client.on('connect_error', () => { setConnected(false); setSynced(false); });
    client.on('room:state', (nextRoom) => {
      if (active.current?.code === nextRoom.code) setRoom(nextRoom);
    });
    client.on('room:replaced', () => {
      setSynced(false);
      errorRef.current('Your seat is active in another tab. Select Reconnect here to take it back.');
    });
    client.connect();
    return () => { client.removeAllListeners(); client.disconnect(); };
  }, [accept]);
  const request = useCallback(async (event, payload) => {
    if (!socket.current?.connected) {
      errorRef.current('Reconnecting to the game service. Please try again shortly.');
      return null;
    }
    setBusy(true);
    try {
      const response = await socket.current.timeout(7000).emitWithAck(event, payload);
      if (!response?.ok) throw new Error(response?.error || 'That action could not be completed.');
      if (response.player) accept(response);
      else if (response.room) setRoom(response.room);
      return response;
    } catch (error) {
      errorRef.current(error.message === 'operation has timed out' ? 'The connection timed out. Please try again.' : error.message);
      return null;
    } finally { setBusy(false); }
  }, [accept]);
  const leave = useCallback(async () => {
    if (active.current) await request('room:leave', { code: active.current.code });
    active.current = null;
    setRoom(null);
    setPlayer(null);
    setSynced(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url);
  }, [request]);
  const reconnect = useCallback(() => { socket.current?.disconnect().connect(); }, []);
  return { room, player, connected, synced, busy, request, leave, reconnect };
}
