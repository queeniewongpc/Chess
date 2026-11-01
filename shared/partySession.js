import { createGame, getGameOutcome, getPlayerColors, normalizeSettings, TIME_CONTROLS } from './game.js';
import { isPartyTeams } from './partyTeams.js';

const engine = (session) => session.game ?? session.chess;
const mapColors = (settings, value) => Object.fromEntries(getPlayerColors(settings).map((color) => [color, typeof value === 'function' ? value(color) : value]));
const playerName = (value, color) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim().replace(/\s+/g, ' ').slice(0, 28) : '') || `${color[0].toUpperCase()}${color.slice(1)} player`;

export function createPartySession(rawSettings, names = {}, now = Date.now(), waiting = false) {
  const settings = normalizeSettings(rawSettings);
  if (settings.mode !== 'party') throw new Error('Choose a three- or four-player game.');
  const game = createGame(settings);
  return {
    settings, game, players: mapColors(settings, (color) => ({ name: playerName(names[color], color), connected: true })),
    ready: mapColors(settings, !waiting), status: waiting ? 'waiting' : 'playing', result: null,
    clocks: mapColors(settings, TIME_CONTROLS[settings.timeControl].initial), clockHistory: [],
    timeControl: settings.timeControl, turnStartedAt: waiting ? null : now,
    undoUsed: mapColors(settings, 0), undoRequest: null, undoBoundary: 0,
    drawOffer: null, drawVotes: [], version: 0,
  };
}

export function partyClocks(session, now = Date.now()) {
  const clocks = { ...session.clocks };
  if (session.status === 'playing' && session.turnStartedAt !== null) {
    const color = session.undoRequest?.color ?? engine(session).turn();
    if (clocks[color] !== null) clocks[color] = Math.max(0, clocks[color] - Math.max(0, now - session.turnStartedAt));
  }
  return clocks;
}

function finish(session, result) {
  session.status = 'finished';
  session.result = result;
  session.undoRequest = null;
  session.drawOffer = null;
  session.drawVotes = [];
  session.turnStartedAt = null;
}

function settleOutcome(session) {
  const result = getGameOutcome(engine(session), session.settings);
  if (result) finish(session, result);
}

function eliminate(session, color, reason, now) {
  engine(session).eliminate(color, reason);
  session.undoBoundary = engine(session).history().length;
  session.undoRequest = null;
  session.drawOffer = null;
  session.drawVotes = [];
  session.turnStartedAt = now;
  session.version++;
  settleOutcome(session);
}

export function checkPartyTimeout(session, now = Date.now()) {
  if (!session || session.status !== 'playing') return false;
  const active = session.undoRequest?.color ?? engine(session).turn();
  if (session.clocks[active] === null) return false;
  const clocks = partyClocks(session, now);
  if (clocks[active] > 0) return false;
  session.clocks = clocks;
  eliminate(session, active, 'timeout', now);
  return true;
}

export function partySnapshot(session, now = Date.now()) {
  const game = engine(session);
  const colors = getPlayerColors(session.settings);
  const history = game.history({ verbose: true });
  return {
    code: session.code ?? 'LOCAL', settings: session.settings, ready: session.ready, version: session.version,
    colors, activeColors: game.activeColors(), eliminations: game.eliminations(),
    undoUsed: session.undoUsed, undoRequest: session.undoRequest, undoBoundary: session.undoBoundary ?? 0,
    fen: game.fen(), board: game.board(), history,
    legalMoves: session.status === 'playing' ? game.moves({ verbose: true }) : [],
    players: mapColors(session.settings, (color) => session.players[color] ? {
      name: session.players[color].name,
      connected: Object.hasOwn(session.players[color], 'socketId') ? Boolean(session.players[color].socketId) : true,
    } : null),
    status: session.status, turn: game.turn(), clocks: partyClocks(session, now),
    serverTime: now, timeControl: session.timeControl, result: session.result,
    drawOffer: session.drawOffer, drawVotes: session.drawVotes ?? [],
    rematchVotes: [...(session.rematchVotes ?? [])], lastMove: history.at(-1) ?? null, inCheck: game.isCheck(),
  };
}

export function serializePartySession(session) {
  const { game, chess, ...state } = session;
  return { ...state, partyState: engine(session).exportState(), history: engine(session).history({ verbose: true }), rematchVotes: [...(session.rematchVotes ?? [])] };
}

export function restorePartySession(saved, now = Date.now()) {
  const settings = normalizeSettings(saved.settings);
  if (settings.mode !== 'party' || !['waiting', 'playing', 'finished'].includes(saved.status)) throw new Error('Invalid saved multiplayer game.');
  const game = createGame(settings);
  game.restoreState(saved.partyState);
  const colors = getPlayerColors(settings);
  const initial = TIME_CONTROLS[settings.timeControl].initial;
  for (const color of colors) {
    if (initial === null ? saved.clocks?.[color] !== null : !Number.isFinite(saved.clocks?.[color]) || saved.clocks[color] < 0) throw new Error('Invalid saved clock.');
    if (!Number.isSafeInteger(saved.undoUsed?.[color]) || saved.undoUsed[color] < 0) throw new Error('Invalid saved takeback allowance.');
  }
  if (!Number.isSafeInteger(saved.version) || saved.version < 0 || (saved.status === 'playing' && !Number.isFinite(saved.turnStartedAt))) throw new Error('Invalid saved game version or clock.');
  if (saved.status === 'waiting' && (game.history().length || game.eliminations().length)) throw new Error('Invalid waiting-room history.');
  if (isPartyTeams(settings)) {
    // Replay owns team victories. A stale or edited session result cannot award a different team.
    const outcome = getGameOutcome(game, settings);
    const agreedDraw = saved.status === 'finished' && saved.result?.winner === null && saved.result?.reason === 'agreement';
    const expected = outcome ?? (agreedDraw ? { winner: null, reason: 'agreement' } : null);
    const sameResult = expected === null ? saved.result === null : saved.result
      && Object.keys(saved.result).length === Object.keys(expected).length
      && Object.entries(expected).every(([key, value]) => JSON.stringify(saved.result[key]) === JSON.stringify(value));
    if (!sameResult || (expected !== null) !== (saved.status === 'finished')
      || (saved.status === 'finished' && saved.turnStartedAt !== null)) throw new Error('Invalid saved team result.');
  }
  const session = {
    ...saved, settings, game, timeControl: settings.timeControl,
    clockHistory: Array.isArray(saved.clockHistory) ? saved.clockHistory : [],
    ready: mapColors(settings, (color) => saved.ready?.[color] === true),
    players: mapColors(settings, (color) => saved.players?.[color] ? { ...saved.players[color], name: playerName(saved.players[color].name, color) } : null),
    drawVotes: Array.isArray(saved.drawVotes) ? [...new Set(saved.drawVotes.filter((color) => game.activeColors().includes(color)))] : [],
    undoBoundary: saved.undoBoundary ?? 0,
  };
  if (!Number.isSafeInteger(session.undoBoundary) || session.undoBoundary < 0 || session.undoBoundary > game.history().length) throw new Error('Invalid saved takeback boundary.');
  if (session.status !== 'waiting' && colors.some((color) => !session.players[color])) throw new Error('Missing saved player.');
  if (session.undoRequest) {
    const request = session.undoRequest;
    if (session.status !== 'playing' || !game.activeColors().includes(request.color) || !Number.isSafeInteger(request.plies) || request.plies < 1 || request.plies > game.history().length - session.undoBoundary || !Array.isArray(request.approvals) || !Array.isArray(request.required) || request.required.length !== colors.length - 1 || new Set(request.required).size !== colors.length - 1 || request.required.some((color) => !colors.includes(color) || color === request.color) || request.approvals.some((color) => !colors.includes(color))) throw new Error('Invalid saved takeback request.');
  }
  if (session.drawOffer !== null && !game.activeColors().includes(session.drawOffer)) throw new Error('Invalid saved draw offer.');
  checkPartyTimeout(session, now);
  return session;
}

/** Shared authoritative action rules for remote seats and explicit same-device actors. */
export function applyPartyAction(session, event, payload = {}, now = Date.now()) {
  checkPartyTimeout(session, now);
  const game = engine(session);
  const colors = getPlayerColors(session.settings);
  const color = payload.color ?? game.turn();
  if (!colors.includes(color)) throw new Error('Choose a player at this table.');
  const active = () => {
    if (session.status !== 'playing') throw new Error('There is no active game.');
    if (!game.activeColors().includes(color)) throw new Error('This player has been eliminated.');
  };
  const currentVersion = () => {
    if (payload.expectedVersion !== session.version) throw new Error('The board or agreement has changed. Review the latest state and try again.');
  };
  const currentBoard = () => {
    currentVersion();
    if (payload.expectedPly !== game.history().length) throw new Error('The board has changed. Please select your move again.');
  };
  const undo = (requester, plies) => {
    session.clocks = partyClocks(session, now);
    for (let index = 0; index < plies; index++) {
      const move = game.undo();
      const previous = session.clockHistory.pop();
      for (const side of colors) {
        if (session.clocks[side] === null) continue;
        if (previous && Number.isFinite(previous[side])) session.clocks[side] = Math.min(session.clocks[side], previous[side]);
        else if (move.color === side) session.clocks[side] = Math.max(0, session.clocks[side] - TIME_CONTROLS[session.timeControl].increment);
      }
    }
    session.undoUsed[requester] += plies;
    session.undoRequest = null;
    session.drawOffer = null;
    session.drawVotes = [];
    session.turnStartedAt = now;
    session.version++;
    checkPartyTimeout(session, now);
  };

  if (event === 'room:sync') return { ok: true, room: partySnapshot(session, now) };
  if (event === 'game:move') {
    active(); currentBoard();
    if (session.undoRequest) throw new Error('Answer the takeback request before moving.');
    if (game.turn() !== color) throw new Error('Wait for your turn.');
    const clocks = partyClocks(session, now);
    game.move({ from: payload.from, to: payload.to, ...(payload.promotion ? { promotion: payload.promotion } : {}) });
    session.clockHistory.push(clocks);
    session.clocks = { ...clocks };
    if (session.clocks[color] !== null) session.clocks[color] += TIME_CONTROLS[session.timeControl].increment;
    session.turnStartedAt = now;
    session.drawOffer = null;
    session.drawVotes = [];
    session.version++;
    settleOutcome(session);
  } else if (event === 'game:undo') {
    active(); currentBoard();
    if (session.settings.undoMode === 'off') throw new Error('Takebacks are disabled for this game.');
    if (session.undoRequest) throw new Error('There is already a takeback request to answer.');
    const { plies } = payload;
    if (!Number.isSafeInteger(plies) || plies < 1 || plies > game.history().length) throw new Error('Choose a valid number of individual moves to take back.');
    if (plies > game.history().length - (session.undoBoundary ?? 0)) throw new Error('A takeback cannot cross a resignation or timeout. Choose fewer moves.');
    if (session.settings.undoLimit !== null && session.undoUsed[color] + plies > session.settings.undoLimit) throw new Error('That exceeds your remaining takeback allowance.');
    if (session.settings.undoMode === 'free') undo(color, plies);
    else {
      session.clocks = partyClocks(session, now);
      session.undoRequest = { color, plies, requestedAt: now, version: session.version, approvals: [color], required: colors.filter((side) => side !== color) };
      session.turnStartedAt = now;
      session.drawOffer = null;
      session.drawVotes = [];
      session.version++;
    }
  } else if (event === 'game:respond-undo') {
    currentVersion();
    const request = session.undoRequest;
    if (session.status !== 'playing' || !request?.required.includes(color) || request.approvals.includes(color)) throw new Error('There is no takeback request for you to answer.');
    if (typeof payload.accept !== 'boolean') throw new Error('Choose whether to accept the takeback.');
    if (!payload.accept) {
      session.clocks = partyClocks(session, now);
      session.undoRequest = null;
      session.turnStartedAt = now;
      session.version++;
    } else {
      request.approvals.push(color);
      if (request.required.every((side) => request.approvals.includes(side))) undo(request.color, request.plies);
      else session.version++;
    }
  } else if (event === 'game:resign') {
    active(); currentVersion();
    session.clocks = partyClocks(session, now);
    eliminate(session, color, 'resignation', now);
  } else if (event === 'game:offer-draw') {
    active(); currentVersion();
    if (session.undoRequest) throw new Error('Answer the takeback request first.');
    if (session.drawOffer) throw new Error('There is already a draw offer to answer.');
    session.drawOffer = color;
    session.drawVotes = [color];
    session.version++;
  } else if (event === 'game:respond-draw') {
    active(); currentVersion();
    if (!session.drawOffer || session.drawVotes.includes(color)) throw new Error('There is no draw offer for you to answer.');
    if (typeof payload.accept !== 'boolean') throw new Error('Choose whether to accept the draw.');
    if (!payload.accept) { session.drawOffer = null; session.drawVotes = []; }
    else {
      session.drawVotes.push(color);
      if (game.activeColors().every((side) => session.drawVotes.includes(side))) {
        session.clocks = partyClocks(session, now);
        finish(session, { winner: null, reason: 'agreement' });
      }
    }
    session.version++;
  } else throw new Error('This game action is not supported.');
  return { ok: true, room: partySnapshot(session, now) };
}
