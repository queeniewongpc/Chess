import { useId } from 'react';
import './animation-controls.css';

export default function AnimationControls({ pieceStyle, board, players, onPieceStyleChange, onChannelChange }) {
  const id = useId();
  const channels = pieceStyle === 'cartoon'
    ? [['board', 'On board', 'On-board animation', board], ['players', 'By players', 'Player-side animation', players]]
    : [['players', 'By players', 'Player-side animation', players]];
  return <div className="animation-controls">
    <fieldset className="display-options"><legend>Pieces</legend><div className="display-choices">
      {[['cartoon', 'Cartoon'], ['classic', 'Classic']].map(([value, label]) => <label key={value} className={`display-choice ${pieceStyle === value ? 'is-selected' : ''}`}>
        <input type="radio" name={`${id}-pieces`} value={value} checked={pieceStyle === value} onChange={() => onPieceStyleChange(value)} />{label}
      </label>)}
    </div></fieldset>
    <fieldset className="display-options"><legend>Animations</legend><div className="display-choices animation-channels">
      {channels.map(([channel, label, accessibleName, enabled]) => <label key={channel} className={`animation-channel ${enabled ? 'is-on' : ''}`}>
        <input type="checkbox" role="switch" aria-label={accessibleName} checked={Boolean(enabled)} onChange={event => onChannelChange(channel, event.target.checked)} />
        <span className="animation-channel-label">{label}</span><span className="animation-switch-track" aria-hidden="true"><span /></span><span className="animation-channel-status" aria-hidden="true">{enabled ? 'On' : 'Off'}</span>
      </label>)}
    </div></fieldset>
    <p className="display-options-note">{pieceStyle === 'classic' ? 'Classic pieces stay still. Add a character show beside the players.' : 'Move your characters on the board, show their action by the players, or turn on both.'}</p>
  </div>;
}
