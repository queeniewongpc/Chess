import express from 'express';
import { createServer } from 'node:http';
import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { createGame, normalizeSettings, getGameOutcome, hasMissingArenaKings, getPlayerColors, TIME_CONTROLS } from '../shared/game.js';
import { createPartySession, restorePartySession, partySnapshot, checkPartyTimeout, applyPartyAction } from '../shared/partySession.js';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const otherColor = (color) => (color === 'w' ? 'b' : 'w');
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const validToken = (token, hash) => {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof hash !== 'string' || hash.length !== 64) return false;
  return timingSafeEqual(Buffer.from(tokenHash(token), 'hex'), Buffer.from(hash, 'hex'));
};

function normalizeCode(value) {
  if (typeof value !== 'string') throw new Error('Enter an eight-character room code.');
  const code = value.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) throw new Error('Enter a valid eight-character room code.');
  return code;
}

function normalizeName(value) {
  if (typeof value !== 'string') throw new Error('Enter your name to take a seat.');
  const name = value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim().replace(/\s+/g, ' ').slice(0, 28);
  if (!name) throw new Error('Enter your name to take a seat.');
  return name;
}

function moveRecord(move) {
  return {
    san: move.san,
    from: move.from,
    to: move.to,
    color: move.color,
    piece: move.piece,
    ...(move.captured ? { captured: move.captured } : {}),
    ...(move.promotion ? { promotion: move.promotion } : {}),
  };
}

/** Creates a self-contained authoritative chess service; pass dataFile:null for ephemeral tests. */
export async function createGameServer(options = {}) {
  const now = options.now ?? Date.now;
  const logger = options.logger ?? console;
  const dataFile = options.dataFile === undefined ? path.resolve('.data/rooms.json') : options.dataFile;
  const roomTtlMs = options.roomTtlMs ?? 24 * 60 * 60_000;
  const rooms = new Map();
  const limits = new Map();
  const app = express();
  app.disable('x-powered-by');
  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  app.get('/api/health', (_request, response) => response.json({ ok: true }));
  const publicDirectory = options.staticDirectory ?? path.resolve('dist');
  app.use(express.static(publicDirectory));
  app.get(/^(?!\/api(?:\/|$)).*/, (_request, response, next) => {
    response.sendFile(path.join(publicDirectory, 'index.html'), (error) => {
      if (error) next();
    });
  });
  app.use((_request, response) => response.status(404).json({ error: 'Not found' }));
  const httpServer = createServer(app);
  const io = new Server(httpServer, { maxHttpBufferSize: 16_384, pingInterval: 15_000, pingTimeout: 15_000 });
  let saveTimer = null;
  let saving = Promise.resolve();
  let closing = false;

  function serializeRooms() {
    return JSON.stringify({ version: 2, rooms: [...rooms.values()].map((room) => ({
      code: room.code,
      settings: room.settings,
      ready: room.ready,
      legacy: room.legacy,
      version: room.version,
      undoUsed: room.undoUsed,
      undoRequest: room.undoRequest,
      clockHistory: room.clockHistory,
      timeControl: room.timeControl,
      ...(room.settings.mode === 'party' ? { partyState: room.chess.exportState(), undoBoundary: room.undoBoundary ?? 0, drawVotes: room.drawVotes ?? [] } : {}),
      history: room.chess.history({ verbose: true }).map(moveRecord),
      players: Object.fromEntries(getPlayerColors(room.settings).map((color) => [color, room.players[color] ? {
        name: room.players[color].name,
        tokenHash: room.players[color].tokenHash,
      } : null])),
      status: room.status,
      clocks: room.clocks,
      turnStartedAt: room.turnStartedAt,
      result: room.result,
      drawOffer: room.drawOffer,
      rematchVotes: [...room.rematchVotes],
      updatedAt: room.updatedAt,
    })) });
  }

  function persist() {
    if (!dataFile) return Promise.resolve();
    // Serialize before queueing so each atomic replacement reflects a coherent game state.
    const content = serializeRooms();
    saving = saving.then(async () => {
      await mkdir(path.dirname(dataFile), { recursive: true, mode: 0o700 });
      const temporaryFile = `${dataFile}.${process.pid}.tmp`;
      await writeFile(temporaryFile, content, { mode: 0o600 });
      await rename(temporaryFile, dataFile);
    }).catch((error) => logger.error('Unable to save chess rooms:', error.message));
    return saving;
  }

  function scheduleSave() {
    if (!dataFile || saveTimer || closing) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void persist();
    }, 75);
    saveTimer.unref();
  }

  function finish(room, winner, reason, outcome = null) {
    room.status = 'finished';
    room.result = outcome ?? { winner, reason };
    room.turnStartedAt = null;
    room.drawOffer = null;
    room.undoRequest = null;
    room.updatedAt = now();
    scheduleSave();
  }

  function remainingClocks(room, timestamp = now()) {
    const clocks = { ...room.clocks };
    if (room.status === 'playing' && room.turnStartedAt !== null && clocks[room.chess.turn()] !== null) {
      const turn = room.undoRequest?.color ?? room.chess.turn();
      clocks[turn] = Math.max(0, clocks[turn] - Math.max(0, timestamp - room.turnStartedAt));
    }
    return clocks;
  }

  function checkTimeout(room) {
    if (room.settings.mode === 'party') {
      const changed = checkPartyTimeout(room, now());
      if (changed) recordActivity(room);
      return changed;
    }
    if (room.status !== 'playing' || room.clocks.w === null) return false;
    const clocks = remainingClocks(room);
    const active = room.undoRequest?.color ?? room.chess.turn();
    if (clocks[active] > 0) return false;
    room.clocks = clocks;
    // A bare king cannot deliver mate, so flagging against it is a draw.
    const winner = otherColor(active);
    const hasMatingPiece = room.chess.board().flat().some((piece) => piece && piece.color === winner && (room.settings.mode === 'half' || piece.type !== 'k'));
    finish(room, hasMatingPiece ? winner : null, hasMatingPiece ? 'timeout' : 'timeout-insufficient-material');
    return true;
  }

  function snapshot(room) {
    if (room.settings.mode === 'party') return partySnapshot(room, now());
    const timestamp = now();
    const history = room.chess.history({ verbose: true }).map(moveRecord);
    return {
      code: room.code,
      settings: room.settings,
      colors: getPlayerColors(room.settings),
      ready: room.ready,
      version: room.version,
      undoUsed: room.undoUsed,
      undoRequest: room.undoRequest,
      fen: room.chess.fen(),
      board: room.chess.board(),
      legalMoves: room.chess.moves({ verbose: true }).map(moveRecord),
      history,
      players: Object.fromEntries(getPlayerColors(room.settings).map((color) => [color, room.players[color] ? {
        name: room.players[color].name,
        connected: Boolean(room.players[color].socketId),
      } : null])),
      status: room.status,
      turn: room.chess.turn(),
      clocks: remainingClocks(room, timestamp),
      serverTime: timestamp,
      timeControl: room.timeControl,
      result: room.result,
      drawOffer: room.drawOffer,
      rematchVotes: [...room.rematchVotes],
      lastMove: history.length ? { from: history.at(-1).from, to: history.at(-1).to } : null,
      inCheck: room.chess.isCheck(),
    };
  }

  function broadcast(room) {
    io.to(room.code).emit('room:state', snapshot(room));
  }

  function recordActivity(room) {
    room.updatedAt = now();
    scheduleSave();
  }

  function startGame(room) {
    room.chess = createGame(room.settings);
    room.status = 'playing';
    room.ready = Object.fromEntries(getPlayerColors(room.settings).map((color) => [color, true]));
    room.turnStartedAt = now();
    room.version++;
    const outcome = getGameOutcome(room.chess, room.settings);
    if (outcome) finish(room, outcome.winner, outcome.reason, outcome);
    recordActivity(room);
  }

  function startPartyWhenFull(room) {
    if (room.settings.mode !== 'party' || room.status !== 'waiting') return;
    const allConnected = getPlayerColors(room.settings).every((color) => {
      const playerSocket = io.sockets.sockets.get(room.players[color]?.socketId);
      return playerSocket?.connected && playerSocket.data.membership?.code === room.code && playerSocket.data.membership.color === color;
    });
    if (allConnected) startGame(room);
  }

  function requireVersion(room, payload) {
    if ((!room.legacy || payload.expectedVersion !== undefined) && (!Number.isSafeInteger(payload.expectedVersion) || payload.expectedVersion !== room.version)) {
      throw new Error('The board or settings have changed. Review the latest state and try again.');
    }
  }

  function applyUndo(room, color, plies) {
    // Keep time already spent, including deliberation about the request; never manufacture clock time.
    room.clocks = remainingClocks(room);
    for (let index = 0; index < plies; index++) {
      room.chess.undo();
      const previous = room.clockHistory.pop();
      if (previous) for (const side of ['w', 'b']) {
        if (room.clocks[side] !== null) room.clocks[side] = Math.min(room.clocks[side], previous[side]);
      }
    }
    room.undoUsed[color] += plies;
    room.undoRequest = null;
    room.drawOffer = null;
    room.turnStartedAt = now();
    room.version++;
    checkTimeout(room);
    recordActivity(room);
  }

  function findRoom(code) {
    const room = rooms.get(normalizeCode(code));
    if (!room) throw new Error('Room not found. Check the code or create a new game.');
    if (checkTimeout(room)) broadcast(room);
    return room;
  }

  function requireMember(socket, code) {
    const room = findRoom(code);
    const color = socket.data.membership?.color;
    if (socket.data.membership?.code !== room.code || !color || room.players[color]?.socketId !== socket.id) {
      throw new Error('Join this room before playing.');
    }
    return { room, color };
  }

  function rateLimit(key, maximum, windowMs) {
    const timestamp = now();
    let limit = limits.get(key);
    if (!limit || timestamp >= limit.expiresAt) {
      limit = { count: 0, expiresAt: timestamp + windowMs };
      limits.set(key, limit);
    }
    if (++limit.count > maximum) throw new Error('Too many requests. Please wait a moment and try again.');
  }

  function detach(socket) {
    const membership = socket.data.membership;
    if (!membership) return;
    const room = rooms.get(membership.code);
    if (room?.players[membership.color]?.socketId === socket.id) {
      room.players[membership.color].socketId = null;
      broadcast(room);
    }
    socket.leave(membership.code);
    delete socket.data.membership;
  }

  function attach(socket, room, color) {
    const oldSocketId = room.players[color].socketId;
    if (oldSocketId && oldSocketId !== socket.id) {
      const previousSocket = io.sockets.sockets.get(oldSocketId);
      if (previousSocket) {
        previousSocket.leave(room.code);
        delete previousSocket.data.membership;
        previousSocket.emit('room:replaced', { code: room.code, message: 'Your seat is now open in another tab or device.' });
      }
    }
    if (socket.data.membership && (socket.data.membership.code !== room.code || socket.data.membership.color !== color)) detach(socket);
    room.players[color].socketId = socket.id;
    socket.data.membership = { code: room.code, color };
    socket.join(room.code);
    startPartyWhenFull(room);
    recordActivity(room);
  }

  function reclaim(socket, room, token) {
    const color = getPlayerColors(room.settings).find((candidate) => room.players[candidate] && validToken(token, room.players[candidate].tokenHash));
    if (!color) throw new Error('This seat could not be restored. Open the original browser or join a new game.');
    attach(socket, room, color);
    broadcast(room);
    return { ok: true, room: snapshot(room), player: { color, token } };
  }

  if (dataFile) {
    try {
      const stored = JSON.parse(await readFile(dataFile, 'utf8'));
      if (![1, 2].includes(stored.version) || !Array.isArray(stored.rooms)) throw new Error('Unrecognized room data format');
      for (const saved of stored.rooms) {
        try {
          if (now() - saved.updatedAt > roomTtlMs) continue;
          if (!CODE_PATTERN.test(saved.code) || !Object.hasOwn(TIME_CONTROLS, saved.timeControl)) continue;
          const settings = normalizeSettings(saved.settings ?? { timeControl: saved.timeControl, undoMode: 'off' });
          if (settings.mode === 'party') {
            const restored = restorePartySession(saved, now());
            const colors = getPlayerColors(settings);
            if (colors.some((color) => restored.players[color] && !/^[a-f0-9]{64}$/.test(restored.players[color].tokenHash))) continue;
            const room = { ...restored, chess: restored.game, legacy: false,
              players: Object.fromEntries(colors.map((color) => [color, restored.players[color] ? { ...restored.players[color], socketId: null } : null])),
              rematchVotes: new Set((saved.rematchVotes ?? []).filter((color) => colors.includes(color))),
            };
            delete room.game;
            delete room.history;
            rooms.set(room.code, room);
            continue;
          }
          if (!Array.isArray(saved.history) || saved.history.length > 3000) continue;
          const chess = createGame(settings, { allowIncompleteArena: saved.status === 'waiting' && saved.history.length === 0 });
          for (const move of saved.history) chess.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
          const players = Object.fromEntries(['w', 'b'].map((color) => [color, saved.players[color] ? {
            name: normalizeName(saved.players[color].name),
            tokenHash: saved.players[color].tokenHash,
            socketId: null,
          } : null]));
          if (['w', 'b'].some((color) => players[color] && !/^[a-f0-9]{64}$/.test(players[color].tokenHash))) continue;
          if (!['waiting', 'playing', 'finished'].includes(saved.status)) continue;
          if (['w', 'b'].some((color) => TIME_CONTROLS[saved.timeControl].initial === null ? saved.clocks[color] !== null : !Number.isFinite(saved.clocks[color]) || saved.clocks[color] < 0)) continue;
          if (saved.status === 'playing' && (!players.w || !players.b || !Number.isFinite(saved.turnStartedAt))) continue;
          const room = {
            ...saved,
            settings,
            legacy: saved.legacy ?? stored.version === 1,
            ready: hasMissingArenaKings(settings) ? { w: false, b: false } : saved.ready ?? { w: saved.status !== 'waiting', b: saved.status !== 'waiting' },
            version: Number.isSafeInteger(saved.version) && saved.version >= 0 ? saved.version : saved.history.length,
            undoUsed: {
              w: Number.isSafeInteger(saved.undoUsed?.w) && saved.undoUsed.w >= 0 ? saved.undoUsed.w : 0,
              b: Number.isSafeInteger(saved.undoUsed?.b) && saved.undoUsed.b >= 0 ? saved.undoUsed.b : 0,
            },
            undoRequest: saved.undoRequest ?? null,
            clockHistory: Array.isArray(saved.clockHistory) ? saved.clockHistory : [],
            chess,
            players,
            rematchVotes: new Set((saved.rematchVotes ?? []).filter((color) => color === 'w' || color === 'b')),
          };
          delete room.history;
          rooms.set(room.code, room);
          checkTimeout(room);
        } catch (error) {
          logger.warn('Skipping an invalid saved chess room:', error.message);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // Never silently overwrite an unreadable save file with a fresh, empty set of rooms.
        throw new Error(`Could not load saved games: ${error.message}`);
      }
    }
  }

  io.on('connection', (socket) => {
    const ip = socket.handshake.address;

    function handle(event, handler) {
      socket.on(event, (rawPayload, acknowledge) => {
        const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
        try {
          rateLimit(`socket:${socket.id}`, 100, 10_000);
          if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) throw new Error('Invalid request.');
          if (['game:move', 'game:undo', 'game:respond-undo', 'game:resign', 'game:offer-draw', 'game:respond-draw'].includes(event)) {
            const { room, color } = requireMember(socket, rawPayload.code);
            if (room.settings.mode === 'party') {
              const response = applyPartyAction(room, event, { ...rawPayload, color }, now());
              recordActivity(room);
              broadcast(room);
              reply(response);
              return;
            }
          }
          reply(handler(rawPayload));
        } catch (error) {
          reply({ ok: false, error: error.message || 'Something went wrong. Try again.' });
        }
      });
    }

    handle('room:create', (payload) => {
      rateLimit(`create:${ip}`, 12, 60_000);
      if (rooms.size >= 1000) throw new Error('All tables are busy. Please try again later.');
      const name = normalizeName(payload.name);
      const legacy = payload.settings === undefined;
      const settings = normalizeSettings(legacy ? { timeControl: payload.timeControl, undoMode: 'off' } : payload.settings);
      const colors = getPlayerColors(settings);
      if (![...colors, 'random'].includes(payload.color)) throw new Error('Choose an available player color, or random.');
      const chess = createGame(settings);
      if (getGameOutcome(chess, settings)) throw new Error('This starting position has already ended. Choose a position where all players can continue.');
      const color = payload.color === 'random' ? colors[randomInt(colors.length)] : payload.color;
      let code;
      do { code = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(''); } while (rooms.has(code));
      const token = randomBytes(32).toString('hex');
      const room = {
        code,
        chess,
        settings,
        legacy,
        ready: { w: false, b: false },
        version: 0,
        undoUsed: { w: 0, b: 0 },
        undoRequest: null,
        clockHistory: [],
        players: { w: null, b: null },
        status: 'waiting',
        timeControl: settings.timeControl,
        clocks: { w: TIME_CONTROLS[settings.timeControl].initial, b: TIME_CONTROLS[settings.timeControl].initial },
        turnStartedAt: null,
        result: null,
        drawOffer: null,
        rematchVotes: new Set(),
        updatedAt: now(),
      };
      if (settings.mode === 'party') {
        const party = createPartySession(settings, {}, now(), true);
        Object.assign(room, { ...party, chess: party.game, game: undefined, legacy: false,
          players: Object.fromEntries(colors.map((side) => [side, null])),
        });
        delete room.game;
      }
      room.players[color] = { name, tokenHash: tokenHash(token), socketId: null };
      rooms.set(code, room);
      attach(socket, room, color);
      broadcast(room);
      return { ok: true, room: snapshot(room), player: { color, token } };
    });

    handle('room:join', (payload) => {
      rateLimit(`join:${ip}`, 60, 60_000);
      const room = findRoom(payload.code);
      if (payload.token !== undefined) return reclaim(socket, room, payload.token);
      if (socket.data.membership?.code === room.code) throw new Error('You already have a seat at this table.');
      const name = normalizeName(payload.name);
      const color = getPlayerColors(room.settings).find((candidate) => !room.players[candidate]);
      if (!color || room.status !== 'waiting') throw new Error('All seats are taken. Ask your friend for a new game link.');
      const token = randomBytes(32).toString('hex');
      room.players[color] = { name, tokenHash: tokenHash(token), socketId: null };
      attach(socket, room, color);
      if (room.legacy && room.players.w && room.players.b) startGame(room);
      broadcast(room);
      return { ok: true, room: snapshot(room), player: { color, token } };
    });

    handle('room:resume', (payload) => {
      rateLimit(`join:${ip}`, 60, 60_000);
      return reclaim(socket, findRoom(payload.code), payload.token);
    });

    handle('room:sync', (payload) => {
      const { room } = requireMember(socket, payload.code);
      return { ok: true, room: snapshot(room) };
    });

    handle('room:settings', (payload) => {
      const { room } = requireMember(socket, payload.code);
      if (room.status !== 'waiting') throw new Error('Rules can only change before the game begins.');
      requireVersion(room, payload);
      const settings = normalizeSettings(payload.settings);
      if ((settings.mode === 'party') !== (room.settings.mode === 'party')) throw new Error('Create a new room to switch between two-player and multiplayer games.');
      const nextColors = getPlayerColors(settings);
      if (getPlayerColors(room.settings).some((color) => !nextColors.includes(color) && room.players[color])) throw new Error('The extra player already has a seat. Create a new room to reduce the player count.');
      const incompleteArena = hasMissingArenaKings(settings);
      const chess = createGame(settings, { allowIncompleteArena: true });
      if (!incompleteArena && getGameOutcome(chess, settings)) throw new Error('This starting position has already ended. Choose a position where all players can continue.');
      room.settings = settings;
      room.chess = chess;
      room.timeControl = settings.timeControl;
      room.clocks = Object.fromEntries(nextColors.map((color) => [color, TIME_CONTROLS[settings.timeControl].initial]));
      room.ready = Object.fromEntries(nextColors.map((color) => [color, false]));
      room.players = Object.fromEntries(nextColors.map((color) => [color, room.players[color] ?? null]));
      room.undoUsed = Object.fromEntries(nextColors.map((color) => [color, 0]));
      room.legacy = false;
      room.version++;
      startPartyWhenFull(room);
      recordActivity(room);
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('game:ready', (payload) => {
      const { room, color } = requireMember(socket, payload.code);
      if (room.settings.mode === 'party') {
        requireVersion(room, payload);
        if (room.status === 'finished') throw new Error('This game has already ended.');
        // Older clients may still send readiness. It neither blocks automatic start nor restarts play.
        startPartyWhenFull(room);
        return { ok: true, room: snapshot(room) };
      }
      if (room.status !== 'waiting') throw new Error('This game has already started.');
      requireVersion(room, payload);
      if (payload.ready !== false) {
        const chess = createGame(room.settings);
        if (getGameOutcome(chess, room.settings)) throw new Error('This starting position has already ended. Choose a position where all players can continue.');
      }
      room.ready[color] = payload.ready !== false;
      if (getPlayerColors(room.settings).every((side) => room.players[side] && room.ready[side])) startGame(room);
      recordActivity(room);
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('game:move', (payload) => {
      const { room, color } = requireMember(socket, payload.code);
      if (room.status !== 'playing') throw new Error(room.status === 'waiting' ? 'Wait for your opponent to join.' : 'This game has ended.');
      if (room.undoRequest) throw new Error('Answer the takeback request before moving.');
      requireVersion(room, payload);
      if (room.chess.turn() !== color) throw new Error('It is your opponent’s turn.');
      if (!Number.isSafeInteger(payload.expectedPly) || payload.expectedPly !== room.chess.history().length) throw new Error('The board has changed. Please try your move again.');
      if (!/^[a-h][1-8]$/.test(payload.from) || !/^[a-h][1-8]$/.test(payload.to)) throw new Error('Choose a valid square.');
      if (payload.promotion !== undefined && !['q', 'r', 'b', 'n'].includes(payload.promotion)) throw new Error('Choose a valid promotion piece.');
      const clocks = remainingClocks(room);
      if (clocks[color] !== null && clocks[color] <= 0) {
        checkTimeout(room);
        broadcast(room);
        throw new Error('Your time has run out.');
      }
      let move;
      try {
        move = room.chess.move({ from: payload.from, to: payload.to, ...(payload.promotion ? { promotion: payload.promotion } : {}) });
      } catch {
        throw new Error('That move is not legal. Choose another square.');
      }
      if (!move) throw new Error('That move is not legal. Choose another square.');
      room.clockHistory.push({ ...clocks });
      room.clocks = clocks;
      if (room.clocks[color] !== null) room.clocks[color] += TIME_CONTROLS[room.timeControl].increment;
      room.turnStartedAt = now();
      if (room.drawOffer && room.drawOffer !== color) room.drawOffer = null;
      room.version++;
      const outcome = getGameOutcome(room.chess, room.settings);
      if (outcome) finish(room, outcome.winner, outcome.reason, outcome);
      recordActivity(room);
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('game:undo', (payload) => {
      const { room, color } = requireMember(socket, payload.code);
      if (room.status !== 'playing') throw new Error('Takebacks are available during an active game.');
      if (room.settings.undoMode === 'off') throw new Error('Takebacks are disabled for this game.');
      if (room.undoRequest) throw new Error('There is already a takeback request to answer.');
      requireVersion(room, payload);
      const plies = payload.plies;
      const currentPly = room.chess.history().length;
      if (!Number.isSafeInteger(payload.expectedPly) || payload.expectedPly !== currentPly) throw new Error('The board has changed. Try again.');
      if (!Number.isSafeInteger(plies) || plies < 1 || plies > currentPly) throw new Error('Choose how many individual moves to take back.');
      if (room.settings.undoLimit !== null && room.undoUsed[color] + plies > room.settings.undoLimit) throw new Error('That exceeds your remaining takeback allowance.');
      if (room.settings.undoMode === 'free') applyUndo(room, color, plies);
      else {
        room.clocks = remainingClocks(room);
        room.undoRequest = { color, plies, requestedAt: now(), version: room.version };
        // Moves are frozen, but the requester pays for approval time to prevent clock abuse.
        room.turnStartedAt = now();
        room.drawOffer = null;
        recordActivity(room);
      }
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('game:respond-undo', (payload) => {
      const { room, color } = requireMember(socket, payload.code);
      if (room.status !== 'playing' || room.undoRequest?.color !== otherColor(color)) throw new Error('There is no takeback request for you to answer.');
      if (typeof payload.accept !== 'boolean') throw new Error('Choose whether to accept the takeback.');
      if (payload.accept) applyUndo(room, room.undoRequest.color, room.undoRequest.plies);
      else {
        room.clocks = remainingClocks(room);
        room.undoRequest = null;
        room.turnStartedAt = now();
        recordActivity(room);
      }
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('game:resign', (payload) => {
      const { room, color } = requireMember(socket, payload.code);
      if (room.status !== 'playing') throw new Error('There is no active game to resign.');
      room.clocks = remainingClocks(room);
      finish(room, otherColor(color), 'resignation');
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('game:offer-draw', (payload) => {
      const { room, color } = requireMember(socket, payload.code);
      if (room.status !== 'playing') throw new Error('There is no active game.');
      if (room.drawOffer && room.drawOffer !== color) throw new Error('Your opponent has already offered a draw.');
      room.drawOffer = color;
      recordActivity(room);
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('game:respond-draw', (payload) => {
      const { room, color } = requireMember(socket, payload.code);
      if (room.status !== 'playing' || room.drawOffer !== otherColor(color)) throw new Error('There is no draw offer to answer.');
      if (typeof payload.accept !== 'boolean') throw new Error('Choose whether to accept the draw.');
      if (payload.accept) {
        room.clocks = remainingClocks(room);
        finish(room, null, 'agreement');
      } else room.drawOffer = null;
      recordActivity(room);
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('game:rematch', (payload) => {
      const { room, color } = requireMember(socket, payload.code);
      if (room.status !== 'finished') throw new Error('Finish this game before starting a rematch.');
      if (room.settings.mode === 'party') requireVersion(room, payload);
      room.rematchVotes.add(color);
      if (room.rematchVotes.size === getPlayerColors(room.settings).length) {
        room.chess = createGame(room.settings);
        room.clocks = Object.fromEntries(getPlayerColors(room.settings).map((side) => [side, TIME_CONTROLS[room.timeControl].initial]));
        room.result = null;
        room.drawOffer = null;
        room.undoRequest = null;
        room.undoUsed = Object.fromEntries(getPlayerColors(room.settings).map((side) => [side, 0]));
        room.undoBoundary = 0;
        room.drawVotes = [];
        room.clockHistory = [];
        room.rematchVotes.clear();
        // Keeping seats stable also keeps the saved reconnect credential stable across games.
        startGame(room);
      }
      recordActivity(room);
      broadcast(room);
      return { ok: true, room: snapshot(room) };
    });

    handle('room:leave', (payload) => {
      const { room } = requireMember(socket, payload.code);
      detach(socket);
      return { ok: true, room: snapshot(room) };
    });

    socket.on('disconnect', () => {
      detach(socket);
      limits.delete(`socket:${socket.id}`);
    });
  });

  const tick = setInterval(() => {
    const timestamp = now();
    for (const room of rooms.values()) {
      if (!Object.values(room.players).some((player) => player?.socketId) && timestamp - room.updatedAt > roomTtlMs) {
        rooms.delete(room.code);
        scheduleSave();
        continue;
      }
      if (room.status === 'playing') {
        checkTimeout(room);
        if (Object.values(room.players).some((player) => player?.socketId)) broadcast(room);
      }
    }
    for (const [key, limit] of limits) if (timestamp >= limit.expiresAt) limits.delete(key);
  }, options.tickIntervalMs ?? 1000);
  tick.unref();

  return {
    app,
    io,
    httpServer,
    async listen(port = Number(process.env.PORT) || 3001, host = '0.0.0.0') {
      await new Promise((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, host, () => {
          httpServer.off('error', reject);
          resolve();
        });
      });
      return httpServer.address();
    },
    async close() {
      if (closing) return;
      closing = true;
      clearInterval(tick);
      if (saveTimer) clearTimeout(saveTimer);
      await new Promise((resolve) => io.close(resolve));
      await persist();
      await saving;
    },
  };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const service = await createGameServer();
  const address = await service.listen();
  console.log(`Chess server ready at http://localhost:${address.port}`);
  const shutdown = async () => { await service.close(); process.exit(0); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
