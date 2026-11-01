export const PARTY_COLORS = Object.freeze(['red', 'blue', 'yellow', 'green']);
const PREFIXES = ['r', 'b', 'y'];
const FILES = 'abcdefghijklmn';
const cache = new Map();
const round = (number) => Math.round(number * 1000) / 1000;

export function partyColors(playerCount = 4) {
  if (![3, 4].includes(playerCount)) throw new Error('Choose three or four players.');
  return PARTY_COLORS.slice(0, playerCount);
}

export function partySquare(playerCount, sector, file, rank) {
  if (playerCount === 4) return `${FILES[file]}${rank + 1}`;
  return `${PREFIXES[sector]}${FILES[file]}${rank + 1}`;
}

export function partyCoordinate(playerCount, square) {
  if (typeof square !== 'string') return null;
  if (playerCount === 4) {
    if (!/^[a-n](?:[1-9]|1[0-4])$/.test(square)) return null;
    const file = FILES.indexOf(square[0]);
    const rank = Number(square.slice(1)) - 1;
    if ((file < 3 || file > 10) && (rank < 3 || rank > 10)) return null;
    return { sector: 0, file, rank };
  }
  if (!/^[rby][a-h][1-4]$/.test(square)) return null;
  return { sector: PREFIXES.indexOf(square[0]), file: FILES.indexOf(square[1]), rank: Number(square[2]) - 1 };
}

/** Local army coordinates: file 0–7 from the player's left, rank 0 at home. */
export function partyHomeSquare(playerCount, color, file, rank = 0) {
  const seat = PARTY_COLORS.indexOf(color);
  if (playerCount === 3) return partySquare(3, seat, file, rank);
  const transformed = [[file + 3, rank], [rank, 10 - file], [10 - file, 13 - rank], [13 - rank, file + 3]][seat];
  return transformed ? partySquare(4, 0, ...transformed) : null;
}

export function partyForward(playerCount, color) {
  if (playerCount === 3) return [0, 1];
  return [[0, 1], [1, 0], [0, -1], [-1, 0]][PARTY_COLORS.indexOf(color)];
}

/** A single grid-edge step. frame flips when a hex file crosses the center seam. */
export function partyStep(playerCount, square, dx, dy) {
  const coordinate = partyCoordinate(playerCount, square);
  if (!coordinate || Math.abs(dx) + Math.abs(dy) !== 1) return null;
  let { sector, file, rank } = coordinate;
  file += dx;
  rank += dy;
  if (playerCount === 4) {
    const target = partySquare(4, 0, file, rank);
    return file >= 0 && file < 14 && rank >= 0 && rank < 14 && partyCoordinate(4, target) ? { square: target, frame: 1 } : null;
  }
  if (file < 0 || file > 7 || rank < 0) return null;
  if (rank < 4) return { square: partySquare(3, sector, file, rank), frame: 1 };
  sector = (sector + (file < 4 ? 1 : 2)) % 3;
  return { square: partySquare(3, sector, 7 - file, 3), frame: -1 };
}

/** Follow local grid directions, transporting the remaining directions across seams. */
export function partyWalk(playerCount, square, steps) {
  let current = square;
  let frame = 1;
  for (const [dx, dy] of steps) {
    const next = partyStep(playerCount, current, dx * frame, dy * frame);
    if (!next) return null;
    current = next.square;
    frame *= next.frame;
  }
  return { square: current, frame };
}

export function partyDiagonalSteps(playerCount, square, dx, dy) {
  const paths = [[[dx, 0], [0, dy]], [[0, dy], [dx, 0]]];
  const destinations = new Map();
  for (const path of paths) {
    const next = partyWalk(playerCount, square, path);
    if (next && next.square !== square) destinations.set(next.square, next);
  }
  return [...destinations.values()];
}

export function getPartyGeometry(playerCount = 4) {
  partyColors(playerCount);
  if (cache.has(playerCount)) return cache.get(playerCount);
  const cells = [];
  const size = 32;
  let width;
  let height;
  if (playerCount === 4) {
    width = 14 * size;
    height = width;
    for (let rank = 13; rank >= 0; rank--) for (let file = 0; file < 14; file++) {
      const square = partySquare(4, 0, file, rank);
      if (!partyCoordinate(4, square)) continue;
      const x = file * size;
      const y = (13 - rank) * size;
      const sector = rank < 3 ? 'red' : file < 3 ? 'blue' : rank > 10 ? 'yellow' : file > 10 ? 'green' : null;
      cells.push({ square, points: [[x, y], [x + size, y], [x + size, y + size], [x, y + size]], center: { x: x + size / 2, y: y + size / 2 }, shade: (file + rank) % 2, sector });
    }
  } else {
    // Six four-by-four patches meet at one central vertex. Their outer edges
    // form a regular hexagon; each player's army occupies one straight edge.
    const radius = 8 * size;
    width = radius * 2;
    height = radius * Math.sqrt(3);
    const point = (sector, file, rank) => {
      const right = file >= 4;
      const u = right ? (file - 4) / 4 : file / 4;
      const v = rank / 4;
      const bottomLeft = right ? [0, 4 * Math.sqrt(3)] : [-4, 4 * Math.sqrt(3)];
      const bottomRight = right ? [4, 4 * Math.sqrt(3)] : [0, 4 * Math.sqrt(3)];
      const topLeft = right ? [0, 0] : [-6, 2 * Math.sqrt(3)];
      const topRight = right ? [6, 2 * Math.sqrt(3)] : [0, 0];
      const x = (bottomLeft[0] * (1 - u) + bottomRight[0] * u) * (1 - v) + (topLeft[0] * (1 - u) + topRight[0] * u) * v;
      const y = (bottomLeft[1] * (1 - u) + bottomRight[1] * u) * (1 - v) + (topLeft[1] * (1 - u) + topRight[1] * u) * v;
      const angle = sector * 2 * Math.PI / 3;
      return [round(width / 2 + (x * Math.cos(angle) - y * Math.sin(angle)) * size), round(height / 2 + (x * Math.sin(angle) + y * Math.cos(angle)) * size)];
    };
    for (let sector = 0; sector < 3; sector++) for (let rank = 3; rank >= 0; rank--) for (let file = 0; file < 8; file++) {
      const points = [point(sector, file, rank), point(sector, file + 1, rank), point(sector, file + 1, rank + 1), point(sector, file, rank + 1)];
      const [x, y] = point(sector, file + 0.5, rank + 0.5);
      cells.push({ square: partySquare(3, sector, file, rank), points, center: { x, y }, shade: (file + rank) % 2, sector: PARTY_COLORS[sector] });
    }
  }
  const seats = partyColors(playerCount).map((color, index) => ({
    color, label: color[0].toUpperCase() + color.slice(1), rotation: index * 360 / playerCount,
    homeSquares: Array.from({ length: 8 }, (_, file) => partyHomeSquare(playerCount, color, file, 0)),
  }));
  const geometry = { kind: playerCount === 3 ? 'hex' : 'cross', playerCount, width: round(width), height: round(height), viewBox: `0 0 ${round(width)} ${round(height)}`, cells, seats };
  cache.set(playerCount, geometry);
  return geometry;
}
