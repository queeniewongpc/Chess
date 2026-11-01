import React, { useEffect, useId, useMemo, useState } from 'react';
import { validateFen } from 'chess.js';
import { ArrowRight, Check, ChevronDown, Clock3, Copy, Crown, Eraser, Grid2X2, Handshake, Infinity as InfinityIcon, Minus, Plus, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Swords, Users } from 'lucide-react';
import ChessPiece from './ChessPiece.jsx';
import ArenaIcon from './ArenaIcon.jsx';
import './setup-arena.css';
import { isPartyTeams } from '../shared/partyTeams.js';
import { ENDGAMES } from '../shared/endgames.js';
import { createArenaPosition, createGame, getArenaDimensions, getGameOutcome, swapArenaPieces } from '../shared/game.js';

const PIECES = [
  { type: 'p', name: 'Pawn', max: 8 },
  { type: 'n', name: 'Knight', max: 2 },
  { type: 'b', name: 'Bishop', max: 2 },
  { type: 'r', name: 'Rook', max: 2 },
  { type: 'q', name: 'Queen', max: 1 },
  { type: 'k', name: 'King', max: 1 },
];
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const DEFAULT_ROSTER = { p: 4, n: 1, b: 1, r: 1, q: 1, k: 0 };
const MODES = [
  { id: 'classic', title: 'Classic', english: 'STANDARD RULES', icon: Crown, description: '64 squares, endless possibilities. A full set of pieces and standard rules for the timeless game.' },
  { id: 'endgame', title: 'Endgames', english: 'STUDIES & POSITIONS', icon: Sparkles, description: 'Start with a classic endgame or build your own position. Fewer pieces, deeper ideas.' },
  { id: 'party', title: '3–4 Players', english: 'MULTIPLAYER CHESS', icon: Users, description: 'Bring three or four armies to the table. Play free-for-all, or team up across the four-player board in 2v2.' },
  { id: 'half', title: 'Chaos Kingdom', english: 'BUILD YOUR BATTLE', icon: ArenaIcon, description: 'Choose your board, pieces, and starting squares. Win by capturing the king or every opposing piece.' },
];
const HALF_SHAPES = [
  { id: '8x4', columns: 8, rows: 4, label: 'Wide', coordinates: 'a1–h4' },
  { id: '4x8', columns: 4, rows: 8, label: 'Tall', coordinates: 'a1–d8' },
  { id: '8x8', columns: 8, rows: 8, label: 'Full', coordinates: 'a1–h8' },
];
const UNDO_MODES = [
  { id: 'off', title: 'Off', icon: ShieldCheck },
  { id: 'free', title: 'Free', icon: RotateCcw },
  { id: 'approval', title: 'Ask first', icon: Handshake },
];

function readPosition(fen) {
  const rows = (fen || EMPTY_FEN).split(' ')[0].split('/');
  const board = Array(64).fill(null);
  if (rows.length !== 8) return board;
  rows.forEach((row, rank) => {
    let file = 0;
    for (const char of row) {
      if (/^[1-8]$/.test(char)) file += Number(char);
      else if (/^[prnbqkPRNBQK]$/.test(char) && file < 8) {
        board[rank * 8 + file] = { type: char.toLowerCase(), color: char === char.toUpperCase() ? 'w' : 'b' };
        file += 1;
      }
    }
  });
  return board;
}

function positionFen(board, turn) {
  const rows = Array.from({ length: 8 }, (_, rank) => {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = board[rank * 8 + file];
      if (!piece) empty++;
      else {
        if (empty) row += empty;
        empty = 0;
        row += piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
      }
    }
    return row + (empty || '');
  });
  return `${rows.join('/')} ${turn} - - 0 1`;
}

function PositionEditor({ fen, onChange }) {
  const [brush, setBrush] = useState({ type: 'p', color: 'w' });
  const board = useMemo(() => readPosition(fen), [fen]);
  const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const place = index => {
    const next = [...board];
    next[index] = brush ? { ...brush } : null;
    onChange(positionFen(next, turn));
  };
  return <div className="setup-position-editor">
    <p className="setup-hint">Choose a piece, then tap a square to place it. Use the eraser to remove pieces.</p>
    <div className="setup-palette" role="group" aria-label="Position editor tools">
      {['w', 'b'].map(color => <div className="setup-palette-row" key={color}>
        <span>{color === 'w' ? 'White' : 'Black'}</span>
        {PIECES.map(piece => <button key={piece.type} type="button" className={brush?.type === piece.type && brush?.color === color ? 'is-selected' : ''} aria-label={`Place ${color === 'w' ? 'white' : 'black'} ${piece.name.toLowerCase()}`} aria-pressed={brush?.type === piece.type && brush?.color === color} onClick={() => setBrush({ type: piece.type, color })}><ChessPiece type={piece.type} color={color} /></button>)}
      </div>)}
      <button type="button" className={`setup-eraser ${!brush ? 'is-selected' : ''}`} aria-pressed={!brush} onClick={() => setBrush(null)}><Eraser size={15} />Eraser</button>
    </div>
    <div className="setup-editor-board" role="group" aria-label="Custom starting position">
      {board.map((piece, index) => {
        const file = index % 8;
        const row = Math.floor(index / 8);
        const square = `${'abcdefgh'[file]}${8 - row}`;
        return <button key={square} type="button" className={`setup-editor-square ${(file + row) % 2 ? 'is-dark' : 'is-light'}`} onClick={() => place(index)} aria-label={`${square} ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${PIECES.find(item => item.type === piece.type).name.toLowerCase()}` : 'empty'}`}>
          {piece && <ChessPiece type={piece.type} color={piece.color} />}
          {file === 0 && <span className="setup-editor-rank">{8 - row}</span>}
          {row === 7 && <span className="setup-editor-file">{'abcdefgh'[file]}</span>}
        </button>;
      })}
    </div>
    <div className="setup-editor-actions">
      <label>Side to move<select value={turn} onChange={event => onChange(positionFen(board, event.target.value))}><option value="w">White to move</option><option value="b">Black to move</option></select></label>
      <button type="button" onClick={() => onChange(EMPTY_FEN)}><Eraser size={14} />Clear</button>
      <button type="button" onClick={() => onChange(INITIAL_FEN)}><RotateCcw size={14} />Standard</button>
    </div>
    <p className="setup-hint">Keep one king per side. Standard check rules apply. Editing the position clears castling and en passant rights.</p>
  </div>;
}

function RosterPicker({ color, counts, winCondition, onChange }) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const maximum = 16;
  return <div className={`roster-card roster-${color}`}>
    <div className="roster-heading"><span><i className={`roster-stone ${color === 'w' ? 'is-white' : 'is-black'}`} />{color === 'w' ? 'White pieces' : 'Black pieces'}</span><strong>{total}<small> / {maximum} pieces</small></strong></div>
    <div className="roster-pieces">
      {PIECES.map(({ type, name, max }) => <div className="roster-piece" key={type}>
        <div className="roster-piece-label"><ChessPiece type={type} color={color} /><span>{name}</span></div>
        <div className="roster-stepper">
          <button type="button" aria-label={`Remove one ${color === 'w' ? 'white' : 'black'} ${name.toLowerCase()}`} disabled={counts[type] === 0 || total <= 1} onClick={() => onChange({ ...counts, [type]: counts[type] - 1 })}><Minus size={12} /></button>
          <output aria-label={`${color === 'w' ? 'White' : 'Black'} ${name.toLowerCase()} count`}>{counts[type]}</output>
          <button type="button" aria-label={`Add one ${color === 'w' ? 'white' : 'black'} ${name.toLowerCase()}`} disabled={counts[type] >= max || total >= maximum} onClick={() => onChange({ ...counts, [type]: counts[type] + 1 })}><Plus size={12} /></button>
        </div>
      </div>)}
    </div>
    <div className="roster-presets"><button type="button" onClick={() => onChange({ p: winCondition === 'capture-king' ? 0 : 1, n: 0, b: 0, r: 0, q: 0, k: winCondition === 'capture-king' ? 1 : 0 })}>One piece</button><button type="button" onClick={() => onChange({ p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 })}>Full set</button></div>
  </div>;
}

function ArenaPositionEditor({ settings, onChange }) {
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('Select a piece, then a destination. Occupied squares swap both pieces.');
  const [hasError, setHasError] = useState(false);
  const { width, height } = getArenaDimensions(settings.halfShape);
  const position = useMemo(() => createArenaPosition(settings), [settings]);
  const pieces = new Map(position.map(piece => [piece.square, piece]));
  const rosterSignature = JSON.stringify(settings.halfCounts);
  useEffect(() => {
    setSelected(null);
    setHasError(false);
    setFeedback('Select a piece, then a destination. Occupied squares swap both pieces.');
  }, [settings.halfShape, settings.halfPlacement, rosterSignature, settings.halfWin]);
  useEffect(() => {
    setSelected(null);
    if (settings.halfPosition == null) {
      setHasError(false);
      setFeedback('Select a piece, then a destination. Occupied squares swap both pieces.');
    }
  }, [settings.halfPosition]);
  const chooseSquare = square => {
    if (!selected) {
      const piece = pieces.get(square);
      if (!piece) {
        setHasError(false);
        setFeedback('Select a piece first, then choose where it should start.');
        return;
      }
      setSelected(square);
      setHasError(false);
      setFeedback(`${piece.color === 'w' ? 'White' : 'Black'} ${PIECES.find(item => item.type === piece.type).name.toLowerCase()} on ${square} selected. Choose an empty square to move, or another piece to swap.`);
      return;
    }
    if (selected === square) {
      setSelected(null);
      setHasError(false);
      setFeedback('Selection cleared. Choose any piece to arrange it.');
      return;
    }
    try {
      const next = swapArenaPieces(settings, selected, square);
      setFeedback(pieces.has(square) ? `Swapped the pieces on ${selected} and ${square}.` : `Moved the piece from ${selected} to ${square}.`);
      setHasError(false);
      setSelected(null);
      onChange(next);
    } catch (error) {
      setHasError(true);
      setFeedback(error.message || 'That placement is not allowed. Choose another square.');
    }
  };
  return <div className="arena-position-editor">
    <div className="arena-editor-heading"><span>Black’s side</span><span>{position.length} pieces placed</span></div>
    <div className={`arena-editor-board ${width < height ? 'is-tall' : ''}`} style={{ '--arena-columns': width, '--arena-rows': height }} role="group" aria-label={`Chaos Kingdom starting position, ${width} files by ${height} ranks`}>
      {Array.from({ length: width * height }, (_, index) => {
        const file = index % width;
        const row = Math.floor(index / width);
        const rank = height - row;
        const square = `${'abcdefgh'[file]}${rank}`;
        const piece = pieces.get(square);
        const name = piece ? `${piece.color === 'w' ? 'white' : 'black'} ${PIECES.find(item => item.type === piece.type).name.toLowerCase()}` : 'empty';
        return <button type="button" key={square} className={`arena-editor-square ${(file + row) % 2 ? 'is-dark' : 'is-light'} ${selected === square ? 'is-selected' : ''} ${settings.halfPlacement !== 'anywhere' && row === height / 2 - 1 ? 'is-territory-edge' : ''}`} aria-label={`${square}, ${name}${selected === square ? ', selected' : ''}`} aria-pressed={selected === square} onClick={() => chooseSquare(square)}>
          {piece && <ChessPiece type={piece.type} color={piece.color} />}
          {file === 0 && <span className="arena-editor-rank">{rank}</span>}
          {row === height - 1 && <span className="arena-editor-file">{'abcdefgh'[file]}</span>}
        </button>;
      })}
    </div>
    <div className="arena-editor-heading"><span>White’s side</span>{selected && <button type="button" onClick={() => { setSelected(null); setHasError(false); setFeedback('Selection cleared. Choose any piece to arrange it.'); }}>Cancel selection</button>}</div>
    <p className={`arena-editor-feedback ${hasError ? 'is-invalid' : ''}`} role="status" aria-live="polite">{feedback}</p>
  </div>;
}

export default function SetupPanel({ settings, onChange, disabled = false, compact = false, playerFields = null, roomSettings = null, occupiedColors = [] }) {
  const id = useId();
  const [editorOpen, setEditorOpen] = useState(false);
  const [undoDraft, setUndoDraft] = useState(settings.undoLimit === null ? '' : String(settings.undoLimit));
  const [undoError, setUndoError] = useState('');
  const [arenaNotice, setArenaNotice] = useState('');
  const [winNotice, setWinNotice] = useState('');
  const [arenaResetKey, setArenaResetKey] = useState(0);
  useEffect(() => { setUndoDraft(settings.undoLimit === null ? '' : String(settings.undoLimit)); setUndoError(''); }, [settings.undoLimit]);
  const halfWin = settings.halfWin || 'capture-all';
  const patch = change => onChange({ ...settings, halfWin, ...change });
  const teams = isPartyTeams(settings);
  const currentMode = MODES.find(mode => mode.id === settings.mode) || MODES[0];
  const halfShape = HALF_SHAPES.find(shape => shape.id === settings.halfShape) || HALF_SHAPES[0];
  const selectedEndgame = ENDGAMES.find(endgame => endgame.id === settings.endgameId);
  const custom = settings.endgameId === 'custom';
  const customFen = settings.customFen || '';
  const fenValidation = useMemo(() => {
    const fen = customFen.trim();
    if (!fen) return { ok: false, empty: true, message: 'Enter a FEN or build your starting position on the board.' };
    try {
      if (fen.length > 200 || !validateFen(fen).ok) return { ok: false, message: 'Complete the position with one king per side, legal pawn placement, and a valid FEN.' };
      const customSettings = { ...settings, mode: 'endgame', endgameId: 'custom', customFen: fen };
      const position = createGame(customSettings);
      const outcome = getGameOutcome(position, customSettings);
      if (outcome) {
        const reasons = { checkmate: 'checkmate', stalemate: 'stalemate', 'insufficient-material': 'insufficient material', 'threefold-repetition': 'threefold repetition', 'fifty-move-rule': 'the fifty-move rule' };
        return { ok: false, message: `This position has already ended (${reasons[outcome.reason] || 'game over'}). Adjust the pieces or FEN before starting.` };
      }
      return { ok: true, message: 'The position and rules are valid. Ready to play.' };
    } catch (error) {
      if (error.message?.includes('king in check')) return { ok: false, message: 'The king of the side that just moved cannot be in check. Change the side to move or adjust the pieces.' };
      return { ok: false, message: 'The starting position or game settings are invalid. Check the FEN and rules.' };
    }
  }, [customFen, settings]);
  useEffect(() => { if (settings.mode !== 'endgame' || settings.endgameId !== 'custom') setEditorOpen(false); }, [settings.mode, settings.endgameId]);
  const counts = {
    w: { ...DEFAULT_ROSTER, ...settings.halfCounts?.w },
    b: { ...DEFAULT_ROSTER, ...settings.halfCounts?.b },
  };
  const missingKings = ['w', 'b'].filter(color => counts[color].k !== 1);
  const setWinCondition = value => {
    if (value === 'capture-king') {
      if (halfWin === value && missingKings.length === 0) return;
      if (missingKings.length > 0) {
        const next = { w: { ...counts.w, k: 1 }, b: { ...counts.b, k: 1 } };
        patch({ halfWin: value, halfCounts: next, halfPosition: null });
        setArenaResetKey(key => key + 1);
        setWinNotice('The missing kings have been added. Starting squares have been reset.');
        setArenaNotice('Starting squares reset because kings were added. Arrange the pieces below.');
      } else {
        patch({ halfWin: value });
        setWinNotice('Capture the opposing king to win. Both kings and your starting squares are unchanged.');
        setArenaNotice('');
      }
    } else if (halfWin !== value) {
      patch({ halfWin: value });
      setWinNotice('Win by capturing every opposing piece. Kings and starting squares are unchanged.');
      setArenaNotice('');
    }
  };
  const resetArena = change => {
    patch({ ...change, halfPosition: null });
    setArenaResetKey(value => value + 1);
    setArenaNotice('Pieces reset to their default squares. You can arrange them below.');
    setWinNotice('');
  };
  const setPlacement = halfPlacement => {
    if (halfPlacement === (settings.halfPlacement || 'territory')) return;
    let halfPosition = settings.halfPosition ?? null;
    try {
      createArenaPosition({ ...settings, halfPlacement });
      setArenaNotice(halfPlacement === 'territory' ? 'Each side must start in its own half. Your current arrangement fits.' : 'Both sides can now start on any square. Your arrangement is unchanged.');
    } catch {
      halfPosition = null;
      setArenaNotice('The previous arrangement crossed the halfway line. Pieces reset to their own halves.');
    }
    patch({ halfPlacement, halfPosition });
    setArenaResetKey(value => value + 1);
  };
  const updateCustom = fen => patch({ endgameId: 'custom', customFen: fen });

  return <fieldset className={`setup-panel ${compact ? 'setup-compact' : ''}`} disabled={disabled}>
    <legend className="setup-sr-only">{playerFields ? 'Game setup' : 'Game rules'}</legend>
    <section className="setup-section">
      <div className="setup-section-heading"><label>Choose your game</label><span>GAME MODE</span></div>
      <div className="mode-options" role="group" aria-label="Game mode">
        {MODES.map(({ id: mode, title, english, icon: Icon }) => <button type="button" key={mode} className={`mode-option ${mode === 'half' ? 'is-arena' : mode === 'party' ? 'is-party' : ''} ${settings.mode === mode ? 'is-selected' : ''}`} disabled={!!roomSettings && ((roomSettings.mode === 'party') !== (mode === 'party'))} aria-pressed={settings.mode === mode} onClick={() => patch({ mode, ...(mode === 'party' ? { playerCount: settings.playerCount === 4 ? 4 : 3 } : {}) })}>
          <Icon size={21} strokeWidth={1.5} /><strong>{title}</strong><small>{english}</small>{settings.mode === mode && <Check size={12} className="mode-check" />}
        </button>)}
      </div>
      {roomSettings && <p className="setup-hint">Start a new room to switch between two-player and 3–4-player games.</p>}
      {!playerFields && <p className="setup-description">{currentMode.description}</p>}
    </section>

    {settings.mode === 'party' && <section className="setup-section party-count-section">
      <div className="setup-section-heading"><label>Play your way</label><span>THREE WAYS TO PLAY</span></div>
      <div className="party-count-options party-format-options" role="group" aria-label="Multiplayer format">
        {[
          { count: 3, variant: 'ffa', title: 'Three Players', subtitle: 'Free for All', label: 'Three Players', Icon: Users },
          { count: 4, variant: 'ffa', title: 'Four Players', subtitle: 'Free for All', label: 'Four Players · Free for All', Icon: Swords },
          { count: 4, variant: 'teams', title: 'Four Players', subtitle: 'Two versus Two', label: 'Four Players · Two versus Two', Icon: Handshake },
        ].map(({ count, variant, title, subtitle, label, Icon }) => {
          const selected = (settings.playerCount || 3) === count && teams === (variant === 'teams');
          return <button type="button" key={`${count}-${variant}`} className={selected ? 'is-selected' : ''} aria-label={label} aria-pressed={selected} disabled={count === 3 && occupiedColors.includes('green')} onClick={() => patch({ playerCount: count, partyVariant: variant })}>
            <Icon size={21} /><span className="party-format-copy"><strong>{title}</strong><small>{subtitle}</small></span>
          </button>;
        })}
      </div>
      {occupiedColors.includes('green') && <p className="setup-hint">Green has joined. Start a new room to switch to three players.</p>}
      <p className="setup-hint">{(settings.playerCount || 3) === 3 ? '96 squares · Hexagonal board. Everyone plays for themselves; the last active player wins.' : teams ? '160 squares · Cross board. Red + Yellow vs Blue + Green. Checkmate either opponent to win together.' : '160 squares · Cross board. Everyone plays for themselves; the last active player wins.'}</p>
    </section>}

    {playerFields}
    {playerFields && <section className="setup-section"><p className="setup-description">{currentMode.description}</p></section>}

    {settings.mode === 'endgame' && <section className="setup-section endgame-section">
      <div className="setup-section-heading"><label>Starting position</label><span>CLASSIC OR CUSTOM</span></div>
      <div className="endgame-options" role="group" aria-label="Choose an endgame">
        {ENDGAMES.map(endgame => <button type="button" key={endgame.id} className={`endgame-option ${settings.endgameId === endgame.id ? 'is-selected' : ''}`} aria-pressed={settings.endgameId === endgame.id} onClick={() => patch({ endgameId: endgame.id, customFen: '' })}><span><strong>{endgame.name}</strong><small>{endgame.subtitle}</small></span>{settings.endgameId === endgame.id ? <Check size={16} /> : <ArrowRight size={15} />}</button>)}
        <button type="button" className={`endgame-option endgame-custom ${custom ? 'is-selected' : ''}`} aria-pressed={custom} onClick={() => { updateCustom(customFen || selectedEndgame?.fen || INITIAL_FEN); setEditorOpen(true); }}><span><strong><SlidersHorizontal size={14} />Custom position</strong><small>Build a position or import a FEN</small></span>{custom ? <Check size={16} /> : <Plus size={16} />}</button>
      </div>
      {!custom && selectedEndgame && <div className="endgame-description"><Sparkles size={16} /><div><p>{selectedEndgame.description}</p>{selectedEndgame.sourceUrl && <a href={selectedEndgame.sourceUrl} target="_blank" rel="noreferrer">Explore this endgame <ArrowRight size={12} /></a>}</div></div>}
      {custom && <div className="endgame-custom-fields">
        <label className="setup-field-label" htmlFor={`${id}-fen`}>Starting position (FEN)</label>
        <textarea id={`${id}-fen`} className="setup-fen-input" value={customFen} placeholder="Paste a FEN or use the board editor below" spellCheck={false} rows={2} maxLength={200} onChange={event => updateCustom(event.target.value)} aria-invalid={!fenValidation.empty && !fenValidation.ok} aria-describedby={`${id}-fen-feedback`} />
        <p id={`${id}-fen-feedback`} className={`setup-validation ${fenValidation.ok ? 'is-valid' : 'is-invalid'}`} role="status">{fenValidation.ok && <Check size={13} />}{fenValidation.message}</p>
        <button type="button" className="setup-editor-toggle" aria-expanded={editorOpen} onClick={() => setEditorOpen(!editorOpen)}><Grid2X2 size={15} />{editorOpen ? 'Hide board editor' : 'Open board editor'}<ChevronDown size={15} className={editorOpen ? 'is-open' : ''} /></button>
        {editorOpen && <PositionEditor fen={customFen} onChange={updateCustom} />}
      </div>}
    </section>}

    {settings.mode === 'half' && <section className="setup-section half-shape-section">
      <div className="setup-section-heading"><label>Choose your board</label><span>THREE SIZES</span></div>
      <div className="half-shape-options" role="group" aria-label="Chaos Kingdom board size">
        {HALF_SHAPES.map(shape => <button type="button" key={shape.id} className={`half-shape-option ${halfShape.id === shape.id ? 'is-selected' : ''}`} aria-pressed={halfShape.id === shape.id} aria-label={`${shape.label} arena, ${shape.columns} files by ${shape.rows} ranks, ${shape.coordinates}`} onClick={() => { if (halfShape.id !== shape.id) resetArena({ halfShape: shape.id }); }}>
          <span className="half-shape-preview" aria-hidden="true"><span className="half-shape-grid" style={{ '--shape-columns': shape.columns, '--shape-rows': shape.rows }}>{Array.from({ length: shape.columns * shape.rows }, (_, index) => <i key={index} className={(index % shape.columns + Math.floor(index / shape.columns)) % 2 ? 'is-dark' : 'is-light'} />)}</span></span>
          <span className="half-shape-label"><strong>{shape.columns} × {shape.rows}</strong><small>{shape.label} · {shape.coordinates}</small></span>
          {halfShape.id === shape.id && <Check size={13} className="half-shape-check" />}
        </button>)}
      </div>
      <p className="setup-hint">All three sizes support either win condition. Changing the size resets your starting arrangement.</p>
    </section>}

    {settings.mode === 'half' && <section className="setup-section arena-win-section">
      <div className="setup-section-heading"><label>How to win</label><span>VICTORY RULE</span></div>
      <div className="arena-win-options" role="group" aria-label="Chaos Kingdom win condition">
        <button type="button" className={halfWin === 'capture-king' ? 'is-selected' : ''} aria-pressed={halfWin === 'capture-king'} aria-describedby={`${id}-king-requirement`} onClick={() => setWinCondition('capture-king')}><Crown size={20} /><strong>Capture the king</strong><small>Take the opposing king to win</small>{halfWin === 'capture-king' && <Check size={12} className="arena-win-check" />}</button>
        <button type="button" className={halfWin === 'capture-all' ? 'is-selected' : ''} aria-pressed={halfWin === 'capture-all'} onClick={() => setWinCondition('capture-all')}><Swords size={20} /><strong>Capture all pieces</strong><small>Clear every opposing piece</small>{halfWin === 'capture-all' && <Check size={12} className="arena-win-check" />}</button>
      </div>
      <p id={`${id}-king-requirement`} className="setup-hint">{halfWin === 'capture-king' ? 'Each side needs one king before play. Kings move normally and can be captured; check and checkmate do not apply.' : 'Choose kings independently for each side, or leave them out. Capturing a king alone does not win while other pieces remain.'}</p>
      {halfWin === 'capture-king' && missingKings.length > 0 && <p className="arena-king-validation" role="alert"><Crown size={16} /><span>Add a king to {missingKings.length === 2 ? 'each side' : missingKings[0] === 'w' ? 'White’s roster' : 'Black’s roster'} before starting. Use the King + button below.</span></p>}
      {winNotice && <p className="arena-win-notice" role="status">{winNotice}</p>}
    </section>}

    {settings.mode === 'half' && <section className="setup-section roster-section">
      <div className="setup-section-heading"><label>Choose your pieces</label><span>BUILD YOUR SIDES</span></div>
      <p className="setup-hint arena-roster-hint">Choose 1–16 pieces per side. Each side has its own King − / + controls.</p>
      <div className="roster-options">{['w', 'b'].map(color => <RosterPicker key={color} color={color} counts={counts[color]} winCondition={halfWin} onChange={roster => resetArena({ halfCounts: { ...counts, [color]: roster } })} />)}</div>
      <button type="button" className="roster-copy" onClick={() => resetArena({ halfCounts: { ...counts, b: { ...counts.w } } })}><Copy size={13} />Copy White’s pieces to Black</button>
      <div className="setup-rule-note"><Swords size={17} /><p>{halfShape.columns} × {halfShape.rows} board, {halfShape.coordinates}. {halfWin === 'capture-king' ? 'Capture the opposing king to win.' : 'Capture every opposing piece to win.'} There is no check, checkmate, or castling.</p></div>
      <p className="setup-hint">Changing either roster resets all pieces to their default squares.</p>
    </section>}

    {settings.mode === 'half' && <section className="setup-section arena-arrangement-section">
      <div className="setup-section-heading"><label>Arrange your pieces</label><span>THE STARTING POSITION</span></div>
      <div className="arena-placement-options" role="group" aria-label="Starting placement rules">
        <button type="button" className={settings.halfPlacement !== 'anywhere' ? 'is-selected' : ''} aria-pressed={settings.halfPlacement !== 'anywhere'} onClick={() => setPlacement('territory')}><ShieldCheck size={17} /><strong>Own half</strong><small>White below, Black above</small></button>
        <button type="button" className={settings.halfPlacement === 'anywhere' ? 'is-selected' : ''} aria-pressed={settings.halfPlacement === 'anywhere'} onClick={() => setPlacement('anywhere')}><Grid2X2 size={17} /><strong>Anywhere</strong><small>Use every square freely</small></button>
      </div>
      <p className="setup-hint">{settings.halfPlacement === 'anywhere' ? 'Place either color anywhere. Pawn movement still follows each side’s direction.' : `White starts on ranks 1–${halfShape.rows / 2}; Black starts on ranks ${halfShape.rows / 2 + 1}–${halfShape.rows}. Both pieces in a swap must remain in their own half.`}</p>
      <ArenaPositionEditor key={arenaResetKey} settings={settings} onChange={halfPosition => { patch({ halfPosition }); setArenaNotice(''); }} />
      <button type="button" className="arena-reset" onClick={() => resetArena({})}><RotateCcw size={14} />Reset starting squares</button>
      {arenaNotice && <p className="arena-change-notice" role="status">{arenaNotice}</p>}
    </section>}

    <section className="setup-section undo-section">
      <div className="setup-section-heading"><label>Takebacks</label><span>SECOND CHANCES</span></div>
      <div className="undo-options" role="group" aria-label="Takeback rules">
        {UNDO_MODES.map(({ id: mode, title, icon: Icon }) => <button type="button" key={mode} className={`undo-option ${settings.undoMode === mode ? 'is-selected' : ''}`} aria-pressed={settings.undoMode === mode} onClick={() => patch({ undoMode: mode })}><Icon size={16} /><span>{title}</span></button>)}
      </div>
      <p className="setup-hint">{settings.undoMode === 'free' ? 'Take back moves within your allowance, without asking.' : settings.undoMode === 'approval' ? settings.mode === 'party' ? teams ? 'All three other players must approve, including your teammate.' : 'Every other seated player must approve, including eliminated players.' : 'Your opponent must approve each takeback request.' : 'Played moves are final. No takebacks during the game.'}</p>
      {settings.undoMode !== 'off' && <div className="undo-limit-settings">
        <p className="undo-unit-heading"><strong>Plies per player</strong><span>1 ply = one player’s move</span></p>
        <div className="undo-custom-row"><label htmlFor={`${id}-undo-limit`}>Custom allowance</label><div className="undo-custom-limit"><input id={`${id}-undo-limit`} aria-label="Custom takeback allowance per player" aria-invalid={!!undoError} aria-describedby={`${id}-undo-feedback`} type="number" inputMode="numeric" min="1" max={Number.MAX_SAFE_INTEGER} step="1" placeholder="Enter a number" value={undoDraft} onChange={event => {
          const draft = event.target.value;
          setUndoDraft(draft);
          setUndoError('');
          if (draft === '') return;
          const value = Number(draft);
          if (Number.isSafeInteger(value) && value >= 1) patch({ undoLimit: value });
          else setUndoError('Enter a whole number from 1 to 9,007,199,254,740,991, or choose ∞.');
        }} onBlur={() => {
          if (undoDraft === '' && settings.undoLimit === null) return;
          const value = Number(undoDraft);
          if (!undoDraft || !Number.isSafeInteger(value) || value < 1) {
            setUndoError(`Enter a whole number of at least 1. Your allowance remains ${settings.undoLimit === null ? 'unlimited' : `${settings.undoLimit} ${settings.undoLimit === 1 ? 'ply' : 'plies'}`}.`);
            setUndoDraft(settings.undoLimit === null ? '' : String(settings.undoLimit));
          }
        }} /><span>plies</span></div></div>
        <p id={`${id}-undo-feedback`} className={`undo-input-feedback ${undoError ? 'is-invalid' : ''}`} role="status">{undoError || 'Choose any positive whole number, or ∞ for unlimited.'}</p>
        <div className="undo-limit-options" role="group" aria-label="Takeback allowance presets">
          {[1, 3, 5, 10, null].map(limit => <button key={limit ?? 'unlimited'} type="button" className={settings.undoLimit === limit ? 'is-selected' : ''} aria-label={limit === null ? 'Unlimited takebacks' : `${limit} ${limit === 1 ? 'ply' : 'plies'} per player`} aria-pressed={settings.undoLimit === limit} onClick={() => { setUndoDraft(limit === null ? '' : String(limit)); setUndoError(''); patch({ undoLimit: limit }); }}>{limit === null ? <InfinityIcon size={19} /> : limit}</button>)}
        </div>
        <p className="setup-hint undo-explanation">This is your total allowance for the game. Each reversed player move uses 1 ply{settings.mode === 'party' ? '. A full round costs one ply per active player.' : '; one move from each player uses 2 plies.'}</p>
      </div>}
    </section>

    <section className="setup-section setup-time-section">
      <label className="setup-field-label" htmlFor={`${id}-time`}><Clock3 size={15} />Time control</label>
      <div className="setup-select-wrap"><select id={`${id}-time`} value={settings.timeControl} onChange={event => patch({ timeControl: event.target.value })}><option value="unlimited">Untimed</option><option value="rapid">10 minutes</option><option value="blitz">5 min + 3 sec / move</option><option value="bullet">3 min + 2 sec / move</option></select><ChevronDown size={15} aria-hidden="true" /></div>
    </section>
  </fieldset>;
}
