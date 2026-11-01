import { useLayoutEffect, useRef, useState } from 'react';
import CartoonPiece from './CartoonPiece.jsx';
import { PLAYER_SHOW_MOVE_MS, PLAYER_SHOW_CAPTURE_MS, PLAYER_SHOW_REDUCED_MS } from '../shared/animationTimings.js';
import './player-show.css';

export { PLAYER_SHOW_MOVE_MS, PLAYER_SHOW_CAPTURE_MS, PLAYER_SHOW_REDUCED_MS } from '../shared/animationTimings.js';

const personality = character => [...String(character?.id || '')].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 7);

function ShowCharacter({ character, arriving, rotation, opponent = false, moving = false, fallbackType, capture = false }) {
  const type = character?.type || fallbackType || 'p';
  const promotes = arriving && arriving.type !== type;
  const artwork = (figure, role, className = '') => capture ? (
    <div className={`show-role-layer ${className}`}>
      {(opponent ? ['ready', 'fallen'] : ['ready', 'strike', 'celebrate']).map(pose =>
        <div key={pose} className={`show-pose show-pose-${pose}`}>
          <CartoonPiece character={figure} type={role} color={figure?.color} pose={pose} />
        </div>)}
    </div>
  ) : <CartoonPiece character={figure} type={role} color={figure?.color} className={className} />;
  return <div className="player-show-facing" style={{ '--show-facing': `${rotation}deg` }}>
    <div className={`player-show-body ${moving ? `show-step-${type}` : ''} ${opponent ? 'show-opponent-body' : ''}`}>
      <div className={opponent ? 'player-show-mirror' : 'player-show-portrait'}>
        {artwork(character, type, promotes ? 'show-before-promotion' : '')}
        {promotes && artwork(arriving, arriving.type, 'show-after-promotion')}
      </div>
      {opponent && capture && <svg className="player-show-dizzy" viewBox="0 0 64 64">
        <path d="M42 20c-9-5-23-3-22 2 1 5 23 5 23 0 0-3-13-5-17-1m4 8c-5-3-12-1-11 2 1 3 13 3 14 0m-7 8 2 2-3 2" />
      </svg>}
    </div>
  </div>;
}

function ClashCloud() {
  return <svg className="player-show-clash" viewBox="0 0 64 64">
    <g className="show-clash-trails" fill="none">
      <path d="m29 35-8-11 9 5-1-16 6 14 9-16-2 19 12-4-10 10" />
      <path d="m49 14 3-6m2 14 6-2" />
    </g>
    <g className="show-clash-stars"><path d="m15 15 1.5 4.5L21 21l-4.5 1.5L15 27l-1.5-4.5L9 21l4.5-1.5Z" /></g>
  </svg>;
}

function WinnerBurst() {
  return <svg className="player-show-victory" viewBox="0 0 64 56">
    <g className="show-victory-rays" fill="none" strokeLinecap="round">
      <path d="m13 24-5-2m14-8-3-5m23 5 3-5m6 15 5-2" />
    </g>
    <g className="show-victory-confetti">
      <path d="m32 3 1.5 4.4L38 9l-4.5 1.5L32 15l-1.5-4.5L26 9l4.5-1.6Z" />
      <circle cx="8" cy="34" r="1.6" /><circle cx="56" cy="34" r="1.6" />
    </g>
  </svg>;
}

// A quiet, non-interactive vignette beside a player's name. It never covers the board.
export default function PlayerShow({ event = null, onDone, seatColor, rotation = 0 }) {
  const stage = useRef(null);
  const done = useRef(onDone);
  done.current = onDone;
  const [width, setWidth] = useState(220);
  const [scene, setScene] = useState(null);
  const eventKey = event?.animationId ?? event?.key ?? null;

  useLayoutEffect(() => {
    const element = stage.current;
    const measure = () => setWidth(element.clientWidth || 220);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!event || eventKey === null) { setScene(null); return undefined; }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = media.matches;
    const duration = reduced ? PLAYER_SHOW_REDUCED_MS : event.victim ? PLAYER_SHOW_CAPTURE_MS : PLAYER_SHOW_MOVE_MS;
    setScene({ event, key: eventKey, reduced, duration });
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setScene(null);
      done.current?.();
    };
    const timer = window.setTimeout(finish, duration);
    media.addEventListener?.('change', finish);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener?.('change', finish);
    };
  }, [eventKey]);

  const active = scene?.key === eventKey ? scene : null;
  const move = active?.event;
  // Capture poses grow briefly; this headroom keeps large hats within the stage.
  const size = Math.min(move?.victim ? 46 : 50, Math.max(32, width * .3));
  const motions = move?.motions?.length ? move.motions : move ? [{ character: move.actor, arriving: move.arriving }] : [];
  const pair = motions.length > 1;
  const clash = width * .56;
  const victimHome = width - size - 12;
  const victimMeet = Math.min(victimHome, clash + size * .03);
  const actorMeet = Math.max(12, victimMeet - size * .91);
  const actorFinish = Math.min(width - size - 10, actorMeet + size * .16);
  const variables = {
    '--show-duration': `${active?.duration || PLAYER_SHOW_MOVE_MS}ms`,
    '--show-actor-home': '12px',
    '--show-actor-meet': `${actorMeet}px`,
    '--show-actor-finish': `${actorFinish}px`,
    '--show-victim-home': `${victimHome}px`,
    '--show-victim-meet': `${victimMeet}px`,
    '--show-victim-exit': `${Math.min(width - size - 1, victimMeet + size * .7)}px`,
    '--show-clash-x': `${victimMeet - 31}px`,
    '--show-winner-x': `${Math.max(0, actorFinish + size / 2 - 32)}px`,
  };

  return <div ref={stage} className={`player-show ${move ? 'is-playing' : 'is-idle'} ${move?.victim ? 'is-capture' : 'is-move'} ${active?.reduced ? 'is-reduced-motion' : ''}`} data-facing-seat={seatColor} aria-hidden="true" style={variables}>
    <span className="player-show-floor" />
    {!move && <svg className="player-show-idle" viewBox="0 0 90 22"><path d="M2 11h28m30 0h28M45 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" /><circle cx="31" cy="11" r="1" /><circle cx="59" cy="11" r="1" /></svg>}
    {move && <div key={active.key} className="player-show-scene" data-move-event={active.key}>
      {move.victim && <div className="player-show-victim" data-character-id={move.victim.id} style={{ width: size, height: size, bottom: 7 }}>
        <ShowCharacter character={move.victim} rotation={rotation} opponent capture />
      </div>}
      {motions.map((motion, index) => {
        const character = motion.character || move.actor;
        const actorSize = pair && index > 0 ? size * .76 : size;
        const start = pair ? index === 0 ? 10 + size * .78 : 6 : 12;
        const finish = width - size - 10 - (pair && index > 0 ? size * .88 : 0);
        return <div className={`player-show-actor ${move.victim ? 'show-attacker' : 'show-traveler'}`} key={`${character?.id || index}-${index}`} data-character-id={character?.id}
          style={{ width: actorSize, height: actorSize, bottom: 7, '--show-start': `${start}px`, '--show-finish': `${finish}px`, '--show-hop': `${3 + personality(character) % 4}px`, '--show-lean': `${(personality(character) % 2 ? 1 : -1) * (5 + personality(character) % 4)}deg` }}>
          <ShowCharacter character={character} arriving={motion.arriving || (index === 0 ? move.arriving : null)} rotation={rotation} moving fallbackType={move.move?.piece} capture={Boolean(move.victim)} />
        </div>;
      })}
      {move.victim && <><ClashCloud /><WinnerBurst /></>}
    </div>}
  </div>;
}
