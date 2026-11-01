import { useEffect, useId, useState } from 'react';
import './cartoon-piece.css';

// Original porcelain figurines. A physical piece keeps its face and maker's
// emblem when its chess role changes; no artwork details enter game state.
const sidePalettes = {
  w: {
    coat: 'var(--toon-white-coat, #f2e7cf)', shade: 'var(--toon-white-shade, #c4b28e)',
    light: 'var(--toon-white-highlight, #fffdf3)', ink: 'var(--toon-white-ink, #293346)',
    line: '#9a8b70', blush: '#d99b7d',
  },
  b: {
    coat: 'var(--toon-black-coat, #30394b)', shade: 'var(--toon-black-shade, #161e2b)',
    light: 'var(--toon-black-highlight, #626e80)', ink: 'var(--toon-black-ink, #f3dfb5)',
    line: '#16202f', blush: '#b88c68',
  },
  red: { coat: '#cf7566', shade: '#8e433c', light: '#f6b3a0', ink: '#542c30', line: '#914d45', blush: '#f9d2b6' },
  blue: { coat: '#6296b2', shade: '#345c78', light: '#a9d2e1', ink: '#203e55', line: '#385f77', blush: '#efc1ad' },
  yellow: { coat: '#d5ac52', shade: '#a4772c', light: '#ffe4a2', ink: '#5b4426', line: '#997236', blush: '#ca8059' },
  green: { coat: '#6c9e88', shade: '#3b6959', light: '#b1d7bd', ink: '#274e41', line: '#426e5c', blush: '#e1b899' },
};
const inactivePalette = { coat: '#a4a7a4', shade: '#777e7b', light: '#d2d4cd', ink: '#4b5553', line: '#737b75', blush: '#b7aaa0' };
const colorFamilies = ['w', 'b', 'red', 'blue', 'yellow', 'green'];

function Emblem({ index, fill, line, y = 46.5, scale = .7 }) {
  // Sixteen embossed maker's marks distinguish a whole army, even in grayscale.
  const shapes = [
    <path d="m0-4 3.5 4L0 4l-3.5-4Z" />,
    <path d="m0-4 1.3 2.6 2.9.5-2.1 2 .5 2.9L0 2.6l-2.6 1.4.5-2.9-2.1-2 2.9-.5Z" />,
    <path d="M1.8-3.7a4 4 0 1 0 1 6.7A3.9 3.9 0 0 1 1.8-3.7Z" />,
    <path d="M0 3.8C-7-.5-3.1-6 0-2.1 3.1-6 7-.5 0 3.8Z" />,
    <path d="m.5-4.5-4 5H0l-.5 4 4-5H0Z" />,
    <path d="M-1.5-4h3v2.5H4v3H1.5V4h-3V1.5H-4v-3h2.5Z" />,
    <path d="m-4 2.8 2-5 2 5Zm4 0 2-5 2 5Z" />,
    <g><circle r="3.7" /><circle r="1.1" fill={line} stroke="none" /></g>,
    <g><circle r="2.6" /><ellipse rx="5" ry="1.6" fill="none" transform="rotate(-25)" /></g>,
    <path d="M-3.5 3.5C-5-2 0-4 4-3.8 3.8.5 2 5-3.5 3.5Zm0 0L2-2" />,
    <g><circle r="2" /><path d="M0-5v1m0 8v1m-5-5h1m8 0h1m-8.5-3.5.8.8m5.4 5.4.8.8m0-7-.8.8m-5.4 5.4-.8.8" fill="none" /></g>,
    <path d="m-3.7 0 2.6 3L4-3" fill="none" strokeWidth="2.1" />,
    <path d="M-3.5 3V-.5a3.5 3.5 0 0 1 7 0V3h-2v-3a1.5 1.5 0 0 0-3 0v3Z" />,
    <path d="M1 0a1 1 0 1 1-2-1 2.5 2.5 0 1 1 3.5 3.5A4 4 0 0 1-3-3" fill="none" strokeWidth="1.7" />,
    <path d="M0 0-4-3v6Zm0 0 4-3v6Z" />,
    <path d="M-3-4h6v8L0 2.4-3 4Z" />,
  ];
  return <g className="porcelain-emblem" transform={`translate(32 ${y}) scale(${scale})`} fill={fill} stroke={line} strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round">{shapes[index % shapes.length]}</g>;
}

function Face({ index, ink, blush, y = 31, scale = 1 }) {
  const eyes = index % 4;
  const brows = Math.floor(index / 4) % 4;
  return (
    <g transform={`translate(32 ${y}) scale(${scale})`} fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {eyes === 0 && <><ellipse cx="-5.4" cy="0" rx="1.55" ry="2" fill={ink} stroke="none" /><ellipse cx="5.4" cy="0" rx="1.55" ry="2" fill={ink} stroke="none" /></>}
      {eyes === 1 && <path d="M-7.6 .5q2.2-3.1 4.4 0m6.4 0q2.2-3.1 4.4 0" />}
      {eyes === 2 && <><ellipse cx="-5.4" cy="0" rx="1.55" ry="2" fill={ink} stroke="none" /><path d="m3.3-1.1 4.2 1.2-4.2 1.4" /></>}
      {eyes === 3 && <><circle cx="-5.4" cy=".3" r="1.5" fill={ink} stroke="none" /><circle cx="5.4" cy=".3" r="1.5" fill={ink} stroke="none" /><path d="M-8-3.9q2.4-1.4 4.5-.3m7 0q2.1-1.1 4.5.3" strokeWidth="1.2" /></>}
      {brows === 1 && <path d="m-7.5-3.8 4.1.7m6.8-.7 4.1-.8" strokeWidth="1.2" />}
      {brows === 2 && <path d="M-7.6-4q2.1-2 4.2-.7m6.8 0q2.1-1.3 4.2.7" strokeWidth="1.2" />}
      {brows === 3 && <><circle cx="-5.4" cy="0" r="3.5" strokeWidth=".95" /><circle cx="5.4" cy="0" r="3.5" strokeWidth=".95" /><path d="M-1.9-.4h3.8" strokeWidth=".95" /></>}
      <ellipse cx="-8.6" cy="3.1" rx="1.8" ry="1" fill={blush} stroke="none" opacity=".55" />
      <ellipse cx="8.6" cy="3.1" rx="1.8" ry="1" fill={blush} stroke="none" opacity=".55" />
      {index % 3 === 0 ? <path d="M-2.7 4.5q2.7 3 5.4 0" strokeWidth="1.2" /> : index % 3 === 1 ? <path d="M-2.4 4.8q2.5 1.8 5.1-.6" strokeWidth="1.2" /> : <path d="M-2.5 4.2h5q-.3 3.1-2.5 3.1T-2.5 4.2Z" fill={ink} strokeWidth=".5" />}
    </g>
  );
}

function Role({ type, palette, faceIndex, glaze, roundGlaze, metal, band, line }) {
  const { ink, blush } = palette;
  const surface = { fill: glaze, stroke: line, strokeWidth: 1.05, strokeLinejoin: 'round', strokeLinecap: 'round' };
  const face = (y, scale = 1) => <Face index={faceIndex} ink={ink} blush={blush} y={y} scale={scale} />;
  if (type === 'n') return (
    <g {...surface}>
      <path d="M22.5 42C16 31 20.4 18.7 27.8 9.3L30.3 6l2.5 7.5c9.4 2.5 13.4 9.3 17.2 17.1 1.4 3.2-2.3 6.9-5.8 5.5l-7.6-4.4C33.5 36 35 39 38 42Z" fill={band} />
      <path d="M24.7 41.4c-4.2-8.6-4.5-17.6 1.2-25.8l2.7-9.9q1.5-2.4 2.7.8l1.3 8.2 4.4 2.2c4.4 3.2 7.7 8.9 11.6 14.4 2 3-.9 6.2-3.6 4.4l-9-4.3c-4.5 3.9-3.3 7.5-.6 10Z" />
      <path d="m29 10.6.3 7.1" fill="none" stroke={metal} strokeWidth="2" />
      <path d="M25.6 21c-2.4 6.4-1.7 11.7.2 15.8" fill="none" stroke={palette.light} strokeWidth="1.6" opacity=".55" />
      {faceIndex % 4 === 1 ? <path d="M32.7 23.1q2.2-2.4 3.8.5" fill="none" stroke={ink} strokeWidth="1.5" /> : <><ellipse cx="34.9" cy="23.1" rx="1.8" ry="2.1" fill={ink} stroke="none" /><circle cx="34.4" cy="22.4" r=".6" fill={palette.light} stroke="none" /></>}
      {faceIndex % 4 === 2 && <path d="m32.6 19.8 4.2 1" stroke={ink} strokeWidth="1.2" />}
      {faceIndex % 4 === 3 && <path d="M32.7 20q2.2-2.1 4.3-.1" stroke={ink} strokeWidth="1.1" fill="none" />}
      {Math.floor(faceIndex / 4) === 3 && <circle cx="34.9" cy="23.1" r="3.3" stroke={ink} strokeWidth=".9" fill="none" />}
      <circle cx="44.7" cy="31.9" r=".9" fill={ink} stroke="none" />
      <path d={faceIndex % 3 === 0 ? 'm40.8 33.1 3 1.2' : faceIndex % 3 === 1 ? 'M40.8 32.4q1 2.3 3.2 2.2' : 'm40.8 33.7 3.5.5'} fill="none" stroke={ink} strokeWidth=".9" />
      <path d="M24 40.3q8 2.5 16 .2l.3 3q-8.3 3-16.6 0Z" fill={metal} strokeWidth=".7" />
    </g>
  );
  if (type === 'p') return (
    <g {...surface}>
      <circle cx="32" cy="22.3" r="12" fill={roundGlaze} />
      {face(24.2, .88)}
      <path d="M23.1 33.1q8.9 3.5 17.8 0l.8 3.1q-9.7 4.6-19.4 0Z" fill={band} strokeWidth=".85" />
      <path d="M25.9 12.9q2.5-1.7 5.8-1.8" fill="none" stroke={palette.light} opacity=".65" strokeWidth="1.6" />
    </g>
  );
  if (type === 'b') return (
    <g {...surface}>
      <path d="M20 29.6c-4.3-9.2 3-16.3 12-24.6 9 8.3 16.3 15.4 12 24.6l-1.4 7.1c-1.7 5.8-19.5 5.8-21.2 0Z" fill={roundGlaze} />
      <path d="M32.7 7.8c1.4 4 2.4 8.4 2.4 12.5q-1.7 3.1-3.2-.2L30.8 9.7Z" fill={band} strokeWidth=".8" />
      <path d="M29.4 10.7c-3.1 3.5-5.7 7.7-6 10.1" fill="none" stroke={palette.light} strokeWidth="1.6" opacity=".6" />
      {face(31.4, .86)}
      <path d="M21.6 38.3q10.4 4 20.8 0l.5 3q-10.9 5.2-21.8 0Z" fill={band} strokeWidth=".85" />
    </g>
  );
  if (type === 'r') return (
    <g {...surface}>
      <path d="M21.6 22.6h20.8l.9 12.9c0 7.7-22.6 7.7-22.6 0Z" fill={roundGlaze} />
      {face(31, .88)}
      <path d="M18.5 9q4-1.3 7.4-.6l.1 5.7h3.2V7.9h5.6v6.2H38l.1-5.7q3.4-.7 7.4.6l-.9 13.7q-12.6 4.8-25.2 0Z" />
      <path d="M20.3 22.2q11.7 3.8 23.4 0l-.1 3.2q-11.6 3.8-23.2 0Z" fill={band} strokeWidth=".7" />
      <path d="m21.2 11.2-.2 7.1" fill="none" stroke={palette.light} opacity=".6" strokeWidth="1.6" />
      <path d="M21.7 38.1q10.3 4.1 20.6 0l.8 3q-11.1 4.6-22.2 0Z" fill={band} strokeWidth=".85" />
    </g>
  );
  if (type === 'k') return (
    <g {...surface}>
      <path d="M30 2h4v4.4h4.4v3.8H34v5.1h-4v-5.1h-4.4V6.4H30Z" fill={metal} strokeWidth=".9" />
      <path d="M19.8 15.5q12.2-3.9 24.4 0l-1 19.2c-.5 8.2-21.9 8.2-22.4 0Z" fill={roundGlaze} />
      <path d="M22.3 17.1q8.7-2.2 15.6-.9" fill="none" stroke={palette.light} strokeWidth="1.5" opacity=".6" />
      {face(28.5, .84)}
      <path d="M32 34c-2.5-2.1-3.6 1.2-6.4.5 1 3.1 4.6 2.4 6.4.9 1.8 1.5 5.4 2.2 6.4-.9-2.8.7-3.9-2.6-6.4-.5Z" fill={ink} stroke="none" />
      <path d="M20.5 37.5q11.5 5.2 23 0l.9 3.2q-12.4 5.3-24.8 0Z" fill={band} strokeWidth=".85" />
    </g>
  );
  return (
    <g {...surface}>
      <path d="M21 23.4h22v11.5c0 9.1-22 9.1-22 0Z" fill={roundGlaze} />
      {face(31.1, .91)}
      <path d="m20.7 25.5-5-17 10.1 8.9L32 6.2l6.2 11.2 10.1-8.9-5 17q-11.3 3.8-22.6 0Z" />
      <path d="m21.9 20.9-3-8.4m10.7 4.9L32 12" fill="none" stroke={palette.light} strokeWidth="1.4" opacity=".65" />
      <circle cx="15.6" cy="8.5" r="2.1" fill={metal} strokeWidth=".75" />
      <circle cx="32" cy="5.7" r="2.1" fill={metal} strokeWidth=".75" />
      <circle cx="48.4" cy="8.5" r="2.1" fill={metal} strokeWidth=".75" />
      <path d="m32 19 2.1 3.1-2.1 2.1-2.1-2.1Z" fill={metal} strokeWidth=".7" />
      <path d="M21 25q11 3.3 22 0" fill="none" stroke={metal} strokeWidth="1.7" />
      <path d="M22.5 38.5q9.5 4.3 19 0l.6 3q-10.1 4.6-20.2 0Z" fill={band} strokeWidth=".85" />
    </g>
  );
}

function PorcelainFallback({ character, type, color, className = '', inactive = false, ...svgProps }) {
  const id = useId().replace(/:/g, '');
  const pieceType = type || character?.type || character?.birthType || 'p';
  const pieceColor = color || character?.color || 'w';
  const normalizedColor = pieceColor === 'white' ? 'w' : pieceColor === 'black' ? 'b' : pieceColor;
  const ordinal = Math.max(0, Math.floor(Number(character?.ordinal ?? 0) || 0));
  const family = Number.isFinite(character?.variant)
    ? Math.max(0, Math.floor(character.variant / 64))
    : Math.max(0, colorFamilies.indexOf(normalizedColor));
  const faceIndex = (ordinal + family * 3) % 16;
  const emblemIndex = (ordinal + family * 5) % 16;
  const palette = (inactive || character?.inactive) ? inactivePalette : sidePalettes[normalizedColor] || sidePalettes.w;
  const glaze = `url(#${id}-glaze)`;
  const roundGlaze = `url(#${id}-round)`;
  const metal = `url(#${id}-gold)`;
  const band = `url(#${id}-base)`;
  const isPawn = pieceType === 'p';
  const neck = isPawn ? 35.3 : 40.5;

  return (
    <svg viewBox="0 0 64 64" className={`cartoon-piece ${className}`.trim()} aria-hidden="true" focusable="false" data-character={character?.id} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-glaze`} x1="10%" y1="10%" x2="94%" y2="85%">
          <stop offset="0" stopColor={palette.light} /><stop offset=".32" stopColor={palette.coat} /><stop offset=".7" stopColor={palette.coat} /><stop offset="1" stopColor={palette.shade} />
        </linearGradient>
        <radialGradient id={`${id}-round`} cx="32%" cy="25%" r="78%">
          <stop offset="0" stopColor={palette.light} /><stop offset=".54" stopColor={palette.coat} /><stop offset="1" stopColor={palette.shade} />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="100%" y2="100%">
          <stop offset="0" stopColor="var(--toon-gold-light, #ead4a6)" /><stop offset=".46" stopColor="var(--toon-gold, #bda06a)" /><stop offset="1" stopColor="var(--toon-gold-shade, #93703b)" />
        </linearGradient>
        <linearGradient id={`${id}-base`} x1="5%" y1="5%" x2="90%" y2="100%">
          <stop offset="0" stopColor="var(--toon-pedestal-light, #506076)" /><stop offset=".43" stopColor="var(--toon-pedestal, #273346)" /><stop offset="1" stopColor="#172131" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="60" rx="21.5" ry="2.4" fill="#162033" opacity=".16" />
      <g stroke={palette.line} strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M26 ${neck}h12c0 5.7 2.5 9.2 7.4 14.7q-13.4 6.7-26.8 0C23.5 44.5 26 41 26 ${neck}Z`} fill={glaze} />
        <path d={`M27.3 ${neck + 3}c-.8 4.1-2.3 7.1-4.5 10.5`} fill="none" stroke={palette.light} strokeWidth="1.55" opacity=".58" />
        <path d="M18.5 51q13.5 5.2 27 0l3.2 5.8c1.2 3.9-34.6 3.9-33.4 0Z" fill={band} stroke="#243043" />
        <path d="M18.7 51.2q13.3 5.4 26.6 0" fill="none" stroke={metal} strokeWidth="2.2" />
        <path d="M15.7 57.7q16.3 4.6 32.6 0l-.4 2q-15.9 4.4-31.8 0Z" fill={glaze} strokeWidth=".8" />
        <path d="M16.1 57.8q15.9 4.1 31.8 0" fill="none" stroke={metal} strokeWidth="1" />
        <Emblem index={emblemIndex} fill={emblemIndex % 2 ? metal : band} line={emblemIndex % 2 ? '#9c7d48' : '#253246'} y={isPawn ? 44.8 : 47} scale={isPawn ? .76 : .68} />
        {ordinal >= 16 && <path d={`M${24 + Math.floor(ordinal / 16) % 3 * 3} 49.8v1.2`} stroke={palette.ink} strokeWidth="1.3" />}
      </g>
      <Role type={pieceType} palette={palette} faceIndex={faceIndex} glaze={glaze} roundGlaze={roundGlaze} metal={metal} band={band} line={palette.line} />
    </svg>
  );
}


// Each atlas is a single locally bundled transparent image, laid out as a
// four-by-four collection: eight pawns, then R N B Q / K B N R.
// SVG viewports crop the cells at render time, including inside polygon boards.
const ATLAS_COLUMNS = 4;
const ROLE_CELLS = { p: [0, 1, 2, 3, 4, 5, 6, 7], r: [8, 15], n: [9, 14], b: [10, 13], q: [11], k: [12] };
const ATLAS_ROOT = `${import.meta.env.BASE_URL}art/`;
const ROLE_ORDER = ['p', 'n', 'b', 'r', 'q', 'k'];
const POSE_ORDER = ['ready', 'strike', 'celebrate', 'fallen'];
const PARTY_COLORS = ['red', 'blue', 'yellow', 'green'];
const ARMY_TINTS = {
  red: ['#242b37', '#ef9b83'], blue: ['#202c3d', '#93c1de'],
  yellow: ['#332c27', '#ebcc81'], green: ['#202e32', '#9bc9ab'],
};
const ARMY_ATLASES = {
  w: { file: 'ivory-figures.png' },
  b: { file: 'midnight-figures.png' },
  ...Object.fromEntries(PARTY_COLORS.map((color, row) => [color, {
    file: 'party-figures.png', columns: 6, rows: 4,
    roles: Object.fromEntries(ROLE_ORDER.map((role, column) => [role, [row * 6 + column]])),
  }])),
};
// Measured nontransparent bounds, rather than assumed equal grid rows. The
// original renders deliberately give lying figures a shorter final row.
const FRAME_BOUNDS = {
  'ivory-actions.png': [
    [51,73,226,319],[304,39,504,313],[564,24,739,318],[821,67,1000,319],[1074,33,1262,320],[1314,11,1502,313],
    [42,350,259,588],[300,332,536,588],[562,324,774,590],[807,338,1025,590],[1070,330,1280,592],[1295,319,1507,590],
    [63,619,246,861],[312,605,513,861],[580,597,754,862],[828,617,1014,862],[1074,601,1260,862],[1317,595,1506,860],
    [31,873,258,1005],[282,865,523,1009],[536,874,779,1006],[793,873,1017,1004],[1031,862,1277,1009],[1291,863,1525,1003],
  ],
  'midnight-actions.png': [
    [59,99,222,314],[302,51,499,311],[567,43,733,317],[801,70,979,316],[1058,46,1239,316],[1318,19,1496,315],
    [47,353,250,576],[294,330,531,577],[565,319,774,581],[808,346,1032,578],[1074,327,1282,581],[1311,323,1519,578],
    [50,624,230,838],[292,588,509,843],[570,594,741,849],[819,621,1000,849],[1056,591,1252,851],[1316,584,1501,849],
    [37,861,243,1002],[270,861,520,1004],[537,861,773,1000],[785,861,999,1000],[1026,861,1268,1004],[1289,862,1530,1003],
  ],
  'party-figures.png': [
    [72,69,240,288],[310,33,500,286],[563,17,734,287],[797,55,988,288],[1052,10,1229,287],[1300,15,1480,291],
    [72,332,241,549],[308,299,497,549],[565,292,733,552],[797,321,988,550],[1052,294,1228,550],[1300,293,1479,552],
    [71,583,240,797],[310,555,498,797],[565,553,730,798],[798,577,988,799],[1052,552,1228,799],[1299,552,1479,800],
    [71,813,240,1018],[314,799,495,1020],[567,798,733,1021],[799,815,985,1021],[1058,799,1227,1021],[1300,800,1476,1021],
  ],
};
const ROLE_HEIGHTS = { p:50, n:56, b:60, r:56, q:60, k:62 };
const PARTY_FACE_PIXELS = [
  { p:[110,112,95,66], r:[842,135,98,65], b:[607,112,97,67], q:[1090,114,106,66] },
  { p:[110,373,95,66], r:[842,398,98,65], b:[607,382,97,67], q:[1092,389,105,65] },
  { p:[111,621,95,66], r:[843,647,98,65], b:[608,638,97,67], q:[1090,637,106,65] },
  { p:[111,851,94,65], r:[845,879,98,65], b:[610,867,95,67], q:[1094,869,100,64] },
];
const ACTION_FACE_PIXELS = {
  w: {
    ready:{p:[110,120,94,66],r:[879,149,88,61],b:[622,124,90,69],q:[1128,153,106,64]},
    strike:{p:[138,406,95,68],r:[904,417,86,65],b:[648,414,102,66],q:[1144,434,105,68]},
    celebrate:{p:[103,664,108,77],r:[880,692,97,66],b:[625,686,110,70],q:[1121,710,111,71]},
  },
  b: {
    ready:{p:[122,138,85,57],r:[865,147,88,58],b:[622,148,86,59],q:[1117,148,93,63]},
    strike:{p:[134,397,91,65],r:[900,417,83,63],b:[641,418,98,64],q:[1132,427,104,69]},
    celebrate:{p:[107,661,97,69],r:[874,686,97,67],b:[617,691,97,69],q:[1110,689,108,76]},
  },
};

const captureArtworkLoads = new Map();
function preloadArtwork(source) {
  if (captureArtworkLoads.has(source)) return captureArtworkLoads.get(source).promise;
  if (typeof Image === 'undefined') return Promise.resolve(false);
  const entry = { loaded:false, promise:null };
  entry.promise = new Promise(resolve => {
    const artwork = new Image();
    artwork.onload = async () => {
      try { await artwork.decode(); } catch { /* onload already confirms usable pixels. */ }
      entry.loaded = true;
      resolve(true);
    };
    artwork.onerror = () => resolve(false);
    artwork.src = source;
  });
  captureArtworkLoads.set(source, entry);
  return entry.promise;
}

// The app also calls this when player shows are enabled with Classic pieces.
export function preloadCaptureArtwork() {
  return Promise.all(['ivory-actions.png','midnight-actions.png'].map(file => preloadArtwork(ATLAS_ROOT + file)));
}

function frameGeometry(collection, cell, type, pose) {
  const bounds = FRAME_BOUNDS[collection.file]?.[cell];
  if (!bounds) return null;
  const [left, top, right, bottom] = bounds;
  const basis = pose ? FRAME_BOUNDS[collection.file][ROLE_ORDER.indexOf(type)] : bounds;
  const scale = ROLE_HEIGHTS[type] / (basis[3] - basis[1]);
  const width = (right - left) * scale;
  const height = (bottom - top) * scale;
  return { left, top, width, height, scale, x:(64-width)/2, y:62-height,
    viewBox:`${left} ${top} ${right-left} ${bottom-top}` };
}

function fittedFace(pixels, frame) {
  if (!pixels || !frame) return undefined;
  const [x,y,width,height] = pixels;
  return [frame.x + (x-frame.left)*frame.scale, frame.y + (y-frame.top)*frame.scale, width*frame.scale, height*frame.scale];
}

// Face crops are measured from the original, uniformly lit 1254 px masters.
// A promotion swaps the chess form but keeps the physical pawn's exact face.
const PAWN_FACE_CROPS = {
  w: [[129, 97, 90, 74], [436, 97, 96, 74], [734, 96, 102, 77], [1044, 96, 100, 77],
    [118, 385, 111, 80], [433, 387, 103, 80], [739, 389, 100, 80], [1041, 390, 106, 79]],
  b: [[135, 88, 94, 75], [438, 88, 95, 75], [738, 87, 102, 77], [1045, 87, 101, 77],
    [116, 380, 113, 81], [435, 382, 102, 81], [740, 385, 104, 81], [1045, 381, 102, 83]],
};
const ROLE_FACE_WINDOWS = {
  w: { 8: [24, 25, 22, 15], 15: [21, 24, 22, 15], 10: [24, 24, 21, 15], 13: [24, 24, 23, 16], 11: [20.5, 24, 23.5, 16.5] },
  b: { 8: [27, 24.5, 22, 15], 15: [23, 24.5, 22, 15], 10: [24, 25.5, 22, 15], 13: [25, 25.5, 23, 15.5], 11: [22, 25, 23, 17] },
};

function OriginalCharacterFace({ source, color, pawnIndex, cell, type, id, filter, targetOverride, cropOverride, eyesOnly = false }) {
  const family = color === 'b' ? 'b' : 'w';
  const originalCrop = cropOverride || PAWN_FACE_CROPS[family][pawnIndex];
  const crop = eyesOnly ? [originalCrop[0], originalCrop[1], originalCrop[2], originalCrop[3] * .68] : originalCrop;
  const isKnight = type === 'n';
  const target = targetOverride || (isKnight ? [27.5, 43, 11, 8.5] : ROLE_FACE_WINDOWS[family][cell]);
  if (!target) return null;
  const [x, y, width, fullHeight] = target;
  const height = eyesOnly ? fullHeight * .68 : fullHeight;
  return <g className="porcelain-original-face">
    <defs>
      <radialGradient id={`${id}-face-feather`}>
        <stop offset=".88" stopColor="white" />
        <stop offset="1" stopColor="black" />
      </radialGradient>
      <mask id={`${id}-face-mask`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}>
        <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2}
          fill={`url(#${id}-face-feather)`} />
      </mask>
    </defs>
    {isKnight && <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2 + .6} ry={height / 2 + .6}
      fill="#bfa16b" stroke="#6b5739" strokeWidth=".45" />}
    <g mask={`url(#${id}-face-mask)`}>
      <svg x={x} y={y} width={width} height={height}
        viewBox={crop.map(value => value / (1254 / 4)).join(' ')}
        preserveAspectRatio="none" overflow="hidden"
        style={{ width, height, position: 'static', transform: 'none', filter: 'none', overflow: 'hidden' }}>
        <image href={source} width="4" height="4" preserveAspectRatio="none" filter={filter} />
      </svg>
    </g>
  </g>;
}

function channelValues(hex) {
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
}

function tintMatrix([dark, light]) {
  const low = channelValues(dark);
  const high = channelValues(light);
  return low.flatMap((offset, index) => {
    const range = high[index] - offset;
    return [.2126 * range, .7152 * range, .0722 * range, 0, offset];
  }).concat([0, 0, 0, 1, 0]).join(' ');
}

export default function CartoonPiece({ character, type, color, pose, className = '', inactive = false, ...svgProps }) {
  const filterId = `figure-${useId().replace(/:/g, '')}`;
  const [assetFailures, setAssetFailures] = useState([]);
  const failedAssets = Array.isArray(assetFailures) ? assetFailures : [];
  const [, artworkDecoded] = useState(0);
  useEffect(() => {
    let mounted = true;
    preloadCaptureArtwork().then(() => { if (mounted) artworkDecoded(value => value + 1); });
    return () => { mounted = false; };
  }, []);
  const pieceType = type || character?.type || character?.birthType || 'p';
  const rawColor = color || character?.color || 'w';
  const pieceColor = rawColor === 'white' ? 'w' : rawColor === 'black' ? 'b' : rawColor;
  const baseCollection = ARMY_ATLASES[pieceColor] || ARMY_ATLASES.w;
  const requestedPose = POSE_ORDER.includes(pose) ? pose : null;
  const actionFile = pieceColor === 'b' ? 'midnight-actions.png' : 'ivory-actions.png';
  const resolvedPose = requestedPose && captureArtworkLoads.get(ATLAS_ROOT + actionFile)?.loaded
    && !failedAssets.includes(ATLAS_ROOT + actionFile) ? requestedPose : null;
  const actionCollection = resolvedPose && {
    file: actionFile, columns: 6, rows: 4, tint: ARMY_TINTS[pieceColor],
    roles: Object.fromEntries(ROLE_ORDER.map((role, column) => [role, [POSE_ORDER.indexOf(resolvedPose) * 6 + column]])),
  };
  const collection = actionCollection || baseCollection;
  const source = ATLAS_ROOT + collection.file;
  const faceSource = ATLAS_ROOT + (pieceColor === 'b' ? 'midnight-figures.png' : 'ivory-figures.png');
  const ordinal = Math.max(0, Math.floor(Number(character?.ordinal ?? 0) || 0));
  const typeOrdinal = Math.max(0, Math.floor(Number(character?.typeOrdinal ?? ordinal) || 0));
  const cells = collection.roles?.[pieceType] || ROLE_CELLS[pieceType] || ROLE_CELLS.p;
  const cell = cells[typeOrdinal % cells.length];
  const columns = collection.columns || ATLAS_COLUMNS;
  const rows = collection.rows || ATLAS_COLUMNS;
  const column = cell % columns;
  const row = Math.floor(cell / columns);
  const frame = frameGeometry(collection, cell, pieceType, resolvedPose);
  const isInactive = inactive || character?.inactive;
  const family = Math.max(0, colorFamilies.indexOf(pieceColor));
  const emblem = (ordinal + family * 5) % 16;
  const promotedPawn = character?.birthType === 'p' && pieceType !== 'p';
  const pawnIndex = typeOrdinal % 8;

  const isPartyArmy = PARTY_COLORS.includes(pieceColor);
  const facePixels = resolvedPose ? ACTION_FACE_PIXELS[pieceColor === 'b' ? 'b' : 'w'][resolvedPose]?.[pieceType]
    : isPartyArmy ? PARTY_FACE_PIXELS[PARTY_COLORS.indexOf(pieceColor)]?.[pieceType] : undefined;
  const faceTarget = pieceType === 'n' && promotedPawn ? [27.5,43,11,8.5] : fittedFace(facePixels, frame);
  // The two bishops and rooks keep their own eyes and accessories in the
  // shared action poses and colored armies, rather than becoming twins.
  const identityRole = !promotedPawn && ['r','b'].includes(pieceType) && (resolvedPose || isPartyArmy);
  const identityCell = identityRole ? ROLE_CELLS[pieceType][typeOrdinal % ROLE_CELLS[pieceType].length] : null;
  const identityWindow = identityRole ? ROLE_FACE_WINDOWS[pieceColor === 'b' ? 'b' : 'w'][identityCell] : null;
  const identityCrop = identityWindow && [
    (identityCell % 4 + identityWindow[0] / 64) * 313.5,
    (Math.floor(identityCell / 4) + identityWindow[1] / 64) * 313.5,
    identityWindow[2] / 64 * 313.5,
    identityWindow[3] / 64 * 313.5,
  ];
  const originalFace = character && resolvedPose !== 'fallen'
    && (promotedPawn || identityRole || (pieceType === 'p' && (resolvedPose || isPartyArmy)));

  if (failedAssets.includes(source)) {
    return <PorcelainFallback character={character} type={type} color={color} className={className} inactive={inactive} {...svgProps} />;
  }

  return (
    <svg viewBox="0 0 64 64"
      className={`cartoon-piece porcelain-rendered${isInactive ? ' porcelain-inactive' : ''} ${className}`.trim()}
      aria-hidden="true" focusable="false" data-character={character?.id}
      data-artwork="porcelain-render" data-sprite={cell} data-pose={resolvedPose || 'neutral'} {...svgProps}>
      {collection.tint && <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix in="SourceGraphic" type="matrix" values={tintMatrix(collection.tint)} result="army-color" />
          <feColorMatrix in="SourceGraphic" type="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 3 0 -3 0 -.4" result="gold-mask" />
          <feComposite in="SourceGraphic" in2="gold-mask" operator="in" result="champagne-trim" />
          <feMerge><feMergeNode in="army-color" /><feMergeNode in="champagne-trim" /></feMerge>
        </filter>
      </defs>}
      <svg x={frame?.x || 0} y={frame?.y || 0} width={frame?.width || 64} height={frame?.height || 64}
        viewBox={frame?.viewBox || `${column} ${row} 1 1`} preserveAspectRatio="none"
        overflow="hidden" className="porcelain-sprite-cell"
        style={{ width:frame?.width || '100%', height:frame?.height || '100%', position:'static', transform:'none', filter:'none', overflow:'hidden' }}>
        <image href={source} x="0" y="0" width={frame ? 1536 : columns} height={frame ? 1024 : rows} preserveAspectRatio="none"
          filter={collection.tint ? `url(#${filterId})` : undefined}
          onError={() => setAssetFailures(previous => [...(Array.isArray(previous) ? previous : []), source])} />
      </svg>
      {originalFace && <OriginalCharacterFace source={faceSource} color={pieceColor} pawnIndex={pawnIndex}
        cell={cell} type={pieceType} id={filterId} targetOverride={faceTarget} cropOverride={identityCrop}
        eyesOnly={resolvedPose === 'celebrate' && !identityRole} />}
      {character && <g className="porcelain-maker-mark" opacity=".86"
        transform={resolvedPose === 'fallen' ? 'rotate(90 32 32)' : undefined}>
        <Emblem index={emblem} fill={pieceColor === 'b' ? '#ddc28d' : '#455064'}
          line={pieceColor === 'b' ? '#6a5637' : '#d9c5a1'} y={54.3} scale={.31} />
        {ordinal >= 16 && <path d={`M${28 + Math.floor(ordinal / 16) % 4 * 2.6} 57v1.4`}
          stroke={pieceColor === 'b' ? '#e7d3a8' : '#38475c'} strokeWidth=".9" strokeLinecap="round" />}
      </g>}
    </svg>
  );
}
