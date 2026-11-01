// Original vector artwork, drawn for this application.
// Separate outlines and interior details keep both colors readable at board size.

function Pedestal({ detail }) {
  return (
    <>
      <path d="M13.7 33.3h17.6l1.8 3.6H11.9l1.8-3.6Z" />
      <path d="M11.9 36.9h21.2c1.2 0 2.2 1 2.2 2.2v1.2H9.7v-1.2c0-1.2 1-2.2 2.2-2.2Z" />
      <path d="M13.3 37.6h18.4" fill="none" stroke={detail} strokeWidth=".8" />
    </>
  );
}

function Pawn({ detail }) {
  return (
    <>
      <circle cx="22.5" cy="12.1" r="5.3" />
      <path d="M18.4 17.2h8.2l1.1 3.7H17.3l1.1-3.7Z" />
      <path d="M18.8 21c.2 4.5-1.4 8.5-4.2 12.3h15.8c-2.8-3.8-4.4-7.8-4.2-12.3Z" />
      <path d="M19 21.5h7M19.3 28.6c-.4 1.3-1 2.5-1.7 3.5" fill="none" stroke={detail} strokeWidth="1" />
      <Pedestal detail={detail} />
    </>
  );
}

function Rook({ detail }) {
  return (
    <>
      <path d="M12.2 6.7h5.4v5h2.9v-5h4v5h2.9v-5h5.4v11.8l-3.7 3H15.9l-3.7-3V6.7Z" />
      <path d="m16.4 21.5-1.3 11.8h14.8l-1.3-11.8Z" />
      <path d="M15.3 17.6h14.4M17 22.5h11M17.1 29.7h10.8" fill="none" stroke={detail} strokeWidth="1.05" />
      <Pedestal detail={detail} />
    </>
  );
}

function Knight({ detail, ink }) {
  return (
    <>
      <path d="M14.1 33.3c.6-4.9 2.9-8.1 7.2-11.3l-5.4 1.4-3.9-.8-2.3-4.4 5-6.3 3.7-2.1.2-5.2 4.2 3 4-.5c5.8 4 8 9.3 7.7 16-.2 4.8-.1 7.3-2.9 10.2H14.1Z" />
      <path d="M24.9 10.6c5 4.2 6.4 9 5.8 14.9-.2 2.8-1 4.6-2.5 6.1M25 18.2c-.5 4-3.2 6.7-6.4 9.4-1.3 1.1-2 2.5-2.4 4.1M11.7 18.7l4.2 1.6 3.2-.9" fill="none" stroke={detail} strokeWidth="1.1" />
      <path d="m19 9.8 2.3 1.4" fill="none" stroke={detail} strokeWidth="1" />
      <path d="m17.9 14.5 3-1.2-1.2 2.5Z" fill={ink} stroke={ink} strokeWidth=".5" />
      <circle cx="12.9" cy="18.1" r=".65" fill={ink} stroke="none" />
      <Pedestal detail={detail} />
    </>
  );
}

function Bishop({ detail }) {
  return (
    <>
      <circle cx="22.5" cy="5.7" r="2.1" />
      <path d="M22.5 8c-3.8 2.7-7.1 6.5-7.1 10 0 3.1 3 5.3 7.1 5.3s7.1-2.2 7.1-5.3c0-3.5-3.3-7.3-7.1-10Z" />
      <path d="m24.6 11.1-5.1 7" fill="none" stroke={detail} strokeWidth="1.7" />
      <path d="M18.3 23.1h8.4l1.2 3.2H17.1l1.2-3.2Z" />
      <path d="M18.6 26.3c-.5 2.9-1.9 5.3-3.6 7h15c-1.7-1.7-3.1-4.1-3.6-7Z" />
      <path d="M18.8 26.9h7.4" fill="none" stroke={detail} strokeWidth=".9" />
      <Pedestal detail={detail} />
    </>
  );
}

function Queen({ detail }) {
  return (
    <>
      <path d="m10.6 11.5 5.2 6.9 1.4-10.1 2.9 10.1 2.4-11.3 2.4 11.3 2.9-10.1 1.4 10.1 5.2-6.9-3.3 13.3H13.9l-3.3-13.3Z" />
      <circle cx="10.3" cy="10.1" r="2" />
      <circle cx="17.1" cy="6.5" r="2" />
      <circle cx="22.5" cy="4.8" r="2" />
      <circle cx="27.9" cy="6.5" r="2" />
      <circle cx="34.7" cy="10.1" r="2" />
      <path d="M14.8 24.8h15.4l-1.8 3.1H16.6l-1.8-3.1Z" />
      <path d="M17.2 27.9c-.3 1.9-1.2 3.8-2.6 5.4h15.8c-1.4-1.6-2.3-3.5-2.6-5.4Z" />
      <path d="M15.8 22.3c4.4-.8 9-.8 13.4 0M17.6 28.4h9.8" fill="none" stroke={detail} strokeWidth="1" />
      <Pedestal detail={detail} />
    </>
  );
}

function King({ detail }) {
  return (
    <>
      <path d="M20.9 3.4h3.2v3.4h3.3v3.1h-3.3v4.3h-3.2V9.9h-3.3V6.8h3.3V3.4Z" />
      <path d="M22.5 15.4c-2.9-4.3-8.8-4.3-10.2-.2-1.1 3.2 1.6 6 4.1 9.6h12.2c2.5-3.6 5.2-6.4 4.1-9.6-1.4-4.1-7.3-4.1-10.2.2Z" />
      <path d="M16 24.8h13l-1.3 3.2H17.3L16 24.8Z" />
      <path d="M17.5 28c-.5 2.1-1.5 3.8-2.9 5.3h15.8c-1.4-1.5-2.4-3.2-2.9-5.3Z" />
      <path d="M22.5 15.6v7M15.6 16.2c-.3 1.4.9 3.3 2.1 5.1M29.4 16.2c.3 1.4-.9 3.3-2.1 5.1M18 28.5h9" fill="none" stroke={detail} strokeWidth="1" />
      <Pedestal detail={detail} />
    </>
  );
}

const pieces = { p: Pawn, n: Knight, b: Bishop, r: Rook, q: Queen, k: King };

const partyPalette = {
  red: { fill: '#d96f5b', outline: '#6e342d', detail: '#ffe0b8' },
  blue: { fill: '#6299bb', outline: '#294d69', detail: '#dbeaf4' },
  yellow: { fill: '#d5ac55', outline: '#755522', detail: '#fff0b9' },
  green: { fill: '#6da48e', outline: '#2e594a', detail: '#dfefda' },
};

export default function ChessPiece({ type, color, className = '', inactive = false, ...svgProps }) {
  const Piece = pieces[type];
  if (!Piece) return null;
  const white = color === 'w' || color === 'white';
  const palette = inactive ? { fill: '#b4b5ac', outline: '#676d64', detail: '#eff0e7' } : partyPalette[color];
  const fill = palette?.fill || (white ? 'var(--piece-white-fill, #faf6e9)' : 'var(--piece-black-fill, #263830)');
  const outline = palette?.outline || (white ? 'var(--piece-white-outline, #35453a)' : 'var(--piece-black-outline, #17271f)');
  const detail = palette?.detail || (white ? 'var(--piece-white-detail, #8d9987)' : 'var(--piece-black-detail, #c1cbb7)');

  return (
    <svg
      viewBox="0 0 45 45"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...svgProps}
    >
      <g fill={fill} stroke={outline} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <Piece detail={detail} ink={palette ? outline : white ? outline : 'var(--piece-black-ink, #edf0df)'} />
      </g>
    </svg>
  );
}
