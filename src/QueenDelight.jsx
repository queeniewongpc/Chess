import { useLayoutEffect, useRef, useState } from 'react';
import './queen-delight.css';

export const QUEEN_DELIGHT_MS = 2000;
const LETTERS = [...'Queenie’s'];
const TILTS = [-7, 4, -3, 3, -4, 5, -2, -8, 4];
const CLEARANCE = 8;

// A board-local decoration. It never captures input or participates in move rules.
export default function QueenDelight({ target, boardRef, onDismiss }) {
  const lettering = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    const board = boardRef.current;
    let frame = 0;
    const place = () => {
      frame = 0;
      if (!target?.isConnected || !board?.contains(target)) { onDismiss(); return; }
      const bounds = board.getBoundingClientRect();
      // Clipped sprite atlases may extend a group's SVG bounds beyond its cell.
      const square = (target.querySelector('polygon') || target).getBoundingClientRect();
      const box = lettering.current.getBoundingClientRect();
      // Fullscreen can scroll this containing block rather than the document.
      const offsetX = board.scrollLeft - board.clientLeft;
      const offsetY = board.scrollTop - board.clientTop;
      const center = (square.left + square.right) / 2 - bounds.left + offsetX;
      const left = Math.max(board.scrollLeft + CLEARANCE, Math.min(center - box.width / 2, board.scrollLeft + board.clientWidth - box.width - CLEARANCE));
      const aboveViewport = square.top - box.height - CLEARANCE;
      // A scrolled mobile board can start above the screen. Keep the name visible.
      const fitsAbove = aboveViewport >= Math.max(CLEARANCE, bounds.top + board.clientTop + CLEARANCE);
      const top = (fitsAbove ? aboveViewport : square.bottom + CLEARANCE) - bounds.top + offsetY;
      setPosition({ left, top });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(board);
    observer?.observe(target);
    observer?.observe(lettering.current);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    document.addEventListener('fullscreenchange', schedule);
    const timeout = setTimeout(onDismiss, QUEEN_DELIGHT_MS);
    place();
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      document.removeEventListener('fullscreenchange', schedule);
    };
  }, [target, boardRef, onDismiss]);

  return <div ref={lettering} className="queen-delight" aria-hidden="true"
    style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? 'visible' : 'hidden', '--delight-duration': `${QUEEN_DELIGHT_MS}ms` }}>
    <span className="queen-delight-mark">
      <span className="queen-delight-lettering">
        {LETTERS.map((letter, index) => <span key={index} className="queen-delight-letter" style={{ '--letter-index': index, '--letter-tilt': `${TILTS[index]}deg` }}>{letter}</span>)}
      </span>
    </span>
  </div>;
}
