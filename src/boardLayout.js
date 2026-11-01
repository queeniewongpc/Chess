// Display geometry only. A short window must never turn off desktop sticking.
export function fitDesktopBoard({ viewportHeight, chromeHeight, naturalWidth, columns, rows, inset = 16, minimumSquare = 32 }) {
  if (![viewportHeight, naturalWidth, columns, rows].every(value => Number.isFinite(value) && value > 0)
    || !Number.isFinite(chromeHeight) || chromeHeight < 0) return null;
  const availableHeight = viewportHeight - inset * 2 - chromeHeight;
  const minimumWidth = Math.min(naturalWidth, minimumSquare * columns);
  const width = Math.floor(Math.min(naturalWidth, Math.max(minimumWidth, availableHeight * columns / rows)));
  const height = width * rows / columns;
  // A taller panel scrolls up naturally, then anchors with its lower controls visible.
  const top = Math.floor(Math.min(inset, viewportHeight - inset - chromeHeight - height));
  return { width, height, top };
}
