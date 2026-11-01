import './hero-wordmark.css';

const LETTERS = [...'Queenie’s'];
const TILTS = [-7, 4, -3, 3, -4, 5, -2, -8, 4];

// Decorative only: the accessible brand already lives in the page header.
// CSS runs once on mount, without timers or replaying on game-state updates.
export default function HeroWordmark() {
  return <div className="hero-wordmark" aria-hidden="true">
    <span className="hero-wordmark-letters">
      {LETTERS.map((letter, index) => <span
        className="hero-wordmark-letter"
        key={index}
        style={{ '--letter-index': index, '--letter-tilt': `${TILTS[index]}deg` }}
      >{letter}</span>)}
    </span>
    <span className="hero-wordmark-shadow" />
  </div>;
}
