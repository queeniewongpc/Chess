import { createGame } from './game.js';
import { partyHomeSquare } from './partyGeometry.js';

const COLORS = ['w', 'b', 'red', 'blue', 'yellow', 'green'];
const occupied = board => (board ?? []).flat().filter(Boolean);

function homeOrder(piece, settings) {
  if (settings.mode === 'party') {
    // Order the army from its own seat, even when its files run vertically.
    for (let rank = 0; rank < 2; rank++) for (let file = 0; file < 8; file++) {
      if (piece.square === partyHomeSquare(settings.playerCount ?? 4, piece.color, file, rank)) return rank * 8 + file;
    }
  }
  const rank = Number(piece.square.slice(1));
  return (piece.color === 'b' ? 15 - rank : rank) * 16 + piece.square.charCodeAt(0);
}

function castleRook(move, settings) {
  const kingside = move.flags?.includes('k');
  const queenside = move.flags?.includes('q');
  if (move.piece !== 'k' || (!kingside && !queenside)) return null;
  const [fromFile, toFile] = kingside ? [7, 5] : [0, 3];
  if (settings.mode === 'party') {
    return {
      from: partyHomeSquare(settings.playerCount ?? 4, move.color, fromFile),
      to: partyHomeSquare(settings.playerCount ?? 4, move.color, toFile),
    };
  }
  const rank = move.color === 'w' ? '1' : '8';
  return { from: `${'abcdefgh'[fromFile]}${rank}`, to: `${'abcdefgh'[toFile]}${rank}` };
}

/**
 * Cosmetic identities are derived from the agreed starting position and public
 * move history. Nothing is written into game rules, snapshots, or saved games.
 *
 * `pieces` is a square -> character object for rendering. `roster` contains the
 * original characters, including captured ones. Each descriptor has a stable
 * id, color, origin, birthType, ordinal (within its army), typeOrdinal (within
 * its birth type), and globally distinct numeric variant. Only type/inactive
 * can change. Promotion therefore keeps the pawn's original face and costume.
 *
 * `events` has one entry per reconstructable move, including the moving actor,
 * actual victim, capturedSquare (different from `to` for en passant), arriving
 * character after promotion, and motions for the actor plus a castling rook.
 * Event keys identify a ply's animation; replay/undo eligibility belongs to the
 * viewer's animation controller, not this history reconstruction.
 *
 * Pass the authoritative currentBoard and current Party `eliminations` to
 * reconcile resignations/timeouts, which do not add a move to Party history.
 * Elimination ply N takes effect after move N, so a later capture retains the
 * victim's inactive appearance. Use only the current snapshot's eliminations:
 * an undo can remove a move-caused elimination. Unknown pieces
 * are not assigned guessed identities. Callers can retain their ordinary art
 * for those pieces. Rebuild when settings/history change; clock ticks alone do
 * not need a replay. Invalid draft settings may throw the normal setup error.
 */
export function buildCharacterTimeline(settings = {}, history = [], currentBoard = null, eliminations = []) {
  const initial = occupied(createGame(settings, { allowIncompleteArena: true }).board());
  initial.sort((a, b) => COLORS.indexOf(a.color) - COLORS.indexOf(b.color)
    || homeOrder(a, settings) - homeOrder(b, settings)
    || a.square.localeCompare(b.square));
  const counts = new Map();
  const typeCounts = new Map();
  const roster = initial.map(piece => {
    const ordinal = counts.get(piece.color) ?? 0;
    const typeKey = `${piece.color}:${piece.type}`;
    const typeOrdinal = typeCounts.get(typeKey) ?? 0;
    counts.set(piece.color, ordinal + 1);
    typeCounts.set(typeKey, typeOrdinal + 1);
    return {
      id: `${piece.color}:${piece.square}`, color: piece.color, origin: piece.square,
      birthType: piece.type, type: piece.type, ordinal, typeOrdinal,
      variant: COLORS.indexOf(piece.color) * 64 + ordinal, inactive: Boolean(piece.inactive),
    };
  });
  const squares = new Map(roster.map(character => [character.origin, character]));
  const events = [];
  const eliminatedAt = new Map();
  for (const record of eliminations) {
    if (!Number.isSafeInteger(record?.ply) || record.ply < 0 || record.ply > history.length) continue;
    const colors = eliminatedAt.get(record.ply) ?? new Set();
    colors.add(record.color);
    eliminatedAt.set(record.ply, colors);
  }
  const markEliminatedAt = ply => {
    const colors = eliminatedAt.get(ply);
    if (!colors) return;
    for (const [square, character] of squares) if (colors.has(character.color)) {
      squares.set(square, { ...character, inactive: true });
    }
  };
  for (const [index, move] of history.entries()) {
    markEliminatedAt(index);
    const actor = squares.get(move?.from);
    // Histories supplied by the game are complete and validated. A corrupt or
    // incomplete imported history must not relabel an unrelated piece.
    if (!actor || actor.color !== move.color || actor.type !== move.piece || !move.to) continue;
    const isEnPassant = settings.mode !== 'party' && move.flags?.includes('e');
    const capturedSquare = move.captured
      ? (isEnPassant ? `${move.to[0]}${move.from.slice(1)}` : move.to) : null;
    const victim = capturedSquare ? squares.get(capturedSquare) ?? null : null;
    const arriving = { ...actor, type: move.promotion ?? actor.type };
    const motions = [{ from: move.from, to: move.to, character: actor, arriving }];
    squares.delete(move.from);
    if (capturedSquare) squares.delete(capturedSquare);
    squares.set(move.to, arriving);

    const rookMove = castleRook(move, settings);
    const rook = rookMove && squares.get(rookMove.from);
    if (rook?.type === 'r' && rook.color === move.color) {
      squares.delete(rookMove.from);
      squares.set(rookMove.to, rook);
      motions.push({ ...rookMove, character: rook, arriving: rook });
    }
    if (move.eliminated?.length) {
      const eliminated = new Set(move.eliminated.map(record => record.color));
      for (const [square, character] of squares) if (eliminated.has(character.color)) {
        squares.set(square, { ...character, inactive: true });
      }
    }
    const ply = index + 1;
    events.push({
      key: `${ply}:${actor.id}:${move.from}:${move.to}:${move.promotion ?? ''}:${victim?.id ?? ''}`,
      ply, move: Object.fromEntries(Object.entries(move).filter(([, value]) => value !== undefined)),
      actor, arriving, victim, capturedSquare, motions,
    });
  }
  markEliminatedAt(history.length);

  const pieces = {};
  if (currentBoard === null) {
    for (const [square, character] of squares) pieces[square] = character;
  } else {
    for (const piece of occupied(currentBoard)) {
      const character = squares.get(piece.square);
      if (character?.color === piece.color) pieces[piece.square] = {
        ...character, type: piece.type, inactive: Boolean(piece.inactive),
      };
    }
  }
  return { pieces, events, roster };
}
