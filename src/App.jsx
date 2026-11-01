import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Check, CheckCheck, ChevronDown, Copy, Flag, LogOut, Globe2, Handshake, HelpCircle, Link2, Maximize2, RotateCcw, RotateCw, Settings2, ShieldCheck, Sparkles, Users, Volume2, VolumeX, Wifi, WifiOff, X, BookOpen, ArrowLeft, MoveUpRight } from 'lucide-react';
import ChessPiece from './ChessPiece.jsx';
import CartoonPiece, { preloadCaptureArtwork } from './CartoonPiece.jsx';
import Brand from './Brand.jsx';
import AnimationControls from './AnimationControls.jsx';
import MoveEffects from './MoveEffects.jsx';
import PlayerShow from './PlayerShow.jsx';
import usePieceAnimations from './usePieceAnimations.js';
import { normalizeAnimationPreferences, choosePieceStyle, setAnimationChannel } from '../shared/animationPreferences.js';
import './seat-shows.css';
import HeroWordmark from './HeroWordmark.jsx';
import QueenDelight from './QueenDelight.jsx';
import SetupPanel from './SetupPanel.jsx';
import PartyBoard, { PartySeats, PartyTable, PARTY_NAMES } from './PartyBoard.jsx';
import { useGame, getRoomCode, readStorage, writeStorage } from './useGame.js';
import useLocalGame from './useLocalGame.js';
import { DEFAULT_SETTINGS, createGame, normalizeSettings, getGameOutcome, getPlayerColors, getPartyGeometry } from '../shared/game.js';
import { isPartyTeams, partyTeamFor, partyTeamColors, partyTeamLabel } from '../shared/partyTeams.js';
import { ENDGAMES } from '../shared/endgames.js';
import { getMoveHints } from '../shared/moveHints.js';
import { updateSetupDefaults } from './setupDefaults.js';
import './agreement.css';
import './arena-theme.css';
import { fitDesktopBoard } from './boardLayout.js';
import './board-layout.css';
import './party.css';

const colorName = { w: 'White', b: 'Black', ...PARTY_NAMES };
const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const modeNames = { classic: 'Classic chess', endgame: 'Endgames', half: 'Chaos Kingdom', custom: 'Custom position', party: 'Multiplayer chess' };
const timeNames = { unlimited: 'No time limit', rapid: '10 minutes', blitz: '5 min + 3 sec', bullet: '3 min + 2 sec' };
const reasons = { 'last-player-standing': 'Last player standing', checkmate: 'Checkmate', stalemate: 'Stalemate · Draw', 'insufficient-material': 'Insufficient material · Draw', 'threefold-repetition': 'Threefold repetition · Draw', 'fifty-move-rule': 'Fifty-move rule · Draw', 'capture-all': 'All opposing pieces captured', 'capture-king': 'Opposing king captured', elimination: 'All opposing pieces captured', resignation: 'Opponent resigned', timeout: 'Opponent ran out of time', 'timeout-insufficient-material': 'Time expired · Opponent cannot checkmate', agreement: 'Draw by agreement' };
const other = (c) => c === 'w' ? 'b' : 'w';
const halfShapeName = (shape) => ({ '4x8': '4 × 8', '8x8': '8 × 8' }[shape] || '8 × 4');
const arenaWinName = (win) => win === 'capture-king' ? 'Capture the king' : 'Capture all pieces';
const teammateFor = color => partyTeamColors(partyTeamFor(color)).find(seatColor => seatColor !== color);
const cloneSettings = () => structuredClone(DEFAULT_SETTINGS);
function clockText(value) { if (value === null || value === undefined) return '∞'; const s = Math.ceil(value / 1000); return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`; }

function Modal({ title, eyebrow, children, onClose, className = '', hideHeading = false, hideCloseButton = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const key = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab') {
        const items = Array.from(ref.current?.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]') || []).filter(item => !item.disabled && item.tabIndex >= 0 && item.getClientRects().length);
        if (!items.length) { e.preventDefault(); return; }
        const active = document.activeElement;
        const atContainer = active === ref.current || !ref.current?.contains(active);
        if (e.shiftKey && (active === items[0] || atContainer)) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && (active === items[items.length - 1] || atContainer)) { e.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
    <section ref={ref} tabIndex={-1} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      {onClose && !hideCloseButton && <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>}
      {!hideHeading && <><span className="eyebrow">{eyebrow || 'AT QUEENIE’S'}</span><h2>{title}</h2></>}{children}
    </section>
  </div>;
}

function Board({ board, mode, selected, legalMoves, lastMove, inCheck, turn, flipped, faceToFace, hints, onSquare, enabled, characters, cartoons, moving }) {
  const rows = board.length;
  const columns = board[0]?.length || 8;
  const isArena = mode === 'half';
  const squares = board.flatMap((row, y) => row.map((piece, x) => ({ piece, square: `${'abcdefgh'[x]}${rows - y}`, x, y })));
  if (flipped) squares.reverse();
  const { origins, destinations, captures } = getMoveHints(legalMoves, selected, { enabled: hints, canPlay: enabled });
  return <div className={`chessboard ${isArena ? 'arena-board' : ''} ${faceToFace ? 'face-to-face' : ''}`} style={{ '--board-columns': columns, '--board-rows': rows }} role="group" aria-label={isArena ? `${columns} × ${rows} Chaos Kingdom board` : 'Chessboard'}>
    {squares.map(({ piece, square, x, y }, index) => {
      const isTarget = destinations.has(square);
      return <button key={square} data-square={square} className={`square ${(x + y) % 2 ? 'dark-square' : 'light-square'} ${selected === square ? 'selected-square' : ''} ${lastMove && [lastMove.from, lastMove.to].includes(square) ? 'last-move' : ''} ${inCheck && piece?.type === 'k' && piece.color === turn ? 'checked-square' : ''}`}
        onClick={event => onSquare(square, piece, event.currentTarget)} aria-label={`${square}${piece ? ` ${colorName[piece.color]} ${pieceNames[piece.type]}` : ' empty square'}${origins.has(square) ? ', can move' : ''}${isTarget ? captures.has(square) ? ', legal capture' : ', legal destination' : ''}`} aria-pressed={selected === square} aria-disabled={!enabled && piece?.type !== 'q'}>
        {index % columns === 0 && <span className="rank-label">{square[1]}</span>}
        {index >= squares.length - columns && <span className="file-label">{square[0]}</span>}
        {piece && (cartoons && characters[square] ? <CartoonPiece character={characters[square]} type={piece.type} color={piece.color} className={`board-piece ${faceToFace && piece.color === 'b' ? 'opponent-piece' : ''} ${moving.has(square) ? 'piece-in-motion' : ''}`} /> : <ChessPiece type={piece.type} color={piece.color} className={`board-piece ${faceToFace && piece.color === 'b' ? 'opponent-piece' : ''}`} />)}
        {origins.has(square) && <span className="movable-piece-hint" aria-hidden="true" />}
        {isTarget && <span className={captures.has(square) ? 'capture-hint' : 'move-hint'} aria-hidden="true" />}
      </button>;
    })}
  </div>;
}

function PlayerSeat({ color, name, active, clock, connected, top, faceToFace, local, captured = [], showEnabled, showEvent, onShowDone, cartoons }) {
  return <div className={`player-seat ${active ? 'active-seat' : ''} ${top && faceToFace ? 'inverted-seat' : ''} ${showEnabled ? 'has-player-show' : ''}`}>
    <div className={`player-avatar ${color === 'b' ? 'dark-avatar' : ''}`}>{cartoons ? <CartoonPiece type="k" color={color} /> : <ChessPiece type="k" color={color} />}</div>
    <div className="player-details"><div className="player-name">{name || (color === 'w' ? 'White makes the first move' : 'A seat for Black')} {active && <span className="turn-dot" />}</div>
      <div className="player-meta">{name ? `${colorName[color]} · ${local ? 'Same-device player' : connected ? 'Connected' : 'Connecting'}` : 'Bring a friend. The board is ready.'}<span className="captured-pieces">{captured.map((type, i) => <ChessPiece key={i} type={type} color={other(color)} />)}</span></div>
    </div>{showEnabled && <PlayerShow event={showEvent} seatColor={color} onDone={() => onShowDone(showEvent?.animationId)} />}<div className={`player-clock ${active ? 'active-clock' : ''}`}>{clockText(clock)}</div>
  </div>;
}

function rosterText(counts) {
  return ['k', 'q', 'r', 'b', 'n', 'p'].filter(type => counts[type]).map(type => `${counts[type]} ${pieceNames[type]}${counts[type] === 1 ? '' : 's'}`).join(' · ') || 'No pieces';
}

function GameRules({ settings }) {
  const position = useMemo(() => {
    try {
      const game = createGame(settings);
      const counts = Object.fromEntries(getPlayerColors(settings).map(color => [color, {}]));
      for (const piece of game.board().flat()) if (piece) counts[piece.color][piece.type] = (counts[piece.color][piece.type] || 0) + 1;
      return { counts, turn: game.turn(), valid: true };
    } catch { return { counts: settings.mode === 'half' ? settings.halfCounts : null, turn: null, valid: false }; }
  }, [settings]);
  const arena = settings.mode === 'half';
  const party = settings.mode === 'party';
  const teams = isPartyTeams(settings);
  const colors = getPlayerColors(settings);
  const needsKings = arena && settings.halfWin === 'capture-king' && (settings.halfCounts?.w?.k !== 1 || settings.halfCounts?.b?.k !== 1);
  const rows = settings.halfShape === '8x4' || !settings.halfShape ? 4 : 8;
  const endgame = ENDGAMES.find(item => item.id === settings.endgameId);
  const placement = settings.halfPlacement === 'anywhere' ? 'Anywhere: both colors may start on either side.' : `Own half: White ranks 1–${rows / 2}; Black ranks ${rows / 2 + 1}–${rows}.`;
  const clock = { unlimited: 'Untimed. Take your time.', rapid: '10 minutes per player; no increment.', blitz: '5 minutes per player + 3 seconds after each move.', bullet: '3 minutes per player + 2 seconds after each move.' }[settings.timeControl];
  const allowance = settings.undoLimit === null ? 'Unlimited' : `${settings.undoLimit}`;
  return <dl className="agreed-rules">
    <div><dt>Game</dt><dd>{teams ? '2v2 Teams' : modeNames[settings.mode]} · {party ? `${colors.length} players · ${colors.length === 3 ? '96-cell hexagon' : '160-cell cross'}` : arena ? halfShapeName(settings.halfShape) : '8 × 8'}{position.turn && ` · ${colorName[position.turn]} moves first`}</dd></div>
    <div><dt>Start</dt><dd>{arena ? settings.halfPosition ? 'Custom arrangement: your chosen starting squares.' : 'Automatic arrangement for the selected roster.' : settings.mode === 'custom' || (settings.mode === 'endgame' && settings.endgameId === 'custom') ? 'Custom position from the board editor / FEN.' : settings.mode === 'endgame' ? endgame?.name || 'Selected endgame' : 'Standard starting position.'}</dd></div>
    {!position.valid && <div><dt>Position</dt><dd>{needsKings ? 'Capture the king requires one king on each side. Add the missing kings before starting.' : 'The starting position or settings need correction before this game can begin.'}</dd></div>}
    {arena && <div><dt>Placement</dt><dd>{placement}</dd></div>}
    {colors.map(color => <div key={color}><dt>{colorName[color]}</dt><dd>{position.counts?.[color] ? rosterText(position.counts[color]) : 'Complete a valid starting position first.'}</dd></div>)}
    {teams && <div><dt>Teams</dt><dd>Red + Yellow against Blue + Green. Opposite seats are teammates. Each person controls only their own army. Teammates cannot capture or check each other, and their pieces still block squares.</dd></div>}
    {party && <div><dt>Turn order</dt><dd>{colors.map(color => colorName[color]).join(' → ')}. {teams ? 'One move per person; teams alternate.' : 'Eliminated players are skipped.'}</dd></div>}
    {arena && <div><dt>Kings</dt><dd>White: {position.counts?.w?.k ? 'one king' : 'no king'} · Black: {position.counts?.b?.k ? 'one king' : 'no king'}. Kings can be captured.</dd></div>}
    <div><dt>Win</dt><dd>{teams ? 'Checkmate either opposing king to win as a team. Checkmate is judged when that player’s turn arrives. If a player resigns or runs out of time, their whole team loses immediately. Kings are never captured.' : party ? 'Be the last active player. Checkmate or stalemate eliminates a player at the start of their turn. Resigning or running out of time also eliminates that player. Live kings cannot be captured.' : arena ? settings.halfWin === 'capture-king' ? 'Capture the opposing king to win immediately. Each side must begin with exactly one king.' : 'Capture every opposing piece to win. Taking a king alone does not end the game while other opposing pieces remain.' : 'Checkmate the opposing king to win. Kings are never captured.'}</dd></div>
    {party && !teams && <div><dt>After elimination</dt><dd>The army turns gray. Its pieces remain on the board as capturable obstacles and no longer attack.</dd></div>}
    <div><dt>Movement</dt><dd>{teams && 'Your move must leave your own king safe from both opponents. You may help your teammate escape check before their turn. '}{party ? `Check rules, castling when legal, an initial two-square pawn move, and four promotion choices apply. No en passant. ${colors.length === 3 ? 'Pawns follow their file through the center and promote on either opposing back rank. Diagonals and knight paths can branch at the center; hints show the legal routes.' : 'Pawns promote on their eighth rank from home.'}` : arena ? 'No check, castling, or en passant. Pawns advance one square, capture diagonally, and promote on the far rank.' : 'Standard legal moves, castling when permitted, en passant, and all four pawn promotions.'}</dd></div>
    <div><dt>Draws</dt><dd>{teams ? 'Stalemate when any player’s turn arrives, threefold repetition, 50 full rounds without a pawn move or capture, or agreement by all four players draws the whole game.' : party ? 'Threefold repetition, 50 full rounds without a pawn move or capture, or agreement by all active players. Stalemate eliminates a player instead of drawing the game.' : <>No legal moves{arena ? '' : ' while not in check'}, threefold repetition, 50 moves without a pawn move or capture{arena ? '' : ', insufficient material'}, or mutual agreement.</>}</dd></div>
    <div><dt>Takebacks</dt><dd>{settings.undoMode === 'off' ? 'Off. Played moves are final.' : <>{settings.undoMode === 'free' ? 'Free: no opponent approval needed.' : teams ? 'Ask first: all three other players must approve, including your teammate.' : party ? 'Ask first: every other seated player must approve, including eliminated players.' : 'Ask first: the opponent must approve each request.'} {allowance} {settings.undoLimit === 1 ? 'ply' : 'plies'} per player, counted across the whole game. One player’s move = 1 ply{party ? '; a full round costs one per active player' : '; a full round = 2'}. Time spent is not restored.{party && !teams && ' Takebacks may revive a checkmated or stalemated player, but cannot cross a resignation or timeout.'}{teams && ' Takebacks are available only while the game is playing.'}</>}</dd></div>
    <div><dt>Clock</dt><dd>{clock} {settings.timeControl !== 'unlimited' && 'After the game starts, the active clock keeps running while reading rules.'}</dd></div>
  </dl>;
}

function GuideContent() {
  return <><div className="guide-sections">
    <section><span>01 / CLASSIC & ENDGAMES</span><h3>Familiar rules. A fresh start.</h3><p>Classic chess includes castling, en passant, and all four promotions. Choose a famous endgame, arrange your own pieces, or import a FEN position. Standard games require one king per side and legal starting positions.</p></section>
    <section><span>02 / TAKEBACKS</span><h3>Agree on your second chances.</h3><p>Choose Off, Free, or Ask first before play. Each player has a separate allowance for the whole game. One player’s move costs 1 ply; a full round costs one ply per active player. In 3–4 player games, approval requires every other seated player, including eliminated players. Choose a positive whole number or unlimited. A takeback never restores time already spent.</p></section>
    <section><span>03 / CHAOS KINGDOM</span><h3>Your board. Your starting line.</h3><p>Choose 8 × 4 (a1–h4), 4 × 8 (a1–d8), or 8 × 8 (a1–h8). Select 1–16 pieces per side, including zero or one king for each player independently. Use automatic placement or arrange the pieces yourself. Own half keeps each side in its starting half; Anywhere lets the colors mix across the board.</p><p>Choose your victory rule. Capture all pieces means taking every opposing piece, even if you take their king first. Capture the king ends immediately when the opposing king is taken and requires one starting king per side. There is no check, castling, or en passant in either rule set. Pawns advance one square, capture diagonally, and promote on the far rank. No legal moves, threefold repetition, or 50 moves without a pawn move or capture ends in a draw.</p></section>
    <section><span>04 / THREE OR FOUR PLAYERS</span><h3>More sides to the story.</h3><p>Choose a 96-cell hexagon for three players or a 160-cell cross for four. Red starts, then Blue, Yellow, and Green when present. In Free-for-all, everyone plays for themselves. Protect your king: checkmate, stalemate, resignation, or timeout eliminates a player. Their gray pieces stay on the board, can be captured, and stop attacking. The last active player wins.</p><p>With four players, choose 2v2 Teams: Red + Yellow versus Blue + Green. Each person moves only their own army. Teammates cannot capture or check one another; their pieces still block squares. Your own king must stay safe from both opponents. Checkmate either enemy when their turn arrives and both teammates win. A resignation or timeout loses the whole team immediately; stalemate draws the whole game. Threefold repetition, 50 full rounds without a pawn move or capture, or all four players agreeing also draws. There are no points, transferred pieces, or eliminated armies in 2v2.</p><p>Castling and an initial two-square pawn move are available when legal. There is no en passant. On the hexagon, files continue through the center into an opposing sector; a pawn promotes on that opponent’s back rank. Diagonals can branch at the center, and knights follow the connected grid. Move hints show the legal paths. On the cross, pawns promote on their eighth rank from home. Choose queen, rook, bishop, or knight.</p><p>Online, the game starts automatically when all three or four players have joined and are connected. On a shared device, each army faces its own side and one confirmation starts the game for everyone. Takebacks start off; Free and Ask first remain available.</p></section>
    <section><span>05 / SAME DEVICE</span><h3>A seat for every player.</h3><p>Share one phone, tablet, or computer. In two-player games, White sits below the screen and Black above it. Black’s pieces, player panel, and rules face Black. In three- and four-player games, each army faces its own side. Read the rules together, then choose Agree &amp; start game once for the whole table.</p></section>
    <section><span>06 / PIECE ANIMATIONS</span><h3>A little character in every move.</h3><p>Choose Cartoon or Classic pieces. With Cartoon, switch On board and By players on or off independently: either, both, or neither. On board moves characters between their squares and brings captures to life with a brief cartoon clash. By players puts a longer show beside the players’ names and works with either piece style. Classic offers only the By players switch. Turning animations off keeps your chosen artwork. Online, the show faces you; on one device, each seat has its own view. Characters keep their identity after moves, captures, takebacks, and promotion. These display preferences do not change the agreed rules. Reduced motion replaces action with a brief fade.</p></section>
    <section><span>07 / MOVE HINTS</span><h3>See the next step clearly.</h3><p>Hints start off. Turn them on to mark pieces that can move. Select one to see legal destinations: a solid dot is a move; a ring is a capture, including en passant. A piece with no legal moves shows no destinations. Hints appear only while you can play. Turn them off for an unmarked board.</p></section>
  </div><div className="guide-source"><strong>Classic endgame references</strong>{ENDGAMES.map(endgame => <a key={endgame.id} href={endgame.sourceUrl} target="_blank" rel="noreferrer">{endgame.name}<ArrowUpRight size={12} /></a>)}</div></>;
}

function FacingRulesPanel({ color, title, children, onClose }) {
  return <section className={`facing-rules-panel ${color === 'b' ? 'faces-black' : 'faces-white'}`} aria-label={`${colorName[color]} player’s rules`}>
    <header className="facing-rules-heading"><div><span className="eyebrow">{colorName[color]}’S SIDE</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label={`Close ${colorName[color]} player’s rules`}><X size={17} /></button></header>
    <p className="facing-scroll-caption">Scroll within your panel to read every rule.</p>
    <div className="facing-rules-scroll" tabIndex={0} aria-label={`${colorName[color]}: scroll to read all rules`}>{children}</div>
  </section>;
}

function PartyRequests({ room, isLocal, myColor, execute }) {
  const teams = isPartyTeams(room.settings);
  const renderResponses = (required, approved, event) => <div className="party-response-list">
    {required.map(color => <div key={color}><strong>{colorName[color]} · {room.players[color]?.name}</strong>{approved.includes(color) ? <span> · Agreed</span> : isLocal || myColor === color ? <div className="response-buttons"><button onClick={() => execute(event, { accept: false, color })}>Decline</button><button onClick={() => execute(event, { accept: true, color })}>I agree</button></div> : <span> · Waiting</span>}</div>)}
  </div>;
  return <>
    {room.undoRequest && <div className="notice takeback-notice"><RotateCcw size={18} /><div><strong>{colorName[room.undoRequest.color]} requests {room.undoRequest.plies} {room.undoRequest.plies === 1 ? 'ply' : 'plies'} back</strong><p>{teams ? 'All three other players must agree, including the requester’s teammate.' : 'Every other seated player must agree, including eliminated players.'}</p>{renderResponses(room.undoRequest.required || [], room.undoRequest.approvals || [], 'game:respond-undo')}</div></div>}
    {room.drawOffer && <div className="notice"><Handshake size={18} /><div><strong>{colorName[room.drawOffer]} offers a draw</strong><p>{teams ? 'All four players must agree.' : 'Every active player must agree.'}</p>{renderResponses((room.activeColors || room.colors).filter(color => color !== room.drawOffer), room.drawVotes || [], 'game:respond-draw')}</div></div>}
  </>;
}

export default function App() {
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const notify = useCallback((message, success = false) => { setToast({ message, success }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 5500); }, []);
  const remote = useGame(notify);
  const local = useLocalGame(notify);
  const [playType, setPlayType] = useState(() => getRoomCode() ? 'online' : readStorage('between:playType', 'online'));
  const room = playType === 'local' ? local.room : remote.room;
  const [settings, setSettings] = useState(cloneSettings);
  const setupTakebacks = useRef({});
  const changeSetup = next => {
    const update = updateSetupDefaults(settings, next, setupTakebacks.current);
    setupTakebacks.current = update.preferences;
    setSettings(update.settings);
  };
  const [name, setName] = useState(() => readStorage('between:name'));
  const [blackName, setBlackName] = useState('');
  const [partyNames, setPartyNames] = useState({ blue: '', yellow: '', green: '' });
  const [seat, setSeat] = useState('w');
  const [joinCode, setJoinCode] = useState(getRoomCode);
  const [modal, setModal] = useState(() => getRoomCode() && !readStorage(`chessclub:${getRoomCode()}`, '', true) ? 'join' : null);
  const [selected, setSelected] = useState(null);
  const [queenMoment, setQueenMoment] = useState(null);
  const queenSequence = useRef(0);
  const dismissQueen = useCallback(() => setQueenMoment(null), []);
  const [promotion, setPromotion] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [hints, setHints] = useState(false);
  const [animationPreferences, setAnimationPreferences] = useState(() => normalizeAnimationPreferences({ pieceStyle: readStorage('between:piece-style'), board: readStorage('between:board-animation'), players: readStorage('between:player-animation'), enabled: readStorage('between:animations'), placement: readStorage('between:animation-placement') }));
  const { pieceStyle, board: boardAnimation, players: playerAnimation } = animationPreferences;
  const cartoons = pieceStyle === 'cartoon';
  const boardAnimationEnabled = cartoons && boardAnimation;
  useEffect(() => {
    if (boardAnimationEnabled || playerAnimation) preloadCaptureArtwork();
  }, [boardAnimationEnabled, playerAnimation]);
  const [sound, setSound] = useState(false);
  const [rulesEditing, setRulesEditing] = useState(false);
  const [undoPlies, setUndoPlies] = useState(1);
  const [actor, setActor] = useState('w');
  const boardArea = useRef(null);
  const setupArea = useRef(null);
  const boardFrame = useRef(null);
  const audio = useRef(null);
  const activeSettings = room?.settings || settings;
  const displayedMode = (rulesEditing ? settings : activeSettings).mode;
  const isArena = displayedMode === 'half';
  const isPlayfulTheme = displayedMode === 'half' || displayedMode === 'party';
  const isParty = activeSettings.mode === 'party';
  const isTeams = isPartyTeams(activeSettings);
  const setupTeams = isPartyTeams(settings);
  const colors = room?.colors || getPlayerColors(activeSettings);
  const activeColors = room?.activeColors || colors;
  const setupColors = getPlayerColors(settings);
  const setupNames = { w: name, b: blackName, red: name, ...partyNames };
  const confirmationNames = room && isParty ? Object.fromEntries(colors.map(color => [color, room.players[color]?.name])) : setupNames;
  const effectiveSeat = seat === 'random' || setupColors.includes(seat) ? seat : setupColors[0];
  const partyGeometry = isParty ? getPartyGeometry(colors.length) : null;
  const preview = useMemo(() => { try { return createGame(settings, { allowIncompleteArena: true }); } catch { return createGame(DEFAULT_SETTINGS); } }, [settings]);
  const board = room?.board || preview.board();
  const boardColumns = isParty ? 14 : board[0]?.length || 8;
  const boardRows = isParty ? 14 * partyGeometry.height / partyGeometry.width : board.length;
  const history = room?.history || [];
  const legalMoves = room?.legalMoves || [];
  const isLocal = playType === 'local';
  const myColor = isLocal ? room?.turn || colors[0] : remote.player?.color;
  const orientedBlack = !isParty && !isLocal && ((remote.player?.color === 'b') !== flipped);
  const topColor = orientedBlack ? 'w' : 'b';
  const bottomColor = other(topColor);
  const faceToFace = isLocal && !isParty;
  const { characters, moments, finish: finishAnimation, finishBoard } = usePieceAnimations({
    settings: activeSettings, board, history, eliminations: room?.eliminations, context: `${playType}:${room?.code || 'preview'}`,
    ready: Boolean(room && room.status !== 'waiting' && (isLocal || (remote.connected && remote.synced))),
    boardEnabled: boardAnimationEnabled, playersEnabled: playerAnimation, orientation: `${orientedBlack}:${isParty && !isLocal ? myColor || effectiveSeat : ''}:${pieceStyle}`,
  });
  const boardMoments = boardAnimationEnabled ? moments.filter(event => event.hasBoard && !event.boardDone) : [];
  const showEvent = moments.findLast(event => event.hasShow && !event.showSuperseded && !event.showDone) || null;
  const moving = new Set(boardMoments.flatMap(event => event.motions.filter(motion => characters[motion.to]?.id === motion.arriving.id).map(motion => motion.to)));
  const seatHasShow = color => playerAnimation && (isLocal || color === (myColor || (isParty ? effectiveSeat : bottomColor)));
  const canPlay = room?.status === 'playing' && !room.undoRequest && (isLocal || (remote.connected && remote.synced && myColor === room.turn)) && !remote.busy;
  const hintTargets = getMoveHints(legalMoves, selected, { enabled: hints, canPlay }).destinations.size;
  const hintText = !hints ? 'Hints are off. Select a piece and choose its destination.'
    : !room ? 'Start a game to see movable pieces and legal destinations.'
      : room.status === 'waiting' ? isParty ? 'Hints appear when everyone joins and the game starts.' : 'Hints appear after both players agree and the game starts.'
        : room.status === 'finished' ? 'This game is over. Start another game to use move hints.'
          : room.undoRequest ? 'Hints resume when the takeback request is resolved.'
            : !isLocal && (!remote.connected || !remote.synced) ? 'Hints resume when your connection is restored.'
              : !canPlay ? 'Hints appear when it is your turn to move.'
                : selected ? hintTargets ? `${selected}: ${hintTargets} legal destination${hintTargets === 1 ? '' : 's'}. Dot = move; ring = capture.` : `${selected} has no legal moves. Choose another piece.`
                  : `${colorName[room.turn]}: select a marked piece to see its legal moves.`;
  const execute = (event, payload = {}) => (isLocal ? local : remote).request(event, { code: room?.code, expectedVersion: room?.version, expectedPly: history.length, ...payload });

  useEffect(() => { setSelected(null); setPromotion(null); }, [room?.version, history.length, room?.code]);
  useEffect(dismissQueen, [dismissQueen, activeSettings.mode, activeSettings.halfShape, colors.length, modal, room?.code, playType, orientedBlack, effectiveSeat]);
  useLayoutEffect(() => {
    const surfaces = [document.documentElement, document.body];
    surfaces.forEach(surface => surface.classList.toggle('arena-theme', isPlayfulTheme));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isPlayfulTheme ? '#252a3a' : '#f4efe4');
    return () => surfaces.forEach(surface => surface.classList.remove('arena-theme'));
  }, [isPlayfulTheme]);
  useLayoutEffect(() => {
    const column = boardArea.current;
    const frame = column?.querySelector('.board-frame');
    if (!column || !frame) return;
    const desktop = window.matchMedia('(min-width: 761px)');
    let scheduled = 0;
    let disposed = false;
    const clearFit = () => {
      column.removeAttribute('data-board-sticky');
      column.style.removeProperty('--board-fit-width');
      column.style.removeProperty('--board-sticky-top');
    };
    const measure = () => {
      scheduled = 0;
      if (disposed) return;
      if (!desktop.matches || document.fullscreenElement) { clearFit(); return; }
      // Apply the compact desktop spacing before measuring the surrounding content.
      column.setAttribute('data-board-sticky', 'true');
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      // Subtract the actual non-board content, including wrapped labels and margins.
      const chromeHeight = column.getBoundingClientRect().height - frame.getBoundingClientRect().height;
      const surround = frame.closest('.party-table');
      const surface = frame.closest('.board-surface');
      const surfaceStyle = window.getComputedStyle(surface);
      const surfaceWidth = surface.clientWidth - parseFloat(surfaceStyle.paddingLeft) - parseFloat(surfaceStyle.paddingRight);
      const surroundStyle = surround ? window.getComputedStyle(surround) : null;
      const surroundPadding = surroundStyle ? parseFloat(surroundStyle.paddingLeft) + parseFloat(surroundStyle.paddingRight) : 0;
      const naturalWidth = Math.max(0, surfaceWidth - surroundPadding) * Math.min(1, boardColumns / boardRows);
      const fit = fitDesktopBoard({ viewportHeight, chromeHeight, naturalWidth, columns: boardColumns, rows: boardRows, minimumSquare: isParty ? 32 : 48 });
      if (!fit) return;
      for (const [property, value] of [['--board-fit-width', fit.width], ['--board-sticky-top', fit.top]]) {
        const pixels = `${value}px`;
        if (column.style.getPropertyValue(property) !== pixels) column.style.setProperty(property, pixels);
      }
    };
    const schedule = () => {
      if (!disposed && !scheduled) scheduled = window.requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(column);
    observer?.observe(frame);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    document.addEventListener('fullscreenchange', schedule);
    desktop.addEventListener('change', schedule);
    document.fonts?.ready.then(schedule);
    measure();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(scheduled);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      document.removeEventListener('fullscreenchange', schedule);
      desktop.removeEventListener('change', schedule);
      clearFit();
    };
  }, [isPlayfulTheme, isParty, boardColumns, boardRows]);
  useEffect(() => { if (remote.room && !remote.room.settings) return; if (remote.room?.status === 'waiting' && !rulesEditing) setSettings(remote.room.settings); }, [remote.room?.version, remote.room?.code, rulesEditing]);
  useEffect(() => { writeStorage('between:playType', playType); }, [playType]);
  useEffect(() => { writeStorage('between:board-animation', boardAnimation ? 'on' : 'off'); }, [boardAnimation]);
  useEffect(() => { writeStorage('between:player-animation', playerAnimation ? 'on' : 'off'); }, [playerAnimation]);
  useEffect(() => { writeStorage('between:piece-style', pieceStyle); }, [pieceStyle]);
  useEffect(() => { if (room?.status === 'playing') boardArea.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [room?.status, room?.code]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const playTone = () => {
    if (!sound) return;
    try { const Audio = window.AudioContext || window.webkitAudioContext; audio.current ||= new Audio(); const ctx = audio.current; ctx.resume(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); oscillator.connect(gain); gain.connect(ctx.destination); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(520, ctx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.09); gain.gain.setValueAtTime(0.045, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12); oscillator.start(); oscillator.stop(ctx.currentTime + 0.13); } catch { /* Sound is optional. */ }
  };
  const move = async (from, to, promote) => { const response = await execute('game:move', { from, to, ...(promote ? { promotion: promote } : {}) }); if (response) { setSelected(null); setPromotion(null); playTone(); } };
  const onSquare = (square, piece, target) => {
    const queenSurprise = piece?.type === 'q' && (!canPlay || piece.color !== myColor || !legalMoves.some(move => move.from === square));
    if (queenSurprise && target) setQueenMoment({ id: ++queenSequence.current, target });
    // Cosmetic queen feedback must never intercept a legal capture or permit a move.
    if (!canPlay) { if (!room && !queenSurprise) notify('Choose a game, then create a room or start on this device.'); return; }
    if (selected === square) { setSelected(null); return; }
    const options = legalMoves.filter(m => m.from === selected && m.to === square);
    if (options.length) { if (options.some(m => m.promotion)) setPromotion({ from: selected, to: square }); else move(selected, square); }
    else if (piece?.color === room.turn) setSelected(square);
    else setSelected(null);
  };
  const create = async () => {
    try {
      normalizeSettings(settings);
      const game = createGame(settings);
      if (getGameOutcome(game, settings)) throw new Error('This position is already over. Adjust the board before starting.');
      writeStorage('between:name', name.trim());
      if (isLocal) { setModal('local-confirm'); return; }
      if (!name.trim()) { document.getElementById('player-name')?.focus(); notify('Add a nickname so everyone knows it’s you.'); return; }
      const response = await remote.request('room:create', { name, color: effectiveSeat, timeControl: settings.timeControl, settings });
      if (response) { setRulesEditing(false); setFlipped(false); notify('Your room is ready. Share the link with your friends.', true); }
    } catch (error) { notify(error.message); }
  };
  const join = async (e) => { e.preventDefault(); if (!name.trim()) { notify('Please enter a nickname.'); return; } const response = await remote.request('room:join', { code: joinCode.trim().toUpperCase(), name }); if (response) { setPlayType('online'); setModal(null); setFlipped(false); setRulesEditing(false); writeStorage('between:name', name.trim()); } };
  const copy = async (value) => { try { await navigator.clipboard.writeText(value); notify('Copied. Share it with your crew.', true); } catch { setModal('share'); } };
  const shareUrl = room && !isLocal ? `${window.location.origin}${window.location.pathname}?room=${room.code}` : '';
  const leave = async () => { await (isLocal ? local : remote).leave(); setModal(null); setRulesEditing(false); setSelected(null); };
  const rematch = () => {
    if (!isLocal) return execute('game:rematch');
    const names = Object.fromEntries(colors.map(color => [color, room.players[color].name]));
    if (!isParty) return local.start(room.settings, names);
    setSettings(room.settings);
    setModal('local-confirm');
  };
  const confirmLocalStart = () => {
    if (!isLocal || (room && room.status !== 'finished')) {
      notify('Finish or leave the current game before starting another.');
      return;
    }
    // The local session validates the final settings and position again.
    if (local.start(settings, confirmationNames)) setModal(null);
  };
  const statusText = room?.status === 'finished' ? room.result?.winner ? room.result.winningTeam ? `${partyTeamLabel(room.result.winningTeam)} win` : `${colorName[room.result.winner]} wins` : 'A friendly draw' : room?.status === 'waiting' ? isParty ? 'Waiting for everyone to join' : 'Waiting for both players to agree' : room?.inCheck ? `${colorName[room.turn]} is in check` : room ? `${colorName[room.turn]} to move` : 'Choose a game. Gather your crew.';
  const resultDescription = isTeams && room?.result?.defeated
    ? `${colorName[room.result.defeated]} ${room.result.reason === 'checkmate' ? 'was checkmated' : room.result.reason === 'resignation' ? 'resigned' : room.result.reason === 'timeout' ? 'ran out of time' : room.result.reason}. Team victory.`
    : reasons[room?.result?.reason] || room?.result?.reason;
  const requestColor = room?.undoRequest?.color;
  const responder = isParty ? null : room?.undoRequest ? other(requestColor) : room?.drawOffer ? other(room.drawOffer) : null;
  const mayRespond = responder && (isLocal || myColor === responder);
  const budget = room?.settings?.undoLimit === null ? Infinity : (room?.settings?.undoLimit || 0) - (room?.undoUsed?.[actor] || 0);
  const undoMaximum = Math.min(history.length - (room?.undoBoundary || 0), budget);
  const canAct = isLocal || activeColors.includes(myColor);

  return <div className={`app-shell ${room ? 'has-game' : ''}`}>
    <header className="site-header"><a className="brand" aria-label="Queenie’s — Chess for your crew" href={window.location.pathname} onClick={(e) => { e.preventDefault(); if (room) setModal('leave'); }}><Brand /></a>
      <nav aria-label="Main navigation"><button className="nav-active" onClick={() => (room ? boardArea : setupArea).current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Play</button><button onClick={() => setModal('guide')}>Rules <ArrowUpRight size={13} /></button><button onClick={() => setModal('about')}>About</button></nav>
      <div className="header-note"><span className="tiny-dot" />Good company. Friendly rivalry.</div>
    </header>

    <main><section className="hero hero-with-wordmark"><div className="hero-copy"><h1>{isTeams ? '2v2 Teams' : isParty ? `${colors.length}-player chess` : modeNames[activeSettings.mode]}</h1><p><span className="tiny-dot" />{isLocal ? 'Same device' : 'Play online'}{isTeams ? ' · 4 players · Two teams' : !isParty && ' · 2 players'}{isArena && ` · ${halfShapeName(activeSettings.halfShape)}`}</p></div><HeroWordmark /><div className="hero-stamp" aria-hidden="true"><div className="stamp-orbit" />{cartoons ? <CartoonPiece type="q" color="w" className="stamp-knight" /> : <ChessPiece type="q" color="w" className="stamp-knight" />}<span className="stamp-star">✦</span></div></section>

      <section className="play-layout" aria-label="Play area">
        <div className="board-column" ref={boardArea}>
          {queenMoment && <QueenDelight key={queenMoment.id} target={queenMoment.target} boardRef={boardArea} onDismiss={dismissQueen} />}
          <div className={`board-surface ${isParty ? 'party-surface' : ''}`}>
            <PartyTable geometry={partyGeometry} local={isLocal} showsEnabled={playerAnimation}>
            {isParty ? <PartySeats teams={isTeams} colors={colors} players={room?.players} clocks={room?.clocks} turn={room?.turn} playing={room?.status === 'playing'} local={isLocal} activeColors={activeColors} clockText={clockText} showsEnabled={playerAnimation} showEvent={showEvent} viewColor={myColor || effectiveSeat} onShowDone={finishAnimation} cartoons={cartoons} /> : <PlayerSeat color={topColor} name={room?.players[topColor]?.name} connected={room?.players[topColor]?.connected} active={room?.status === 'playing' && room.turn === topColor} clock={room?.clocks[topColor]} top faceToFace={faceToFace} local={isLocal} captured={history.filter(m => m.color === topColor && m.captured).map(m => m.captured)} showEnabled={seatHasShow(topColor)} showEvent={showEvent} onShowDone={finishAnimation} cartoons={cartoons} />}
            <div ref={boardFrame} className={`board-frame ${boardColumns < boardRows ? 'portrait-board-frame' : ''}`} style={{ '--board-columns': boardColumns, '--board-rows': boardRows }}>
              {isParty ? <PartyBoard board={board} geometry={partyGeometry} selected={selected} legalMoves={legalMoves} lastMove={room?.lastMove} inCheck={room?.inCheck} turn={room?.turn} local={isLocal} viewColor={myColor || effectiveSeat} hints={hints} onSquare={onSquare} enabled={canPlay} characters={characters} cartoons={cartoons} moving={moving} /> : <Board board={board} mode={activeSettings.mode} selected={selected} legalMoves={legalMoves} lastMove={room?.lastMove} inCheck={room?.inCheck} turn={room?.turn} flipped={orientedBlack} faceToFace={faceToFace} hints={hints} onSquare={onSquare} enabled={canPlay} characters={characters} cartoons={cartoons} moving={moving} />}
              {boardMoments.map(event => <MoveEffects key={event.animationId} event={event} frameRef={boardFrame} local={isLocal} geometry={partyGeometry} viewColor={myColor || effectiveSeat} flipped={orientedBlack} onDone={() => finishBoard(event.animationId)} />)}
            </div>
            {!isParty && <PlayerSeat color={bottomColor} name={room?.players[bottomColor]?.name} connected={room?.players[bottomColor]?.connected} active={room?.status === 'playing' && room.turn === bottomColor} clock={room?.clocks[bottomColor]} faceToFace={faceToFace} local={isLocal} captured={history.filter(m => m.color === bottomColor && m.captured).map(m => m.captured)} showEnabled={seatHasShow(bottomColor)} showEvent={showEvent} onShowDone={finishAnimation} cartoons={cartoons} />}
            </PartyTable>
          </div>
          <div className="board-toolbar"><div className="board-status" aria-live="polite"><span className={`tiny-dot ${room?.inCheck ? 'warning-dot' : ''}`} />{statusText}</div><div className="board-tools"><button className={`hints-toggle ${hints ? 'is-on' : ''}`} title={hints ? 'Turn move hints off' : 'Turn move hints on'} aria-label={`Move hints ${hints ? 'on' : 'off'}`} aria-pressed={hints} onClick={() => setHints(!hints)}><Sparkles size={16} /><span>Hints <strong>{hints ? 'On' : 'Off'}</strong></span></button><button className="icon-button" title="Toggle move sounds" aria-label="Toggle move sounds" aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><button className="icon-button" title={isParty ? 'The board faces your seat' : isLocal ? 'Same-device play keeps the board fixed' : 'Flip board'} aria-label="Flip board" disabled={isLocal || isParty} onClick={() => setFlipped(!flipped)}><RotateCw size={17} /></button><button className="icon-button fullscreen-button" title="Focus on the board" aria-label="Full-screen board" onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.(); else boardArea.current?.requestFullscreen?.().catch(() => notify('Full screen is unavailable in this browser. You can keep playing here.')); }}><Maximize2 size={17} /></button></div></div>
          <AnimationControls pieceStyle={pieceStyle} board={boardAnimation} players={playerAnimation} onPieceStyleChange={style => setAnimationPreferences(current => choosePieceStyle(current, style))} onChannelChange={(channel, enabled) => setAnimationPreferences(current => setAnimationChannel(current, channel, enabled))} />
          <p className="move-hints-explanation" role="status" aria-live="polite"><span className={`hint-legend-dot ${hints ? '' : 'hints-disabled'}`} aria-hidden="true" />{hintText}</p>
          <div className="board-footnote"><ShieldCheck size={14} /><span>{isLocal ? 'Each side faces its player. No need to turn the phone.' : 'No sign-up · Invite with a code · Games saved automatically'}</span><span className="board-edition">EST. 2026</span></div>
        </div>

        <aside className="game-panel" ref={setupArea}>
          {!room ? <>
            <div className="play-type-tabs" role="group" aria-label="How to play together"><button aria-pressed={playType === 'online'} className={playType === 'online' ? 'active' : ''} onClick={() => setPlayType('online')}><Globe2 size={17} />Play online</button><button aria-pressed={playType === 'local'} className={playType === 'local' ? 'active' : ''} onClick={() => setPlayType('local')}><Users size={18} />Same device</button></div>
            <div className="setup-panel-content"><div className="panel-intro"><span className="eyebrow">{isLocal ? 'SHARE ONE DEVICE' : 'PLAY FROM ANYWHERE'}</span><h2>{isLocal ? 'Gather around.' : 'Your table starts here.'}</h2><p>{isLocal ? 'Choose a game, add your names, and share the screen.' : 'Choose a game, create a room, and share the invite link.'}</p></div>
              <SetupPanel settings={settings} onChange={changeSetup} compact playerFields={
                isLocal ? <div className={`name-row ${settings.mode === 'party' ? 'party-name-fields' : ''}`}>
                  {setupColors.map((color, index) => <label key={color} className={`field-label party-color-${color}`} htmlFor={index === 0 ? 'player-name' : `player-name-${color}`}><span>{settings.mode === 'party' && <i className="party-name-dot" />}{colorName[color]}’s name</span>{setupTeams && <small className="party-name-team" id={`player-ally-${color}`}>Ally: {colorName[teammateFor(color)]}</small>}<input id={index === 0 ? 'player-name' : `player-name-${color}`} aria-label={`${colorName[color]}’s name`} aria-describedby={setupTeams ? `player-ally-${color}` : undefined} value={setupNames[color] || ''} maxLength={28} placeholder="Optional" onChange={event => color === 'w' || color === 'red' ? setName(event.target.value) : color === 'b' ? setBlackName(event.target.value) : setPartyNames(previous => ({ ...previous, [color]: event.target.value }))} /></label>)}
                </div> : <div className="name-row"><label className="field-label" htmlFor="player-name">Your nickname<input id="player-name" value={name} maxLength={28} onChange={event => setName(event.target.value)} placeholder="Your name at the table" autoComplete="nickname" /></label><label className="field-label side-select">Play as<select value={effectiveSeat} onChange={event => setSeat(event.target.value)}>{setupColors.map((color, index) => <option key={color} value={color}>{colorName[color]}{setupTeams ? ` · Ally: ${colorName[teammateFor(color)]}` : index === 0 ? ' · first' : ''}</option>)}<option value="random">Random</option></select></label></div>
              } />
              <button className="primary-button create-button" onClick={create} disabled={remote.busy || (!isLocal && !remote.connected)}>{isLocal ? 'Review & start' : remote.busy ? 'Creating…' : 'Create a room'}<ArrowUpRight size={20} /></button>
              {!isLocal && <button className="join-button" onClick={() => setModal('join')}>Have a room code?<span>Join a room <ArrowRight size={15} /></span></button>}
              {!isLocal && !remote.connected && <div className="connection-notice"><WifiOff size={14} />Connecting to the game server…<button onClick={remote.reconnect}>Retry</button></div>}
              <div className="panel-assurance"><Link2 size={13} />Your friends. Your table. No account needed.</div>
            </div>
          </> : <div className="active-panel-content">
            <div className="active-panel-heading"><div><span className="eyebrow">{isLocal ? 'AROUND ONE SCREEN' : `A TABLE FOR ${colors.length}`}</span><h2>{room.status === 'waiting' ? 'Gather your crew.' : room.status === 'finished' ? 'A game well played.' : 'The game is on.'}</h2></div><button className="secondary-button leave-game-button" aria-label="Leave game" title="Leave game" onClick={() => setModal('leave')}><LogOut size={16} /><span>Leave</span></button></div>
            {!isLocal && <div className="room-invite"><div><span>Your private room</span><strong>{room.code}</strong></div><button className="small-button" onClick={() => copy(shareUrl)}><Copy size={14} />Invite friends</button></div>}
            {!isLocal && (!remote.connected || !remote.synced) && <div className="notice warning"><WifiOff size={16} />Connection lost. Restoring your game.<button onClick={remote.reconnect}>Reconnect</button></div>}
            {isTeams && <div className="party-team-summary" aria-label="Teams">{['red-yellow', 'blue-green'].map(team => <div key={team}><strong>{partyTeamLabel(team)}</strong><span>{partyTeamColors(team).map(color => room.players[color]?.name || `${colorName[color]}’s seat`).join(' + ')}</span></div>)}</div>}
            {room.status === 'waiting' ? <>
              <div className="waiting-seats">{colors.map(c => <div key={c} className={(isParty ? room.players[c]?.connected : room.ready?.[c]) ? 'seat-ready' : ''}><ChessPiece type="k" color={c} /><span>{room.players[c]?.name || `Waiting for ${colorName[c]}`}<small>{colorName[c]}{isTeams && ` · Ally: ${colorName[teammateFor(c)]}`} · {isParty ? room.players[c] ? room.players[c].connected ? 'Joined' : 'Reconnecting' : 'Send them the invite link' : room.ready?.[c] ? 'Rules accepted' : room.players[c] ? 'Getting ready' : 'Send them the invite link'}</small></span>{(isParty ? room.players[c]?.connected : room.ready?.[c]) ? <CheckCheck size={17} /> : <span className="waiting-indicator" />}</div>)}</div>
              <div className="rules-summary"><div><Settings2 size={15} /><strong>Your shared rules</strong><button onClick={() => { setSettings(room.settings); setRulesEditing(!rulesEditing); }}>{rulesEditing ? 'Hide' : 'Edit'}</button></div><GameRules settings={room.settings} /></div>
              {rulesEditing && <div className="room-rules-editor"><SetupPanel settings={settings} onChange={setSettings} compact roomSettings={room.settings} occupiedColors={colors.filter(color => room.players[color])} /><button className="secondary-button full-width" disabled={remote.busy} onClick={async () => { const r = await execute('room:settings', { settings }); if (r) { setRulesEditing(false); notify(isParty ? 'Rules updated. Play starts when everyone is connected.' : 'Rules updated. Both players need to agree again.', true); } }}>Save rules</button></div>}
              <p className="muted-text ready-explanation">{isParty ? 'The game starts automatically when every seat is filled and connected. No extra confirmation needed.' : 'The game starts when both players agree. Changing the rules resets both confirmations.'}</p>{!isParty && <button className="primary-button full-width" disabled={!remote.connected || !remote.synced || remote.busy || room.ready?.[myColor] || rulesEditing} onClick={() => { try { createGame(room.settings); execute('game:ready'); } catch (error) { notify(error.message); } }}><Check size={18} />{room.ready?.[myColor] ? 'Ready. Waiting for your friend' : 'I agree. Let’s play'}</button>}
              <p className="waiting-bottom">{colors.every(color => room.players[color]) ? isParty ? 'All seats are taken. Waiting for everyone to be connected.' : 'Everyone is here. Confirm the rules to begin.' : 'Your friends can join with the invite link or room code.'}</p>
            </> : <>
              <div className={`turn-banner ${room.status === 'finished' ? 'result-banner' : ''}`}><ChessPiece type={room.status === 'finished' ? 'q' : 'p'} color={room.result?.winner || room.turn} /><div><strong>{statusText}</strong><span>{room.status === 'finished' ? resultDescription : isLocal ? 'Select a piece, then its destination' : myColor === room.turn ? 'Your turn. Choose your move.' : 'Waiting for the next move.'}</span></div></div>
              {isParty && <PartyRequests room={room} isLocal={isLocal} myColor={myColor} execute={execute} />}
              {!isParty && room.undoRequest && <div className={`notice takeback-notice ${isLocal && responder === 'b' ? 'inverted-notice' : ''}`}><RotateCcw size={18} /><div><strong>{colorName[requestColor]} requests a {room.undoRequest.plies}-move takeback</strong><p>{mayRespond ? `${colorName[responder]}, do you agree?` : 'Waiting for your friend’s approval.'}</p>{mayRespond && <div className="response-buttons"><button onClick={() => execute('game:respond-undo', { accept: false, color: responder })}>Decline</button><button onClick={() => execute('game:respond-undo', { accept: true, color: responder })}>Allow takeback</button></div>}</div></div>}
              {!isParty && room.drawOffer && <div className={`notice ${isLocal && responder === 'b' ? 'inverted-notice' : ''}`}><Handshake size={18} /><div><strong>{colorName[room.drawOffer]} offers a draw</strong>{mayRespond ? <div className="response-buttons"><button onClick={() => execute('game:respond-draw', { accept: false, color: responder })}>Keep playing</button><button onClick={() => execute('game:respond-draw', { accept: true, color: responder })}>Accept draw</button></div> : <p>Waiting for your friend’s response.</p>}</div></div>}
              {isParty && !isTeams && room.eliminations?.length > 0 && <p className="party-eliminations" role="status">{room.eliminations.map(item => `${colorName[item.color]} eliminated: ${item.reason}`).join(' · ')}</p>}
              <div className="move-list-heading"><h3>Move history</h3><span>{history.length} move{history.length === 1 ? '' : 's'}</span></div>
              {isParty ? <div className="move-table party-history" aria-label="Move history">{history.length ? history.map((move, index) => <div className={`party-move-row ${index === history.length - 1 ? 'latest-move' : ''}`} key={index}><span>{index + 1}.</span><ChessPiece type={move.piece} color={move.color} /><strong>{colorName[move.color]}</strong><span>{move.san || `${move.from} → ${move.to}`}</span></div>) : <div className="empty-history"><MoveUpRight size={27} /><p>Every story starts with a move.</p></div>}</div> : <div className="move-table" aria-label="Move history"><div className="move-table-head"><span>#</span><span>White</span><span>Black</span></div>{history.length ? Array.from({ length: Math.ceil((history.length + (history[0].color === 'b' ? 1 : 0)) / 2) }, (_, i) => { const offset = history[0].color === 'b' ? 1 : 0; const w = history[i * 2 - offset]; const b = history[i * 2 + 1 - offset]; return <div className="move-row" key={i}><span>{i + 1}.</span>{[w, b].map((m, j) => <span key={j} className={m === history.at(-1) ? 'latest-move' : ''}>{m ? <><ChessPiece type={m.piece} color={m.color} />{m.san}</> : '—'}</span>)}</div>; }) : <div className="empty-history"><MoveUpRight size={27} /><p>Every story starts with a move.</p></div>}</div>}
              <div className="game-rule-chips"><span>{isTeams ? '2v2 Teams' : modeNames[activeSettings.mode]}{isParty && ` · ${colors.length} players`}{activeSettings.mode === 'half' ? ` · ${halfShapeName(activeSettings.halfShape)}` : ''}</span>{activeSettings.mode === 'half' && <span>{arenaWinName(activeSettings.halfWin)}</span>}<span>{timeNames[room.timeControl]}</span><span>{activeSettings.undoMode === 'off' ? 'No takebacks' : `${activeSettings.undoMode === 'free' ? 'Free' : 'Approved'} takebacks · ${activeSettings.undoLimit ?? '∞'}`}</span></div>
              {room.status === 'playing' ? <><div className="game-actions"><button disabled={!canAct || activeSettings.undoMode === 'off' || !history.length || !!room.undoRequest} onClick={() => { setActor(myColor); setUndoPlies(1); setModal('undo'); }}><RotateCcw size={17} />Takeback</button><button disabled={!canAct || !!room.drawOffer || !!room.undoRequest} onClick={() => { setActor(myColor); setModal('draw'); }}><Handshake size={17} />Draw</button><button disabled={!canAct} onClick={() => { setActor(myColor); setModal('resign'); }}><Flag size={16} />Resign</button></div>{activeSettings.undoMode !== 'off' && <p className="undo-budgets">Takebacks used: {colors.map(color => `${colorName[color]} ${room.undoUsed?.[color] || 0} / ${activeSettings.undoLimit ?? '∞'}`).join(' · ')}</p>}</> : <><button className="primary-button full-width" disabled={!isLocal && room.rematchVotes?.includes(myColor)} onClick={rematch}><RotateCw size={17} />{!isLocal && room.rematchVotes?.includes(myColor) ? 'Waiting for a rematch' : 'Play again with this crew'}</button><button className="text-button full-width" onClick={leave}>Choose a new game</button></>}
            </>}
          </div>}
        </aside>
      </section>

      <section className="feature-strip" aria-label="Made for your crew"><button onClick={() => setModal('guide')}><span className="feature-number">01</span><div><h3>Agree before you play.</h3><p>Takebacks off, free, or by approval. Decide together.</p></div><RotateCcw size={24} /></button><button onClick={() => { if (!room) changeSetup({ ...settings, mode: 'endgame' }); else setModal('guide'); }}><span className="feature-number">02</span><div><h3>Start with a challenge.</h3><p>Explore famous endgames or arrange your own position.</p></div><BookOpen size={24} /></button><button onClick={() => { if (!room) setPlayType('local'); else setModal('guide'); }}><span className="feature-number">03</span><div><h3>Room for everyone.</h3><p>Two, three, or four friends. One shared screen.</p></div><Users size={25} /></button></section>
      <footer className="site-footer"><span className="footer-brand">Queenie’s<span> / CHESS FOR YOUR CREW</span></span><span>Different boards. Same good company.</span><button onClick={() => setModal('guide')}>Explore the rules <ArrowUpRight size={13} /></button></footer>
    </main>

    {toast && <div className={`toast ${toast.success ? 'success-toast' : ''}`} role="status">{toast.success ? <Check size={18} /> : <HelpCircle size={18} />}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={16} /></button></div>}
    {promotion && <Modal title="Your pawn gets a promotion." eyebrow="MAKE YOUR CHOICE" onClose={() => setPromotion(null)}><p className="muted-text">Choose the piece your pawn becomes.</p><div className="promotion-options">{['q', 'r', 'b', 'n'].map(type => <button key={type} onClick={() => move(promotion.from, promotion.to, type)}><ChessPiece type={type} color={room.turn} /><span>{pieceNames[type]}</span></button>)}</div></Modal>}
    {modal === 'join' && <Modal title="Join your crew." eyebrow="TAKE YOUR SEAT" onClose={() => setModal(null)}><p className="muted-text">Enter the 8-character room code shared with you.</p><form onSubmit={join}><label className="field-label">Your nickname<input value={name} onChange={e => setName(e.target.value)} maxLength={28} required placeholder="A name your friends will recognize" autoComplete="nickname" /></label><label className="field-label">Room code<input className="room-code-input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/\s/g, ''))} maxLength={8} minLength={8} required placeholder="ABCDEFGH" autoCapitalize="characters" autoCorrect="off" /></label><button className="primary-button full-width" disabled={remote.busy || !remote.connected}>Join the game<ArrowRight size={18} /></button>{!remote.connected && <p className="muted-text">Connecting… Make sure the game server is running.</p>}</form></Modal>}
    {modal === 'local-confirm' && <Modal title="Good games start with agreement." onClose={() => setModal(null)} className={isParty ? 'party-agreement-dialog' : 'face-dialog agreement-dialog'} hideHeading={!isParty} hideCloseButton={!isParty}>
      {isParty ? <div className="local-confirm-scroll" tabIndex={0} aria-label="Shared rules and players"><p className="muted-text">Read the rules together. One confirmation starts the game for everyone.</p><GameRules settings={settings} /><ul className="local-confirm-crew" aria-label="Players at this table">{setupColors.map(color => <li key={color} className={`party-color-${color}`}><ChessPiece type="k" color={color} /><span><strong>{confirmationNames[color]?.trim() || `${colorName[color]} player`}</strong><small>{colorName[color]}{setupTeams && ` · Ally: ${colorName[teammateFor(color)]}`}</small></span></li>)}</ul></div> : <div className="facing-rules-panels">{['b', 'w'].map(color => <FacingRulesPanel key={color} color={color} title="Good games start with agreement." onClose={() => setModal(null)}><GameRules settings={settings} /></FacingRulesPanel>)}</div>}
      <button className="primary-button full-width shared-start-button" onClick={confirmLocalStart}>Agree &amp; start game<ArrowRight size={18} /></button>
    </Modal>}
    {['undo', 'draw', 'resign'].includes(modal) && room && <Modal title={modal === 'undo' ? 'Take a move back.' : modal === 'draw' ? 'Offer a draw?' : 'Ready to resign?'} onClose={() => setModal(null)}>
      {isLocal && <label className="field-label">Which player is asking?<select value={actor} onChange={e => { setActor(e.target.value); setUndoPlies(1); }}>{activeColors.map(color => <option key={color} value={color}>{colorName[color]} · {room.players[color]?.name}</option>)}</select></label>}
      {modal === 'undo' ? <><p className="muted-text">One ply means one player’s move. {isParty ? 'A full round costs one ply per active player. Takebacks cannot cross a resignation or timeout.' : 'Undoing a full round costs 2 plies.'} {activeSettings.undoMode === 'approval' ? isTeams ? 'All three other players must approve, including your teammate.' : isParty ? 'Every other seated player must approve, including eliminated players.' : 'Your opponent must approve the takeback.' : 'Free takebacks are enabled. No approval is needed.'}</p><label className="field-label">Moves to undo (up to {undoMaximum} now)<input type="number" min="1" max={undoMaximum} value={undoPlies} onChange={e => setUndoPlies(Number(e.target.value))} /></label><button className="primary-button full-width" disabled={!Number.isSafeInteger(undoPlies) || undoPlies < 1 || undoPlies > undoMaximum} onClick={async () => { if (await execute('game:undo', { plies: undoPlies, color: actor })) setModal(null); }}>{activeSettings.undoMode === 'free' ? 'Undo selected moves' : 'Request a takeback'}<RotateCcw size={17} /></button></> : <><p className="muted-text">{modal === 'draw' ? isTeams ? 'All four players must accept, including your teammate, for the game to end in a draw.' : isParty ? 'The game ends in a draw if every active player accepts.' : 'The game ends in a draw if your opponent accepts.' : isTeams ? `${colorName[actor]} resigning ends the game for both teammates. ${partyTeamLabel(partyTeamFor(actor))} lose together; the other team wins immediately.` : isParty ? `${colorName[actor]} will be eliminated. The remaining players continue until only one is left.` : `Resigning ends the game. ${colorName[other(actor)]} wins if ${colorName[actor]} resigns.`}</p><button className={`primary-button full-width ${modal === 'resign' ? 'danger-button' : ''}`} onClick={async () => { if (await execute(modal === 'draw' ? 'game:offer-draw' : 'game:resign', { color: actor })) setModal(null); }}>{modal === 'draw' ? 'Offer a draw' : 'Confirm resignation'}</button></>}
    </Modal>}
    {modal === 'leave' && <Modal title="Stepping away from the board?" onClose={() => setModal(null)}><p className="muted-text">{isLocal ? 'Leaving clears this game from your device.' : 'Return to this tab with the room link to reclaim your seat. The clock keeps running in timed games.'}</p><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Keep playing</button><button className="primary-button" onClick={leave}>Leave game</button></div></Modal>}
    {modal === 'share' && <Modal title="Invite your crew." onClose={() => setModal(null)}><p className="muted-text">Copy the link below or share room code {room?.code}.</p><input className="share-input" value={shareUrl} readOnly onFocus={e => e.target.select()} /><p className="muted-text">For local testing, connect all devices to the same Wi-Fi and open the host computer’s local network address.</p></Modal>}
    {modal === 'guide' && <Modal title="How to play" eyebrow="GET TO KNOW YOUR GAME" onClose={() => setModal(null)} className={faceToFace ? 'guide-modal face-dialog rules-reading-dialog' : 'guide-modal'} hideHeading={faceToFace} hideCloseButton={faceToFace}>
      {faceToFace ? <div className="facing-rules-panels">{['b', 'w'].map(color => <FacingRulesPanel key={color} color={color} title="The rules at your seat." onClose={() => setModal(null)}><h3 className="current-rules-title">{room ? 'This game’s agreement' : 'Your selected rules'}</h3><GameRules settings={activeSettings} /><GuideContent /></FacingRulesPanel>)}</div> : <><h3 className="current-rules-title">{room ? 'This game’s agreement' : 'Your selected rules'}</h3><GameRules settings={activeSettings} /><GuideContent /></>}
    </Modal>}
    {modal === 'about' && <Modal title="A place for your kind of chess." eyebrow="QUEENIE’S / CHESS FOR YOUR CREW" onClose={() => setModal(null)}><div className="about-symbol"><ChessPiece type="q" color="w" /><ChessPiece type="q" color="b" /></div><p>Queenie’s brings your crew to the board. Settle into Classic, explore Endgames, bring three or four players to the table, or build a wild new battle in Chaos Kingdom.</p><p className="muted-text">Play in a private online room or share one device. Choose your rules together, take your seats, and make time for a game. No account needed—just good company.</p><button className="primary-button full-width" onClick={() => setModal(null)}>Back to the board<ArrowRight size={18} /></button></Modal>}
  </div>;
}
