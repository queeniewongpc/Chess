// The crown belongs to the Q, so the same compact wordmark works in both rooms.
export default function Brand() {
  return <span className="brand-wordmark brand-wordmark-crowned">
    <b className="brand-name"><span className="brand-initial">Q<svg className="brand-crown" viewBox="0 0 32 24" aria-hidden="true" focusable="false">
      <path d="m5 8 6 5 5-9 5 9 6-5-3 12H8Z" fill="currentColor" />
      <path d="M8 18h16v3H8z" fill="#98733f" />
      <path d="m8 12 3 3 5-8 5 8 3-3-2 5H10Z" fill="#f3d8a2" opacity=".7" />
      <circle cx="5" cy="7" r="2" fill="currentColor" /><circle cx="16" cy="3" r="2.4" fill="currentColor" /><circle cx="27" cy="7" r="2" fill="currentColor" />
    </svg></span>ueenie’s</b>
    <span className="brand-tagline">CHESS FOR YOUR CREW</span>
  </span>;
}
