import { useLayoutEffect, useRef, useState } from 'react';
import CartoonPiece from './CartoonPiece.jsx';
import { BOARD_MOVE_MS, BOARD_CAPTURE_MS, BOARD_REDUCED_MS } from '../shared/animationTimings.js';
import './move-effects.css';

function personality(character) {
  return [...String(character?.id || character?.key || '')].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 7);
}

function FacingCharacter({ character, rotation = 0, arriving, fallbackType, reaction }) {
  const role = character?.type || fallbackType || 'p';
  const promoted = arriving && arriving.type !== role;
  const artwork = (figure, type, className = '') => reaction ? (
    <div className={`move-role-layer ${className}`}>
      {(reaction === 'defend' ? ['ready', 'fallen'] : ['ready', 'strike', 'celebrate']).map(pose =>
        <div key={pose} className={`move-pose move-pose-${pose}`}>
          <CartoonPiece character={figure} type={type} color={figure?.color} pose={pose} />
        </div>)}
    </div>
  ) : <CartoonPiece character={figure} type={type} color={figure?.color} className={className} />;
  return <div className="move-character-facing" style={{ '--character-facing': `${rotation}deg` }}>
    <div className={`move-character-hop move-hop-${role}${reaction ? ` move-react-${reaction}` : ''}`}>
      {artwork(character, role, promoted ? 'move-character-before' : '')}
      {promoted && artwork(arriving, arriving.type, 'move-character-promoted')}
      {reaction === 'defend' && <svg className="move-dizzy-rings" viewBox="0 0 64 64">
        <path d="M41 21c-8-5-22-3-21 2 1 5 22 5 22 0 0-3-13-5-17-1m4 8c-5-3-12-1-11 2 1 3 13 3 14 0m-7 8 2 2-3 2" />
      </svg>}
    </div>
  </div>;
}

function CaptureBurst({ point }) {
  const size = point.size * 1.35;
  return <svg className="move-battle-burst" viewBox="0 0 100 100" style={{ left: point.x - size / 2, top: point.y - size / 2, width: size, height: size }}>
    <g className="move-battle-impact" fill="none">
      <path d="m45 47-9-12 10 5-1-16 7 14 9-17-2 21 14-4-12 10" />
      <path d="m68 24 4-7m3 16 8-3" />
    </g>
    <g className="move-battle-stars"><path d="m27 28 1.7 5.2L34 35l-5.3 1.8L27 42l-1.8-5.2L20 35l5.2-1.8Z" /></g>
  </svg>;
}

function captureGeometry(motion, victim, height, facing) {
  const size = motion.destination.size;
  const angle = facing * Math.PI / 180;
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  // A short side-by-side scene makes the actual arm contact readable. Its axis
  // follows the attacker seat; both pieces retain their own seat orientation.
  // Keep the same horizontal anchor on edge files, even when a character
  // crosses the board or viewport edge. Do not squeeze the encounter inward.
  const marginY = size * (.68 + Math.abs(direction.y) * .52);
  const center = { x: victim.x, y: Math.max(marginY, Math.min(height - marginY, victim.y)) };
  const point = amount => ({ x: center.x + direction.x * size * amount, y: center.y + direction.y * size * amount });
  const actor = {};
  for (const [name, amount] of [['approach', -.58], ['feint', -.68], ['strike', -.39]]) {
    const target = point(amount);
    actor[`--battle-${name}-x`] = `${target.x - motion.origin.x}px`;
    actor[`--battle-${name}-y`] = `${target.y - motion.origin.y}px`;
  }
  const opponent = {};
  for (const [name, amount] of [['ready', .45], ['recoil', .56], ['exit', .57]]) {
    const target = point(amount);
    opponent[`--battle-${name}-x`] = `${target.x - victim.x}px`;
    opponent[`--battle-${name}-y`] = `${target.y - victim.y}px`;
  }
  return { actor, opponent, burst: { ...center, size } };
}

// This layer is purely decorative. Authoritative moves and input remain on the board underneath.
export default function MoveEffects({ event, frameRef, local, geometry, viewColor, flipped, onDone }) {
  const done = useRef(onDone);
  done.current = onDone;
  const [layout, setLayout] = useState(null);
  const effectiveViewColor = local ? null : viewColor;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !event) { done.current?.(); return undefined; }
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      done.current?.();
    };
    const bounds = frame.getBoundingClientRect();
    const scaleX = bounds.width / (frame.offsetWidth || bounds.width) || 1;
    const scaleY = bounds.height / (frame.offsetHeight || bounds.height) || 1;
    const squares = new Map([...frame.querySelectorAll('[data-square]')].map(element => [element.dataset.square, element]));
    const partyCells = geometry && new Map(geometry.cells.map(cell => [cell.square, cell]));
    const partyBounds = geometry && frame.querySelector('.party-board')?.getBoundingClientRect();
    const partyScale = partyBounds && Math.min(partyBounds.width / scaleX / geometry.width, partyBounds.height / scaleY / geometry.height);
    const locate = square => {
      const cell = squares.get(square);
      if (!cell) return null;
      // SVG labels and rotated artwork can protrude; the polygon is the actual cell.
      const polygonElement = geometry ? cell.querySelector('polygon') : null;
      const rect = (polygonElement || cell).getBoundingClientRect();
      const polygon = partyCells?.get(square);
      const matrix = polygonElement?.getScreenCTM();
      // Hex cells are skewed: the drawn piece uses cell.center, not the bounds' midpoint.
      const center = polygon && matrix
        ? new DOMPoint(polygon.center.x, polygon.center.y).matrixTransform(matrix)
        : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const edge = polygon && Math.min(...polygon.points.map(([x, y], index) => {
        const next = polygon.points[(index + 1) % polygon.points.length];
        return Math.hypot(next[0] - x, next[1] - y);
      }));
      return {
        x: (center.x - bounds.left) / scaleX + frame.scrollLeft - frame.clientLeft,
        y: (center.y - bounds.top) / scaleY + frame.scrollTop - frame.clientTop,
        // Match PartyBoard's unrotated SVG dimensions; a 120° bounding box is larger.
        size: partyScale && edge ? edge * 1.06 * partyScale : Math.min(rect.width / scaleX, rect.height / scaleY) * .84,
      };
    };
    const motions = (event.motions || [{ from: event.move.from, to: event.move.to, character: event.actor, arriving: event.arriving }])
      .map(motion => ({ ...motion, origin: locate(motion.from), destination: locate(motion.to) }))
      .filter(motion => motion.origin && motion.destination);
    if (!motions.length) { finish(); return undefined; }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = media.matches;
    const victim = event.victim && locate(event.capturedSquare || event.move.to);
    const duration = reduced ? BOARD_REDUCED_MS : victim ? BOARD_CAPTURE_MS : BOARD_MOVE_MS;
    setLayout({ motions, victim, height: frame.clientHeight, duration, reduced });
    const timer = window.setTimeout(finish, duration);
    // A resized or rotated board uses fresh coordinates on the next move.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const current = frame.getBoundingClientRect();
      if (Math.abs(current.width - bounds.width) > 1 || Math.abs(current.height - bounds.height) > 1) finish();
    });
    observer?.observe(frame);
    window.addEventListener('resize', finish);
    document.addEventListener('fullscreenchange', finish);
    media.addEventListener?.('change', finish);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('resize', finish);
      document.removeEventListener('fullscreenchange', finish);
      media.removeEventListener?.('change', finish);
    };
  }, [event.key, frameRef, local, geometry, effectiveViewColor, flipped]);

  if (!layout) return null;
  const rotation = color => !local ? 0 : geometry?.seats.find(seat => seat.color === color)?.rotation || (color === 'b' ? 180 : 0);
  const styleFor = (point, character) => ({ left: point.x - point.size / 2, top: point.y - point.size / 2, width: point.size, height: point.size, '--hop-height': `${Math.max(3, point.size * (.1 + (personality(character) % 4) * .018))}px`, '--hop-lean': `${(personality(character) % 2 ? 1 : -1) * (5 + personality(character) % 5)}deg` });
  const battle = layout.victim && captureGeometry(layout.motions[0], layout.victim, layout.height, rotation(layout.motions[0].character?.color));

  return <div className={`move-effects move-effects-board ${battle ? 'move-effects-capture' : ''} ${layout.reduced ? 'is-reduced-motion' : ''}`} aria-hidden="true" data-move-event={event.key} style={{ '--motion-duration': `${layout.duration}ms` }}>
      {battle && <div className="move-capture-opponent" data-character-id={event.victim.id} data-captured-square={event.capturedSquare || event.move.to} style={{ ...styleFor(layout.victim, event.victim), ...battle.opponent }}>
        <FacingCharacter character={event.victim} rotation={rotation(event.victim.color)} reaction="defend" />
      </div>}
      {layout.motions.map((motion, index) => <div className={`move-actor-travel ${battle && index === 0 ? 'move-battle-attacker' : ''}`} key={`${motion.from}-${motion.to}-${index}`} data-character-id={motion.character?.id}
        style={{ ...styleFor(motion.origin, motion.character), '--travel-x': `${motion.destination.x - motion.origin.x}px`, '--travel-y': `${motion.destination.y - motion.origin.y}px`, '--arrival-scale': motion.destination.size / motion.origin.size, ...(index === 0 && battle ? battle.actor : {}) }}>
        <FacingCharacter character={motion.character} arriving={motion.arriving} fallbackType={event.move.piece} rotation={rotation(motion.character?.color)} reaction={battle && index === 0 ? 'attack' : null} />
      </div>)}
      {battle && <CaptureBurst point={battle.burst} />}
  </div>;
}
