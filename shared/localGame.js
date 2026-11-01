import { createPartySession, restorePartySession, serializePartySession, partySnapshot, partyClocks, checkPartyTimeout, applyPartyAction } from './partySession.js';
import { createGame, getGameOutcome, normalizeSettings, TIME_CONTROLS } from './game.js';

const other = (color) => color === 'w' ? 'b' : 'w';

export function localClocks(session, now = Date.now()) {
  if (session.settings.mode === 'party') return partyClocks(session, now);
  const clocks = { ...session.clocks };
  if (session.status === 'playing' && clocks.w !== null && session.turnStartedAt !== null) {
    const color = session.undoRequest?.color ?? session.game.turn();
    clocks[color] = Math.max(0, clocks[color] - Math.max(0, now - session.turnStartedAt));
  }
  return clocks;
}

function finish(session, outcome) {
  session.status = 'finished';
  session.result = outcome;
  session.undoRequest = null;
  session.drawOffer = null;
  session.turnStartedAt = null;
}

export function checkLocalTimeout(session, now = Date.now()) {
  if (session?.settings.mode === 'party') return checkPartyTimeout(session, now);
  if (!session || session.status !== 'playing' || session.clocks.w === null) return false;
  const clocks = localClocks(session, now);
  const active = session.undoRequest?.color ?? session.game.turn();
  if (clocks[active] > 0) return false;
  const winner = other(active);
  const canWin = session.game.board().flat().some((piece) => piece?.color === winner && (session.settings.mode === 'half' || piece.type !== 'k'));
  session.clocks = clocks;
  finish(session, { winner: canWin ? winner : null, reason: canWin ? 'timeout' : 'timeout-insufficient-material' });
  return true;
}

export function createLocalSession(rawSettings, names = {}, now = Date.now()) {
  if (rawSettings?.mode === 'party') return createPartySession(rawSettings, names, now);
  const settings = normalizeSettings(rawSettings);
  const game = createGame(settings);
  const result = getGameOutcome(game, settings);
  if (result) throw new Error('This position has already ended. Choose a position that can still be played.');
  const initial = TIME_CONTROLS[settings.timeControl].initial;
  return {
    settings, game,
    players: { w: { name: names.w?.trim() || 'White player', connected: true }, b: { name: names.b?.trim() || 'Black player', connected: true } },
    ready: { w: true, b: true }, status: 'playing', result: null,
    clocks: { w: initial, b: initial }, clockHistory: [], timeControl: settings.timeControl, turnStartedAt: now,
    undoUsed: { w: 0, b: 0 }, undoRequest: null, drawOffer: null, version: 0,
  };
}

export function serializeLocalSession(session) {
  if (!session) return null;
  if (session.settings.mode === 'party') return serializePartySession(session);
  return { ...session, game: undefined, history: session.game.history({ verbose: true }).map(({ from, to, promotion }) => ({ from, to, ...(promotion ? { promotion } : {}) })) };
}

export function restoreLocalSession(saved, now = Date.now()) {
  if (saved?.settings?.mode === 'party') return restorePartySession(saved, now);
  if (!saved || typeof saved !== 'object' || !Array.isArray(saved.history) || saved.history.length > 3000) throw new Error('Invalid saved game.');
  const settings = normalizeSettings(saved.settings);
  const game = createGame(settings);
  for (const move of saved.history) game.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
  if (!['playing', 'finished'].includes(saved.status)) throw new Error('Invalid saved game.');
  const initial = TIME_CONTROLS[settings.timeControl].initial;
  for (const color of ['w', 'b']) {
    if (initial === null ? saved.clocks?.[color] !== null : !Number.isFinite(saved.clocks?.[color]) || saved.clocks[color] < 0) throw new Error('Invalid saved clock.');
  }
  if (saved.status === 'playing' && !Number.isFinite(saved.turnStartedAt)) throw new Error('Invalid saved clock.');
  const session = {
    ...saved, settings, game, timeControl: settings.timeControl,
    clockHistory: Array.isArray(saved.clockHistory) ? saved.clockHistory : [],
    version: Number.isSafeInteger(saved.version) ? saved.version : saved.history.length,
    undoUsed: { w: Math.max(0, saved.undoUsed?.w ?? 0), b: Math.max(0, saved.undoUsed?.b ?? 0) },
  };
  if (session.undoRequest && (!['w', 'b'].includes(session.undoRequest.color) || !Number.isSafeInteger(session.undoRequest.plies) || session.undoRequest.plies < 1 || session.undoRequest.plies > game.history().length)) throw new Error('Invalid saved takeback.');
  checkLocalTimeout(session, now);
  return session;
}

export function localSnapshot(session, now = Date.now()) {
  if (!session) return null;
  if (session.settings.mode === 'party') return partySnapshot(session, now);
  const { game, clockHistory, ...state } = session;
  const history = game.history({ verbose: true });
  return {
    ...state, colors: ['w', 'b'], code: 'LOCAL', board: game.board(), fen: game.fen(), turn: game.turn(), history,
    legalMoves: session.status === 'playing' ? game.moves({ verbose: true }) : [],
    lastMove: history.at(-1) ?? null, inCheck: game.isCheck(), clocks: localClocks(session, now), serverTime: now,
  };
}

/** Same rules as the multiplayer service, with an explicit actor for a shared screen. */
export function applyLocalAction(session, event, payload = {}, now = Date.now()) {
  if (session.settings.mode === 'party') return applyPartyAction(session, event, payload, now);
  checkLocalTimeout(session, now);
  const color = payload.color ?? session.game.turn();
  if (!['w', 'b'].includes(color)) throw new Error('Choose White or Black.');
  const requireActive = () => {
    if (session.status !== 'playing') throw new Error('The game has ended.');
  };
  const requireCurrentBoard = () => {
    if (payload.expectedPly !== session.game.history().length || payload.expectedVersion !== session.version) throw new Error('The board has changed. Please select your move again.');
  };
  const undo = (requester, plies) => {
    session.clocks = localClocks(session, now);
    for (let index = 0; index < plies; index++) {
      const move = session.game.undo();
      const previous = session.clockHistory.pop();
      for (const side of ['w', 'b']) {
        if (session.clocks[side] === null) continue;
        if (previous && Number.isFinite(previous[side])) session.clocks[side] = Math.min(session.clocks[side], previous[side]);
        else if (move.color === side) session.clocks[side] = Math.max(0, session.clocks[side] - TIME_CONTROLS[session.timeControl].increment);
      }
    }
    session.undoUsed[requester] += plies;
    session.undoRequest = null;
    session.drawOffer = null;
    session.turnStartedAt = now;
    session.version++;
    checkLocalTimeout(session, now);
  };

  if (event === 'game:move') {
    requireActive();
    requireCurrentBoard();
    if (session.undoRequest) throw new Error('Respond to the pending takeback request first.');
    if (color !== session.game.turn()) throw new Error('It is your opponent’s turn.');
    const clocks = localClocks(session, now);
    const movedColor = session.game.turn();
    session.game.move({ from: payload.from, to: payload.to, ...(payload.promotion ? { promotion: payload.promotion } : {}) });
    session.clockHistory.push({ ...clocks });
    session.clocks = clocks;
    if (session.clocks[movedColor] !== null) session.clocks[movedColor] += TIME_CONTROLS[session.timeControl].increment;
    session.turnStartedAt = now;
    if (session.drawOffer && session.drawOffer !== color) session.drawOffer = null;
    session.version++;
    const outcome = getGameOutcome(session.game, session.settings);
    if (outcome) finish(session, outcome);
  } else if (event === 'game:undo') {
    requireActive();
    requireCurrentBoard();
    if (session.settings.undoMode === 'off' || session.undoRequest) throw new Error('Takebacks are not available right now.');
    const { plies } = payload;
    if (!Number.isSafeInteger(plies) || plies < 1 || plies > session.game.history().length) throw new Error('Choose a valid number of plies to take back.');
    if (session.settings.undoLimit !== null && session.undoUsed[color] + plies > session.settings.undoLimit) throw new Error('You do not have enough takeback allowance left for this game.');
    if (session.settings.undoMode === 'free') undo(color, plies);
    else {
      session.clocks = localClocks(session, now);
      session.undoRequest = { color, plies, requestedAt: now, version: session.version };
      session.turnStartedAt = now;
      session.drawOffer = null;
    }
  } else if (event === 'game:respond-undo') {
    requireActive();
    if (!session.undoRequest || session.undoRequest.color !== other(color)) throw new Error('The opponent must respond to this takeback request.');
    if (typeof payload.accept !== 'boolean') throw new Error('Choose whether to accept the takeback.');
    if (payload.accept) undo(session.undoRequest.color, session.undoRequest.plies);
    else {
      session.clocks = localClocks(session, now);
      session.undoRequest = null;
      session.turnStartedAt = now;
    }
  } else if (event === 'game:resign') {
    requireActive();
    session.clocks = localClocks(session, now);
    finish(session, { winner: other(color), reason: 'resignation' });
  } else if (event === 'game:offer-draw') {
    requireActive();
    if (session.drawOffer && session.drawOffer !== color) throw new Error('Your opponent has already offered a draw.');
    session.drawOffer = color;
  } else if (event === 'game:respond-draw') {
    requireActive();
    if (session.drawOffer !== other(color)) throw new Error('The opponent must respond to this draw offer.');
    if (typeof payload.accept !== 'boolean') throw new Error('Choose whether to accept the draw.');
    if (payload.accept) {
      session.clocks = localClocks(session, now);
      finish(session, { winner: null, reason: 'agreement' });
    } else session.drawOffer = null;
  } else if (event !== 'room:sync') throw new Error('This game action is not supported.');
  return { ok: true, room: localSnapshot(session, now) };
}
