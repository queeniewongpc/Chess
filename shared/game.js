import { Chess } from 'chess.js';
import { ENDGAMES } from './endgames.js';
import { partyColors } from './partyGeometry.js';
import { PartyChess } from './partyChess.js';
export { PartyChess } from './partyChess.js';
export { getPartyGeometry, PARTY_COLORS } from './partyGeometry.js';

export function getPlayerColors(settings = {}) {
  return settings.mode === 'party' ? partyColors(settings.playerCount ?? 4) : ['w', 'b'];
}

export const STANDARD_ROSTER = Object.freeze({ p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 });
export const TIME_CONTROLS = Object.freeze({
  rapid: { initial: 600_000, increment: 0 },
  blitz: { initial: 300_000, increment: 3_000 },
  bullet: { initial: 180_000, increment: 2_000 },
  unlimited: { initial: null, increment: 0 },
});
const initialCounts = { p: 4, n: 1, b: 1, r: 1, q: 1, k: 0 };
export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'classic', undoMode: 'approval', undoLimit: 3, timeControl: 'unlimited', playerCount: 4, partyVariant: 'ffa',
  endgameId: 'lucena', customFen: '', halfKing: false, halfShape: '8x4',
  halfPlacement: 'territory', halfPosition: null, halfWin: 'capture-all',
  halfCounts: { w: { ...initialCounts }, b: { ...initialCounts } },
});

/** Validate once at the trust boundary; both local play and the server use these rules. */
export function normalizeSettings(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose valid game settings.');
  const settings = { ...DEFAULT_SETTINGS, ...value };
  if (settings.mode === 'party' && !Object.hasOwn(value, 'undoMode')) settings.undoMode = 'off';
  if (!['classic', 'endgame', 'custom', 'half', 'party'].includes(settings.mode)) throw new Error('Choose a valid game mode.');
  partyColors(settings.playerCount);
  if (!['ffa', 'teams'].includes(settings.partyVariant)) throw new Error('Choose a valid multiplayer format.');
  if (settings.mode === 'party' && settings.partyVariant === 'teams' && settings.playerCount !== 4) throw new Error('2 vs 2 requires four players.');
  getArenaDimensions(settings.halfShape);
  if (!['territory', 'anywhere'].includes(settings.halfPlacement)) throw new Error('Choose a valid Chaos Kingdom placement rule.');
  if (!['capture-all', 'capture-king'].includes(settings.halfWin)) throw new Error('Choose a valid Chaos Kingdom win condition.');
  if (!['off', 'free', 'approval'].includes(settings.undoMode)) throw new Error('Choose a valid takeback rule.');
  if (!['rapid', 'blitz', 'bullet', 'unlimited'].includes(settings.timeControl)) throw new Error('Choose a valid time control.');
  if (settings.undoLimit !== null && (!Number.isSafeInteger(settings.undoLimit) || settings.undoLimit < 1)) {
    throw new Error('Takeback allowance must be a positive whole number, or unlimited.');
  }
  // Old saves used one shared king toggle. Once halfWin is present, each
  // roster owns its king count; normalizing a migrated save stays idempotent.
  const legacyKings = !Object.hasOwn(value, 'halfWin');
  settings.halfCounts = {};
  for (const color of ['w', 'b']) {
    const input = value.halfCounts?.[color] ?? initialCounts;
    const counts = {};
    for (const [piece, maximum] of Object.entries(STANDARD_ROSTER)) {
      const count = piece === 'k' && legacyKings ? (settings.halfKing ? 1 : 0) : (input[piece] ?? 0);
      if (!Number.isInteger(count) || count < 0 || count > maximum) throw new Error(`Choose 0–${maximum} ${piece.toUpperCase()} pieces.`);
      counts[piece] = count;
    }
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (total < 1 || total > 16) throw new Error('Each side needs between 1 and 16 pieces.');
    settings.halfCounts[color] = counts;
  }
  settings.halfKing = settings.halfCounts.w.k === 1 && settings.halfCounts.b.k === 1;
  if (settings.halfPosition !== null) settings.halfPosition = validateArenaPosition(settings.halfPosition, settings);
  if (typeof settings.customFen !== 'string' || settings.customFen.length > 200) throw new Error('Enter a valid FEN position.');
  settings.customFen = settings.customFen.trim();
  if (settings.mode === 'endgame' && settings.endgameId !== 'custom' && !ENDGAMES.some((position) => position.id === settings.endgameId)) throw new Error('Choose a classic endgame.');
  if (settings.mode === 'custom' || (settings.mode === 'endgame' && settings.endgameId === 'custom')) {
    if (!settings.customFen) throw new Error('Enter a FEN position with one king on each side.');
    // chess.js validates kings, pawn ranks, square counts and metadata.
    const position = new Chess(settings.customFen);
    // Validate raw special-move metadata before calling fen()/moves(): chess.js can
    // temporarily simulate a phantom en-passant capture while formatting an invalid FEN.
    const fields = settings.customFen.split(/\s+/);
    const placement = fields[0];
    const turn = position.turn();
    const castling = fields[2] ?? '-';
    for (const [flag, color, kingSquare, rookSquare] of [['K', 'w', 'e1', 'h1'], ['Q', 'w', 'e1', 'a1'], ['k', 'b', 'e8', 'h8'], ['q', 'b', 'e8', 'a8']]) {
      if (!castling.includes(flag)) continue;
      const king = position.get(kingSquare);
      const rook = position.get(rookSquare);
      if (king?.type !== 'k' || king.color !== color || rook?.type !== 'r' || rook.color !== color) {
        throw new Error('Castling rights require the matching king and rook on their original squares.');
      }
    }
    const enPassant = fields[3];
    if (enPassant && enPassant !== '-') {
      const file = enPassant[0];
      const pawn = position.get(`${file}${turn === 'w' ? '5' : '4'}`);
      const origin = `${file}${turn === 'w' ? '7' : '2'}`;
      if (pawn?.type !== 'p' || pawn.color === turn || position.get(enPassant) || position.get(origin)) {
        throw new Error('The en-passant square must follow a real opposing pawn double move.');
      }
    }
    const opposingTurn = new Chess(`${placement} ${turn === 'w' ? 'b' : 'w'} - - 0 1`);
    if (opposingTurn.isCheck()) throw new Error('The player who just moved cannot leave their own king in check. Check the kings and side to move.');
  }
  return {
    mode: settings.mode, undoMode: settings.undoMode, undoLimit: settings.undoLimit, playerCount: settings.playerCount, partyVariant: settings.partyVariant,
    timeControl: settings.timeControl, endgameId: settings.endgameId, customFen: settings.customFen,
    halfKing: settings.halfKing, halfShape: settings.halfShape, halfCounts: settings.halfCounts,
    halfPlacement: settings.halfPlacement, halfPosition: settings.halfPosition, halfWin: settings.halfWin,
  };
}

const squareName = (file, rank) => `${'abcdefgh'[file]}${rank + 1}`;
const parseSquare = (square, width, height) => {
  if (typeof square !== 'string' || !/^[a-h][1-8]$/.test(square)) return null;
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return file < width && rank < height ? [file, rank] : null;
};

export function getArenaDimensions(shape = '8x4') {
  if (shape === '8x4') return { width: 8, height: 4 };
  if (shape === '4x8') return { width: 4, height: 8 };
  if (shape === '8x8') return { width: 8, height: 8 };
  throw new Error('Choose an 8 × 4, 4 × 8, or 8 × 8 Chaos Kingdom board.');
}

/** Drafts may omit kings while editing, but capture-king games need both to start. */
export function hasMissingArenaKings(rawSettings = {}) {
  const settings = normalizeSettings(rawSettings);
  return settings.mode === 'half' && settings.halfWin === 'capture-king'
    && (settings.halfCounts.w.k !== 1 || settings.halfCounts.b.k !== 1);
}

function validateArenaPosition(position, settings) {
  if (!Array.isArray(position) || position.length > 32) throw new Error('Provide a starting position containing the selected pieces.');
  const { width, height } = getArenaDimensions(settings.halfShape);
  const occupied = new Set();
  const counts = Object.fromEntries(['w', 'b'].map(color => [color, Object.fromEntries(Object.keys(STANDARD_ROSTER).map(type => [type, 0]))]));
  const validated = Array.from(position, piece => {
    if (!piece || typeof piece !== 'object' || Array.isArray(piece)
      || !['w', 'b'].includes(piece.color) || typeof piece.type !== 'string'
      || !Object.hasOwn(STANDARD_ROSTER, piece.type)) throw new Error('Every piece needs a valid color and piece type.');
    const square = parseSquare(piece.square, width, height);
    if (!square) throw new Error('Place every piece on a square inside the selected board.');
    if (occupied.has(piece.square)) throw new Error('Two pieces cannot occupy the same square.');
    const [, rank] = square;
    if (settings.halfPlacement === 'territory' && (piece.color === 'w' ? rank >= height / 2 : rank < height / 2)) {
      throw new Error('In Own half mode, White starts in the bottom half and Black in the top half.');
    }
    occupied.add(piece.square);
    counts[piece.color][piece.type]++;
    return { square: piece.square, type: piece.type, color: piece.color };
  });
  for (const color of ['w', 'b']) {
    if (Object.keys(STANDARD_ROSTER).some(type => counts[color][type] !== settings.halfCounts[color][type])) {
      throw new Error('The starting position must contain exactly the pieces selected for each player.');
    }
  }
  return validated;
}

function automaticArenaPosition(settings) {
  const { width, height } = getArenaDimensions(settings.halfShape);
  const position = [];
  const files = { r: [0, 7], n: [1, 6], b: [2, 5], q: [3], k: [4], p: [3, 4, 2, 5, 1, 6, 0, 7] };
  // Four-file armies use two back ranks and two pawn ranks. Rotate Black's
  // slots 180 degrees so even one pawn per side starts on staggered files.
  const narrowSlots = {
    r: [[0, 0], [3, 0]], n: [[1, 0], [2, 0]], b: [[0, 1], [3, 1]],
    q: [[1, 1]], k: [[2, 1]],
    p: [[1, 2], [2, 2], [0, 2], [3, 2], [1, 3], [2, 3], [0, 3], [3, 3]],
  };
  for (const color of ['w', 'b']) {
    for (const [type, count] of Object.entries(settings.halfCounts[color])) {
      for (let index = 0; index < count; index++) {
        let rank;
        let file;
        if (width === 4) {
          [file, rank] = narrowSlots[type][index];
          if (color === 'b') { file = width - 1 - file; rank = height - 1 - rank; }
        } else {
          rank = color === 'w' ? (type === 'p' ? 1 : 0) : (type === 'p' ? height - 2 : height - 1);
          file = type === 'p' && color === 'b' ? 7 - files[type][index] : files[type][index];
        }
        position.push({ square: squareName(file, rank), type, color });
      }
    }
  }
  return position;
}

/** Return a separate, validated piece list for a setup editor or a new game. */
export function createArenaPosition(rawSettings = {}) {
  const settings = normalizeSettings(rawSettings);
  return settings.halfPosition ?? automaticArenaPosition(settings);
}

/** Move into an empty square or swap two pieces without changing either roster. */
export function swapArenaPieces(rawSettings, from, to) {
  const settings = normalizeSettings(rawSettings);
  const { width, height } = getArenaDimensions(settings.halfShape);
  if (!parseSquare(from, width, height) || !parseSquare(to, width, height)) throw new Error('Choose two squares inside the selected board.');
  const position = settings.halfPosition ?? automaticArenaPosition(settings);
  const source = position.find(piece => piece.square === from);
  if (!source) throw new Error('Choose a piece to move first.');
  const target = position.find(piece => piece.square === to);
  source.square = to;
  if (target && target !== source) target.square = from;
  return validateArenaPosition(position, settings);
}

const other = (color) => color === 'w' ? 'b' : 'w';
const knightSteps = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const diagonalSteps = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const straightSteps = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class HalfChess {
  constructor(settings, { allowIncompleteArena = false } = {}) {
    const normalized = normalizeSettings(settings);
    if (allowIncompleteArena !== true && normalized.halfWin === 'capture-king'
      && (normalized.halfCounts.w.k !== 1 || normalized.halfCounts.b.k !== 1)) {
      throw new Error('Capture the king requires one king for each player before starting. Add the missing king or choose Capture all pieces.');
    }
    this.halfWin = normalized.halfWin;
    ({ width: this.width, height: this.height } = getArenaDimensions(normalized.halfShape));
    this.cells = Array.from({ length: this.height }, () => Array(this.width).fill(null));
    this.active = 'w';
    this.records = [];
    this.halfmove = 0;
    this.positions = [];
    for (const { square, type, color } of normalized.halfPosition ?? automaticArenaPosition(normalized)) {
      const [file, rank] = parseSquare(square, this.width, this.height);
      this.cells[rank][file] = { type, color };
    }
    this.positions.push(this.positionKey());
  }

  board() {
    return this.cells.map((row, rank) => row.map((piece, file) => piece ? { ...piece, square: squareName(file, rank) } : null)).reverse();
  }

  turn() { return this.active; }
  get(square) {
    const coordinate = parseSquare(square, this.width, this.height);
    if (!coordinate) return undefined;
    const [file, rank] = coordinate;
    return this.cells[rank][file] ? { ...this.cells[rank][file] } : undefined;
  }

  moves(options = {}) {
    const result = [];
    const addMove = (piece, file, rank, nextFile, nextRank) => {
      if (nextFile < 0 || nextFile >= this.width || nextRank < 0 || nextRank >= this.height) return false;
      const target = this.cells[nextRank][nextFile];
      if (target?.color === piece.color) return false;
      const base = {
        color: piece.color, from: squareName(file, rank), to: squareName(nextFile, nextRank),
        piece: piece.type, flags: target ? 'c' : 'n', ...(target ? { captured: target.type } : {}),
      };
      const promotions = piece.type === 'p' && nextRank === (piece.color === 'w' ? this.height - 1 : 0) ? ['q', 'r', 'b', 'n'] : [null];
      for (const promotion of promotions) {
        const move = { ...base, ...(promotion ? { promotion, flags: `${base.flags}p` } : {}) };
        move.san = `${piece.type === 'p' ? (target ? 'abcdefgh'[file] : '') : piece.type.toUpperCase()}${target ? 'x' : ''}${move.to}${promotion ? `=${promotion.toUpperCase()}` : ''}`;
        result.push(move);
      }
      return !target;
    };
    for (let rank = 0; rank < this.height; rank++) {
      for (let file = 0; file < this.width; file++) {
        const piece = this.cells[rank][file];
        if (!piece || piece.color !== this.active || (options.square && options.square !== squareName(file, rank))) continue;
        if (piece.type === 'p') {
          const nextRank = rank + (piece.color === 'w' ? 1 : -1);
          if (nextRank < 0 || nextRank >= this.height) continue;
          if (!this.cells[nextRank][file]) addMove(piece, file, rank, file, nextRank);
          for (const nextFile of [file - 1, file + 1]) {
            if (this.cells[nextRank][nextFile]?.color === other(piece.color)) addMove(piece, file, rank, nextFile, nextRank);
          }
          continue;
        }
        const steps = piece.type === 'n' ? knightSteps : piece.type === 'b' ? diagonalSteps : piece.type === 'r' ? straightSteps : [...diagonalSteps, ...straightSteps];
        const maximum = ['k', 'n'].includes(piece.type) ? 1 : Math.max(this.width, this.height) - 1;
        for (const [dx, dy] of steps) {
          for (let step = 1; step <= maximum; step++) {
            if (!addMove(piece, file, rank, file + dx * step, rank + dy * step)) break;
          }
        }
      }
    }
    return options.verbose ? result : result.map((move) => move.san);
  }

  move(input) {
    if (this.halfWin === 'capture-king' && this.records.at(-1)?.move.captured === 'k') throw new Error('This game has ended.');
    const chosen = this.moves({ verbose: true }).find((move) => typeof input === 'string' ? move.san === input
      : move.from === input?.from && move.to === input?.to && move.promotion === input?.promotion);
    if (!chosen) throw new Error('Illegal move.');
    const [fromFile, fromRank] = parseSquare(chosen.from, this.width, this.height);
    const [toFile, toRank] = parseSquare(chosen.to, this.width, this.height);
    this.records.push({ move: chosen, halfmove: this.halfmove });
    this.cells[toRank][toFile] = { color: chosen.color, type: chosen.promotion ?? chosen.piece };
    this.cells[fromRank][fromFile] = null;
    this.halfmove = chosen.piece === 'p' || chosen.captured ? 0 : this.halfmove + 1;
    this.active = other(this.active);
    this.positions.push(this.positionKey());
    return { ...chosen };
  }

  undo() {
    const previous = this.records.pop();
    if (!previous) return null;
    const move = previous.move;
    const [fromFile, fromRank] = parseSquare(move.from, this.width, this.height);
    const [toFile, toRank] = parseSquare(move.to, this.width, this.height);
    this.cells[fromRank][fromFile] = { type: move.piece, color: move.color };
    this.cells[toRank][toFile] = move.captured ? { type: move.captured, color: other(move.color) } : null;
    this.active = move.color;
    this.halfmove = previous.halfmove;
    this.positions.pop();
    return { ...move };
  }

  history(options = {}) { return this.records.map(({ move }) => options.verbose ? { ...move } : move.san); }
  positionKey() {
    return `${this.cells.slice().reverse().map((row) => {
      let empty = 0;
      let encoded = '';
      for (const piece of row) {
        if (!piece) { empty++; continue; }
        if (empty) { encoded += empty; empty = 0; }
        encoded += piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
      }
      return encoded + (empty || '');
    }).join('/')} ${this.active}`;
  }
  fen() { return `${this.positionKey()} - - ${this.halfmove} ${Math.floor(this.records.length / 2) + 1}`; }
  isCheck() { return false; }
  isCheckmate() { return false; }
  isStalemate() { return this.cells.flat().some((piece) => piece?.color === this.active) && this.moves().length === 0; }
  isInsufficientMaterial() { return false; }
  isThreefoldRepetition() { const current = this.positionKey(); return this.positions.filter((key) => key === current).length >= 3; }
  isDrawByFiftyMoves() { return this.halfmove >= 100; }
  isGameOver() { return Boolean(getGameOutcome(this, { mode: 'half', halfWin: this.halfWin })); }
}

export function createGame(rawSettings = {}, options = {}) {
  const settings = normalizeSettings(rawSettings);
  if (settings.mode === 'party') return new PartyChess(settings);
  if (settings.mode === 'half') return new HalfChess(settings, options);
  if (settings.mode === 'custom' || (settings.mode === 'endgame' && settings.endgameId === 'custom')) return new Chess(settings.customFen);
  if (settings.mode === 'endgame') return new Chess(ENDGAMES.find((position) => position.id === settings.endgameId).fen);
  return new Chess();
}

export function getGameOutcome(game, settings) {
  if (settings.mode === 'party') return game.outcome();
  if (settings.mode === 'half') {
    if ((settings.halfWin ?? game.halfWin) === 'capture-king') {
      const lastMove = game.history({ verbose: true }).at(-1);
      if (lastMove?.captured === 'k') return { winner: lastMove.color, reason: 'capture-king' };
    }
    const pieces = game.board().flat().filter(Boolean);
    if (!pieces.some((piece) => piece.color === game.turn())) return { winner: other(game.turn()), reason: 'capture-all' };
  }
  if (game.isCheckmate()) return { winner: other(game.turn()), reason: 'checkmate' };
  if (game.isStalemate()) return { winner: null, reason: 'stalemate' };
  if (game.isInsufficientMaterial()) return { winner: null, reason: 'insufficient-material' };
  if (game.isThreefoldRepetition()) return { winner: null, reason: 'threefold-repetition' };
  if (game.isDrawByFiftyMoves()) return { winner: null, reason: 'fifty-move-rule' };
  return null;
}
