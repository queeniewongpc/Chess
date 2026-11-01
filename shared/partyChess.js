import { PARTY_COLORS, partyColors, partyCoordinate, partyDiagonalSteps, partyForward, partyHomeSquare, partySquare, partyStep, partyWalk, getPartyGeometry } from './partyGeometry.js';
import { partyTeamColors, partyTeamFor, samePartyTeam } from './partyTeams.js';

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const BACK_RANK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
const PROMOTIONS = ['q', 'r', 'b', 'n'];
const clone = (value) => JSON.parse(JSON.stringify(value));

function publicMove(move) {
  const { nextForward, castle, ...result } = move;
  return clone(result);
}

/** Queenie's free-for-all or fixed-team chess on a cross or three-sector hexagon. */
export class PartyChess {
  constructor(settings = {}, fixture = null) {
    this.playerCount = settings.playerCount ?? 4;
    this.partyVariant = settings.partyVariant ?? 'ffa';
    if (!['ffa', 'teams'].includes(this.partyVariant)) throw new Error('Choose a valid multiplayer format.');
    if (this.partyVariant === 'teams' && this.playerCount !== 4) throw new Error('2 vs 2 requires four players.');
    this.colors = partyColors(this.playerCount);
    this.geometry = getPartyGeometry(this.playerCount);
    this.cells = new Map();
    this.active = this.colors[0];
    this.removed = [];
    this.records = [];
    this.events = [];
    this.positions = [];
    this.halfmove = 0;
    this.teamOutcome = null;
    for (const color of this.colors) for (let file = 0; file < 8; file++) {
      this.cells.set(partyHomeSquare(this.playerCount, color, file, 0), { type: BACK_RANK[file], color, moved: false });
      this.cells.set(partyHomeSquare(this.playerCount, color, file, 1), { type: 'p', color, moved: false, forward: 1 });
    }
    // Sparse positions are an engine-test facility, never accepted from room settings.
    if (fixture) this._loadFixture(fixture);
    this._settleTurn();
    this.positions.push(this._positionKey());
  }

  _loadFixture({ pieces, turn = this.colors[0], eliminated = [], halfmove = 0 }) {
    if (!Array.isArray(pieces) || !this.colors.includes(turn)) throw new Error('Invalid Party position.');
    this.cells.clear();
    for (const piece of pieces) {
      if (!piece || !this.colors.includes(piece.color) || !BACK_RANK.concat('p').includes(piece.type)
        || !partyCoordinate(this.playerCount, piece.square) || this.cells.has(piece.square)) throw new Error('Invalid Party piece.');
      const { square, ...value } = piece;
      this.cells.set(square, { ...value, moved: Boolean(value.moved), ...(piece.type === 'p' ? { forward: piece.forward ?? 1 } : {}) });
    }
    if (this.partyVariant === 'teams' && eliminated.length) throw new Error('A team game cannot continue with an eliminated army.');
    this.removed = eliminated.map(color => ({ color, reason: 'resignation', ply: 0 }));
    for (const color of this.colors) {
      if ([...this.cells.values()].filter(piece => piece.color === color && piece.type === 'k').length !== 1) throw new Error('Every Party army needs exactly one king.');
    }
    this.active = turn;
    this.halfmove = halfmove;
  }

  activeColors() { return this.colors.filter(color => !this.removed.some(record => record.color === color)); }
  _friendly(first, second) { return first === second || (this.partyVariant === 'teams' && samePartyTeam(first, second)); }
  eliminations() { return clone(this.removed); }
  turn() { return this.active; }
  get(square) {
    const piece = this.cells.get(square);
    return piece ? { ...piece, square, inactive: !this.activeColors().includes(piece.color) } : undefined;
  }
  board() {
    if (this.playerCount === 4) return Array.from({ length: 14 }, (_, row) => Array.from({ length: 14 }, (_, file) => this.get(partySquare(4, 0, file, 13 - row)) ?? null));
    return this.colors.map((_, sector) => Array.from({ length: 32 }, (_, index) => this.get(partySquare(3, sector, index % 8, 3 - Math.floor(index / 8))) ?? null));
  }

  _nextSquares(square, dx, dy) {
    if (dx && dy) return partyDiagonalSteps(this.playerCount, square, dx, dy);
    const next = partyStep(this.playerCount, square, dx, dy);
    return next ? [next] : [];
  }

  _rayTargets(square, dx, dy, maximum = 200) {
    const results = [];
    const stack = [{ square, dx, dy, steps: 0 }];
    const visited = new Set();
    while (stack.length) {
      const current = stack.pop();
      for (const next of this._nextSquares(current.square, current.dx, current.dy)) {
        const nextDx = current.dx * next.frame;
        const nextDy = current.dy * next.frame;
        const key = `${next.square}:${nextDx}:${nextDy}`;
        if (next.square === square || visited.has(key)) continue;
        visited.add(key);
        results.push(next.square);
        if (!this.cells.has(next.square) && current.steps + 1 < maximum) stack.push({ square: next.square, dx: nextDx, dy: nextDy, steps: current.steps + 1 });
      }
    }
    return results;
  }

  _knightTargets(square) {
    const results = new Set();
    for (const [dx, dy] of ORTHOGONAL) for (const sign of [-1, 1]) {
      const along = [dx, dy];
      const across = [-dy * sign, dx * sign];
      for (const steps of [[along, along, across], [along, across, along], [across, along, along]]) {
        const next = partyWalk(this.playerCount, square, steps);
        if (next && next.square !== square) results.add(next.square);
      }
    }
    return [...results];
  }

  _pawnDirection(piece) {
    return this.playerCount === 3 ? [0, piece.forward ?? 1] : partyForward(4, piece.color);
  }

  _pawnAttacks(square, piece) {
    const [dx, dy] = this._pawnDirection(piece);
    return [-1, 1].flatMap(side => partyDiagonalSteps(this.playerCount, square, dx - dy * side, dy + dx * side));
  }

  _attacks(square, piece) {
    if (piece.type === 'p') return this._pawnAttacks(square, piece).map(next => next.square);
    if (piece.type === 'n') return this._knightTargets(square);
    const directions = piece.type === 'r' ? ORTHOGONAL : piece.type === 'b' ? DIAGONAL : [...ORTHOGONAL, ...DIAGONAL];
    return directions.flatMap(([dx, dy]) => this._rayTargets(square, dx, dy, piece.type === 'k' ? 1 : 200));
  }

  _isAttacked(square, color) {
    const alive = this.activeColors();
    for (const [from, piece] of this.cells) {
      if (!this._friendly(piece.color, color) && alive.includes(piece.color) && this._attacks(from, piece).includes(square)) return true;
    }
    return false;
  }

  isCheck(color = this.active) {
    if (!this.activeColors().includes(color)) return false;
    const king = [...this.cells].find(([, piece]) => piece.color === color && piece.type === 'k');
    return !king || this._isAttacked(king[0], color);
  }

  _promotes(square, piece) {
    const target = partyCoordinate(this.playerCount, square);
    if (this.playerCount === 3) return target.sector !== this.colors.indexOf(piece.color) && target.rank === 0;
    const progress = piece.color === 'red' ? target.rank : piece.color === 'blue' ? target.file : piece.color === 'yellow' ? 13 - target.rank : 13 - target.file;
    return progress >= 7;
  }

  _makeCandidate(from, to, piece, extra = {}) {
    const target = this.cells.get(to);
    if (target && this._friendly(target.color, piece.color)) return [];
    if (target?.type === 'k' && this.activeColors().includes(target.color)) return [];
    const base = {
      color: piece.color, from, to, piece: piece.type, flags: target ? 'c' : 'n',
      ...(target ? { captured: target.type, capturedColor: target.color } : {}), ...extra,
    };
    const promotions = piece.type === 'p' && this._promotes(to, piece) ? PROMOTIONS : [null];
    return promotions.map(promotion => ({
      ...base, ...(promotion ? { promotion, flags: `${base.flags}p` } : {}),
      san: `${piece.type === 'p' ? '' : piece.type.toUpperCase()}${from}${target ? 'x' : '-'}${to}${promotion ? `=${promotion.toUpperCase()}` : ''}`,
    }));
  }

  _pseudoMoves(color) {
    const moves = [];
    for (const [square, piece] of this.cells) {
      if (piece.color !== color) continue;
      if (piece.type === 'p') {
        const [dx, dy] = this._pawnDirection(piece);
        const next = partyStep(this.playerCount, square, dx, dy);
        if (next && !this.cells.has(next.square)) {
          moves.push(...this._makeCandidate(square, next.square, piece, { nextForward: (piece.forward ?? 1) * next.frame }));
          const homePawn = Array.from({ length: 8 }, (_, file) => partyHomeSquare(this.playerCount, color, file, 1)).includes(square);
          if (!piece.moved && homePawn) {
            const double = partyStep(this.playerCount, next.square, dx * next.frame, dy * next.frame);
            if (double && !this.cells.has(double.square)) moves.push(...this._makeCandidate(square, double.square, piece, { flags: 'b', nextForward: (piece.forward ?? 1) * next.frame * double.frame }));
          }
        }
        for (const target of this._pawnAttacks(square, piece)) {
          if (this.cells.has(target.square)) moves.push(...this._makeCandidate(square, target.square, piece, { nextForward: (piece.forward ?? 1) * target.frame }));
        }
      } else {
        for (const target of new Set(this._attacks(square, piece))) moves.push(...this._makeCandidate(square, target, piece));
      }
    }
    return moves;
  }

  _withMove(move, inspect) {
    const original = this.cells.get(move.from);
    const captured = this.cells.get(move.to);
    const rook = move.castle ? this.cells.get(move.castle.from) : null;
    this.cells.delete(move.from);
    this.cells.set(move.to, { ...original, type: move.promotion ?? original.type, moved: true, ...(original.type === 'p' ? { forward: move.nextForward ?? original.forward } : {}) });
    if (move.castle) {
      this.cells.delete(move.castle.from);
      this.cells.set(move.castle.to, { ...rook, moved: true });
    }
    try { return inspect(); } finally {
      this.cells.set(move.from, original);
      if (captured) this.cells.set(move.to, captured); else this.cells.delete(move.to);
      if (move.castle) { this.cells.delete(move.castle.to); this.cells.set(move.castle.from, rook); }
    }
  }

  _castles(color) {
    const kingSquare = partyHomeSquare(this.playerCount, color, 4, 0);
    const king = this.cells.get(kingSquare);
    if (king?.type !== 'k' || king.color !== color || king.moved || this.isCheck(color)) return [];
    const moves = [];
    for (const [rookFile, transitFile, endFile, rookEnd, path, flag] of [[7, 5, 6, 5, [5, 6], 'k'], [0, 3, 2, 3, [1, 2, 3], 'q']]) {
      const rookSquare = partyHomeSquare(this.playerCount, color, rookFile, 0);
      const rook = this.cells.get(rookSquare);
      if (rook?.type !== 'r' || rook.color !== color || rook.moved || path.some(file => this.cells.has(partyHomeSquare(this.playerCount, color, file, 0)))) continue;
      const transit = { from: kingSquare, to: partyHomeSquare(this.playerCount, color, transitFile, 0) };
      if (this._withMove(transit, () => this.isCheck(color))) continue;
      const move = {
        color, from: kingSquare, to: partyHomeSquare(this.playerCount, color, endFile, 0), piece: 'k', flags: flag,
        castle: { from: rookSquare, to: partyHomeSquare(this.playerCount, color, rookEnd, 0) }, san: flag === 'k' ? 'O-O' : 'O-O-O',
      };
      if (!this._withMove(move, () => this.isCheck(color))) moves.push(move);
    }
    return moves;
  }

  _legalMoves(color) {
    if (!this.activeColors().includes(color)) return [];
    return this._pseudoMoves(color).filter(move => !this._withMove(move, () => this.isCheck(color))).concat(this._castles(color));
  }

  moves(options = {}) {
    if (this.outcome()) return [];
    const moves = this._legalMoves(this.active).filter(move => !options.square || move.from === options.square);
    return options.verbose ? moves.map(publicMove) : moves.map(move => move.san);
  }

  _captureState() {
    return { cells: clone([...this.cells]), active: this.active, removed: clone(this.removed), halfmove: this.halfmove, positions: this.positions.slice(), eventCount: this.events.length, teamOutcome: clone(this.teamOutcome) };
  }

  _restoreCapture(state) {
    this.cells = new Map(clone(state.cells));
    this.active = state.active;
    this.removed = clone(state.removed);
    this.halfmove = state.halfmove;
    this.positions = state.positions.slice();
    this.events.length = state.eventCount;
    this.teamOutcome = clone(state.teamOutcome ?? null);
  }

  _advance() {
    const index = this.colors.indexOf(this.active);
    const alive = this.activeColors();
    for (let offset = 1; offset <= this.colors.length; offset++) {
      const next = this.colors[(index + offset) % this.colors.length];
      if (alive.includes(next)) { this.active = next; return; }
    }
  }

  _settleTurn() {
    if (this.partyVariant === 'teams') {
      if (!this.teamOutcome && this._legalMoves(this.active).length === 0) {
        this.teamOutcome = this.isCheck(this.active)
          ? this._teamDefeat(this.active, 'checkmate')
          : { winner: null, reason: 'stalemate' };
      }
      return;
    }
    while (this.activeColors().length > 1 && this._legalMoves(this.active).length === 0) {
      this.removed.push({ color: this.active, reason: this.isCheck(this.active) ? 'checkmate' : 'stalemate', ply: this.records.length });
      this.halfmove = 0;
      this._advance();
    }
  }

  _teamDefeat(color, reason) {
    const winningTeam = partyTeamFor(color) === 'red-yellow' ? 'blue-green' : 'red-yellow';
    const winners = partyTeamColors(winningTeam);
    return { winner: winners[0], winners, winningTeam, reason, defeated: color };
  }

  move(input) {
    if (this.outcome()) throw new Error('This game has ended.');
    const move = this._legalMoves(this.active).find(candidate => typeof input === 'string' ? candidate.san === input
      : candidate.from === input?.from && candidate.to === input?.to && candidate.promotion === input?.promotion);
    if (!move) throw new Error('That move is not legal. Choose another square.');
    const before = this._captureState();
    const original = this.cells.get(move.from);
    this.cells.delete(move.from);
    this.cells.set(move.to, { ...original, type: move.promotion ?? original.type, moved: true, ...(original.type === 'p' ? { forward: move.nextForward ?? original.forward } : {}) });
    if (move.castle) {
      const rook = this.cells.get(move.castle.from);
      this.cells.delete(move.castle.from);
      this.cells.set(move.castle.to, { ...rook, moved: true });
    }
    this.halfmove = move.piece === 'p' || move.captured ? 0 : this.halfmove + 1;
    const record = publicMove(move);
    this.records.push({ move: record, before });
    this.events.push({ kind: 'move', from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
    this._advance();
    this._settleTurn();
    const eliminated = this.removed.slice(before.removed.length);
    if (eliminated.length) record.eliminated = clone(eliminated);
    this.positions.push(this._positionKey());
    return clone(record);
  }

  eliminate(color, reason = 'resignation') {
    if (this.outcome()) throw new Error('This game has ended.');
    if (!this.activeColors().includes(color) || !['resignation', 'timeout'].includes(reason)) throw new Error('Choose an active player and a valid elimination reason.');
    const result = { color, reason, ply: this.records.length };
    if (this.partyVariant === 'teams') {
      this.teamOutcome = this._teamDefeat(color, reason);
      this.events.push({ kind: 'eliminate', color, reason });
      return clone(result);
    }
    this.removed.push(result);
    this.events.push({ kind: 'eliminate', color, reason });
    this.halfmove = 0;
    if (this.active === color) this._advance();
    this._settleTurn();
    this.positions.push(this._positionKey());
    return clone(result);
  }

  undo() {
    const previous = this.records.pop();
    if (!previous) return null;
    this._restoreCapture(previous.before);
    return clone(previous.move);
  }

  history(options = {}) { return this.records.map(record => options.verbose ? clone(record.move) : record.move.san); }
  exportState() { return { version: 1, playerCount: this.playerCount, partyVariant: this.partyVariant, events: clone(this.events) }; }
  restoreState(state) {
    const restored = PartyChess.restore({ playerCount: this.playerCount, partyVariant: this.partyVariant }, state);
    Object.assign(this, restored);
    return this;
  }
  static restore(settings, state) {
    if (!state || state.version !== 1 || state.playerCount !== (settings.playerCount ?? 4)
      || (state.partyVariant ?? 'ffa') !== (settings.partyVariant ?? 'ffa')
      || !Array.isArray(state.events) || state.events.length > 10000) throw new Error('Invalid saved Party game.');
    const game = new PartyChess(settings);
    for (const event of state.events) {
      if (event?.kind === 'move') game.move({ from: event.from, to: event.to, ...(event.promotion ? { promotion: event.promotion } : {}) });
      else if (event?.kind === 'eliminate') game.eliminate(event.color, event.reason);
      else throw new Error('Invalid saved Party event.');
    }
    return game;
  }

  _positionKey() {
    return `${this.active}|${this.activeColors().join(',')}|${[...this.cells].sort(([a], [b]) => a.localeCompare(b)).map(([square, piece]) => `${square}:${piece.color}:${piece.type}:${piece.type === 'p' ? piece.forward ?? 1 : ''}:${['k', 'r', 'p'].includes(piece.type) && piece.moved ? 1 : 0}`).join(';')}`;
  }
  fen() { return `party${this.playerCount}${this.partyVariant === 'teams' ? '-teams' : ''}|${this._positionKey()}|${this.halfmove}`; }
  isCheckmate() { return this.teamOutcome?.reason === 'checkmate'; }
  isStalemate() { return this.teamOutcome?.reason === 'stalemate'; }
  isInsufficientMaterial() { return false; }
  isThreefoldRepetition() { const position = this._positionKey(); return this.positions.filter(item => item === position).length >= 3; }
  isDrawByFiftyMoves() { return this.halfmove >= 50 * this.activeColors().length; }
  outcome() {
    if (this.teamOutcome) return clone(this.teamOutcome);
    const active = this.activeColors();
    if (active.length === 1) return { winner: active[0], reason: 'last-player-standing' };
    if (this.isThreefoldRepetition()) return { winner: null, reason: 'threefold-repetition' };
    if (this.isDrawByFiftyMoves()) return { winner: null, reason: 'fifty-move-rule' };
    return null;
  }
  isGameOver() { return Boolean(this.outcome()); }
}
