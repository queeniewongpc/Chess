// Hints describe engine-provided legal moves; they never generate or allow moves.
export function getMoveHints(legalMoves, selected, { enabled = true, canPlay = true } = {}) {
  const origins = new Set();
  const destinations = new Set();
  const captures = new Set();
  if (!enabled || !canPlay) return { origins, destinations, captures };
  for (const move of legalMoves) {
    if (!selected) origins.add(move.from);
    else if (move.from === selected) {
      destinations.add(move.to);
      if (move.captured || move.flags?.includes('e')) captures.add(move.to);
    }
  }
  return { origins, destinations, captures };
}
