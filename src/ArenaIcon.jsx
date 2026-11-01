import React from 'react';

export default function ArenaIcon({ size = 24, className = '', ...props }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" fill="none" className={`arena-insignia ${className}`} aria-hidden="true" focusable="false" {...props}>
    <ellipse cx="16" cy="17" rx="14" ry="8.5" transform="rotate(-24 16 17)" stroke="var(--gold, #BEA16A)" strokeWidth="1.6" />
    <path d="M8 10.5 12.5 13 16 7.5 19.5 13 24 10.5 22 21H10Z" fill="#e5c88f" stroke="#544837" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M11 22.5H21" stroke="var(--coral, #D96F5B)" strokeWidth="2.8" strokeLinecap="round" />
    <path d="m16 13.5 1.5 2.5-1.5 2.5-1.5-2.5Z" fill="#7a6041" />
    <path d="m26 3 .9 2.1L29 6l-2.1.9L26 9l-.9-2.1L23 6l2.1-.9Z" fill="var(--coral, #D96F5B)" />
    <circle cx="4" cy="23.5" r="2.2" fill="var(--jade, #5B9F8D)" stroke="#375e55" strokeWidth=".7" />
  </svg>;
}
