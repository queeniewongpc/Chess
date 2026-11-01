import { useLayoutEffect, useRef, useState } from 'react';
import ChessPiece from './ChessPiece.jsx';
import CartoonPiece from './CartoonPiece.jsx';
import PlayerShow from './PlayerShow.jsx';
import { getMoveHints } from '../shared/moveHints.js';
import { partyTeamFor, partyTeamColors } from '../shared/partyTeams.js';
import { partySeatCenter, partySeatPresentation } from '../shared/partyPresentation.js';
import './party-shows.css';

export const PARTY_NAMES = { red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green' };
const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export default function PartyBoard({ board, geometry, selected, legalMoves, lastMove, inCheck, turn, local, viewColor, hints, onSquare, enabled, characters, cartoons, moving }) {
  const pieces = new Map(board.flat().filter(Boolean).map(piece => [piece.square, piece]));
  const seatRotation = Object.fromEntries(geometry.seats.map(seat => [seat.color, seat.rotation]));
  const rotation = local ? 0 : -(seatRotation[viewColor] || 0);
  const { origins, destinations, captures } = getMoveHints(legalMoves, selected, { enabled: hints, canPlay: enabled });
  return <svg className={`party-board party-board-${geometry.kind}`} viewBox={geometry.viewBox} role="group" aria-label={`${geometry.seats.length}-player ${geometry.kind === 'hex' ? 'hexagonal' : 'cross-shaped'} chessboard`}>
    <g transform={`rotate(${rotation} ${geometry.width / 2} ${geometry.height / 2})`}>
      {geometry.cells.map(cell => {
        const piece = pieces.get(cell.square);
        const edge = Math.min(...cell.points.map(([x, y], index) => {
          const next = cell.points[(index + 1) % cell.points.length];
          return Math.hypot(next[0] - x, next[1] - y);
        }));
        const size = edge * 1.06;
        const pieceRotation = local ? seatRotation[piece?.color] || 0 : -rotation;
        const target = destinations.has(cell.square);
        return <g key={cell.square} role="button" tabIndex={0} data-square={cell.square} aria-pressed={selected === cell.square} aria-disabled={!enabled && piece?.type !== 'q'}
          className={`party-cell ${cell.shade ? 'is-dark' : 'is-light'} ${selected === cell.square ? 'is-selected' : ''} ${lastMove && [lastMove.from, lastMove.to].includes(cell.square) ? 'is-last-move' : ''} ${inCheck && piece?.type === 'k' && piece.color === turn ? 'is-check' : ''}`}
          aria-label={`${cell.square}, ${piece ? `${PARTY_NAMES[piece.color]} ${pieceNames[piece.type]}${piece.inactive ? ', eliminated army' : ''}` : 'empty'}${origins.has(cell.square) ? ', can move' : ''}${target ? captures.has(cell.square) ? ', legal capture' : ', legal destination' : ''}`}
          onClick={event => onSquare(cell.square, piece, event.currentTarget)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSquare(cell.square, piece, event.currentTarget); } }}>
          <polygon points={cell.points.map(point => point.join(',')).join(' ')} />
          <g transform={`rotate(${-rotation} ${cell.center.x} ${cell.center.y})`} className="party-square-label"><text x={cell.center.x} y={cell.center.y + edge * .39} fontSize={edge * .15} textAnchor="middle">{cell.square}</text></g>
          {piece && <g transform={`rotate(${pieceRotation} ${cell.center.x} ${cell.center.y})`} className={cartoons && moving.has(cell.square) ? 'piece-in-motion' : ''}>{cartoons && characters[cell.square] ? <CartoonPiece character={characters[cell.square]} type={piece.type} color={piece.color} inactive={piece.inactive} x={cell.center.x - size / 2} y={cell.center.y - size / 2} width={size} height={size} /> : <ChessPiece type={piece.type} color={piece.color} inactive={piece.inactive} x={cell.center.x - size / 2} y={cell.center.y - size / 2} width={size} height={size} />}</g>}
          {origins.has(cell.square) && <circle className="party-origin-hint" cx={cell.center.x} cy={cell.center.y} r={edge * .37} />}
          {target && <circle className={captures.has(cell.square) ? 'party-capture-hint' : 'party-move-hint'} cx={cell.center.x} cy={cell.center.y} r={edge * (captures.has(cell.square) ? .4 : .12)} />}
        </g>;
      })}
    </g>
  </svg>;
}

// This wrapper leaves two-player markup intact and gives multiplayer a measured surround.
export function PartyTable({ geometry, local, showsEnabled, children }) {
  if (!geometry) return children;
  return <div className={`party-table party-table-${geometry.seats.length} ${local ? 'is-shared-table' : 'is-personal-table'} ${showsEnabled ? 'has-shows' : 'no-shows'}`}>{children}</div>;
}

function PartyShowSlot({ event, seatColor, onDone }) {
  const slot = useRef(null);
  const [fit, setFit] = useState({ width: 160, scale: .7 });
  useLayoutEffect(() => {
    const element = slot.current;
    const measure = () => {
      const availableWidth = element.clientWidth;
      const availableHeight = element.clientHeight;
      if (!availableWidth || !availableHeight) return;
      const scale = Math.min(1, availableHeight / 64);
      const width = availableWidth / scale;
      setFit(previous => previous.width === width && previous.scale === scale ? previous : { width, scale });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);
  return <div ref={slot} className="party-show-slot" data-party-show-seat={seatColor} data-show-rotation="0">
    <div className="party-show-inner" style={{ width: fit.width, transform: `translate(-50%, -50%) scale(${fit.scale})` }}>
      <PlayerShow event={event} seatColor={seatColor} rotation={0} onDone={onDone} />
    </div>
  </div>;
}

// A small fixed emblem supplements army color without changing seat identity.
function SeatEmblem({ color }) {
  const marks = {
    red: <path d="M8 3 14 13H2Z" />,
    blue: <path d="m8 2 1.8 3.8 4.2.6-3 3 .7 4.2L8 11.6l-3.7 2 .7-4.2-3-3 4.2-.6Z" />,
    yellow: <path d="m8 2 6 6-6 6-6-6Z" />,
    green: <path d="M8 7C1 1 0 10 5 10c-3 5 7 5 5 0 6 0 5-9-2-3Zm0 3v4" />,
  };
  return <svg className="party-seat-emblem" viewBox="0 0 16 16" aria-hidden="true" focusable="false">{marks[color]}</svg>;
}

export function PartySeats({ teams = false, colors, players, clocks, turn, playing, local, activeColors, clockText, showEvent = null, showsEnabled = false, viewColor, onShowDone, cartoons }) {
  const orbit = useRef(null);
  const [bounds, setBounds] = useState(null);
  const viewer = colors.includes(viewColor) ? viewColor : colors[0];
  useLayoutEffect(() => {
    const table = orbit.current?.closest('.party-table');
    const frame = table?.querySelector('.board-frame');
    if (!table || !frame) return;
    const measure = () => {
      const tableRect = table.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const rail = parseFloat(getComputedStyle(table).paddingLeft);
      const next = { width: frameRect.width, height: frameRect.height, left: frameRect.left - tableRect.left, top: frameRect.top - tableRect.top, rail };
      setBounds(previous => previous && Object.keys(next).every(key => Math.abs(previous[key] - next[key]) < .1) ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(table);
    observer?.observe(frame);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [colors.length, local, viewer]);
  return <div ref={orbit} className={`party-seats party-orbit ${local ? 'is-local-seats' : 'is-online-seats'}`} aria-label="Players and turn order">
    {colors.map((color, index) => {
      const eliminated = !activeColors.includes(color);
      const ally = teams ? partyTeamColors(partyTeamFor(color)).find(seatColor => seatColor !== color) : null;
      const seatName = players?.[color]?.name || `${PARTY_NAMES[color]}’s seat`;
      const seatDescription = ally ? `${seatName}. ${PARTY_NAMES[color]}. Teammate: ${players?.[ally]?.name || PARTY_NAMES[ally]} (${PARTY_NAMES[ally]}).` : seatName;
      const hasShow = showsEnabled && (local || color === viewer);
      const { positionRotation, facingRotation } = partySeatPresentation(colors.length, color, { local, viewColor: viewer });
      const side = Math.abs(Math.sin(positionRotation * Math.PI / 180)) > .9;
      const compactOnline = !local && color !== viewer;
      const thickness = bounds ? Math.max(32, bounds.rail - 10) : 48;
      const center = bounds ? partySeatCenter(bounds.width, bounds.height, positionRotation, thickness / 2 + 8) : { x: 0, y: 0 };
      const width = bounds ? compactOnline
        ? colors.length === 4 && side ? Math.max(40, thickness) : Math.min(160, bounds.width * .32)
        : hasShow ? Math.min(colors.length === 3 ? 340 : 420, bounds.width * (colors.length === 3 ? .62 : .96)) : Math.min(240, bounds.width * .62) : 280;
      const height = compactOnline && colors.length === 4 && side ? Math.min(150, bounds?.height * .48 || 150) : thickness;
      // Upright remote summaries sit in the empty space above the hexagon.
      if (compactOnline && colors.length === 3 && bounds) {
        center.x = bounds.width * (positionRotation === 120 ? .13 : .87);
        center.y = -height / 2 - 8;
      }
      const status = eliminated ? 'Eliminated' : playing && turn === color ? 'To move' : !players?.[color] ? 'Open seat' : local ? PARTY_NAMES[color] : players[color].connected ? 'Connected' : 'Reconnecting';
      const style = { left: (bounds?.left || 0) + center.x, top: (bounds?.top || 0) + center.y, width, height, transform: `translate(-50%, -50%) rotate(${facingRotation}deg)`, visibility: bounds ? 'visible' : 'hidden' };
      return <div key={color} style={style} data-seat={color} data-team={teams ? partyTeamFor(color) : undefined} data-seat-position={positionRotation} data-seat-facing={facingRotation} className={`party-seat party-color-${color} ${playing && turn === color ? 'is-active' : ''} ${eliminated ? 'is-eliminated' : ''} ${hasShow ? 'has-player-show' : ''} ${compactOnline && side ? 'is-side-summary' : ''}`}>
        <span className="party-seat-portrait">{cartoons ? <CartoonPiece type="k" color={color} inactive={eliminated} /> : <ChessPiece type="k" color={color} inactive={eliminated} />}<SeatEmblem color={color} /></span>
        <div className="party-seat-name" title={seatDescription}><strong>{seatName}</strong><small><i aria-hidden="true" />{teams ? `${status} · Ally: ${PARTY_NAMES[ally]}` : `${index + 1} · ${status}`}</small></div>
        {hasShow && <PartyShowSlot event={showEvent} seatColor={color} onDone={() => onShowDone?.(showEvent?.animationId ?? showEvent?.key)} />}
        <span className="party-clock" aria-label={`${PARTY_NAMES[color]} clock`}>{eliminated ? '—' : clockText(clocks?.[color])}</span>
      </div>;
    })}
  </div>;
}
