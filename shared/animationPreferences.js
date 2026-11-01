const PIECE_STYLES = ['cartoon', 'classic'];
const CHANNELS = ['board', 'players'];
const absent = value => value === undefined || value === null || value === '';
const booleanPreference = value => value === true || value === 'on' ? true : value === false || value === 'off' ? false : undefined;

/**
 * Normalize this device's artwork and two independent animation channels.
 *
 * An absent pieceStyle means the two legacy storage keys are being migrated:
 * animations off and the former edge show both used the original artwork.
 * Fresh devices default to cartoon pieces with both animation channels on.
 * New board/players values take precedence independently. Missing channels
 * migrate the former enabled/placement selection, or use fresh defaults when
 * those legacy keys are also absent. Pass raw optional storage values so an
 * absent key remains distinguishable from an explicit saved preference.
 *
 * Keep `board` even while Classic artwork is selected; it is a remembered
 * preference, effective only when pieceStyle is cartoon. Changing artwork
 * never silently enables the player-side show.
 */
export function normalizeAnimationPreferences(input = {}) {
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const legacyEnabled = booleanPreference(value.enabled) ?? true;
  const legacyPlacement = value.placement === 'edge' ? 'edge' : 'board';
  const pieceStyle = absent(value.pieceStyle)
    ? (!legacyEnabled || legacyPlacement === 'edge' ? 'classic' : 'cartoon')
    : PIECE_STYLES.includes(value.pieceStyle) ? value.pieceStyle : 'cartoon';
  const hasLegacySelection = !absent(value.enabled) || !absent(value.placement);
  const migratedPlacement = pieceStyle === 'classic' ? 'edge' : legacyPlacement;
  return {
    pieceStyle,
    board: booleanPreference(value.board) ?? (hasLegacySelection ? legacyEnabled && migratedPlacement === 'board' : true),
    players: booleanPreference(value.players) ?? (hasLegacySelection ? legacyEnabled && migratedPlacement === 'edge' : true),
  };
}

/** Switching artwork retains both independent channel preferences. */
export function choosePieceStyle(preferences, pieceStyle) {
  const current = normalizeAnimationPreferences(preferences);
  if (!PIECE_STYLES.includes(pieceStyle)) return current;
  return { ...current, pieceStyle };
}

/** Change one channel without changing the other channel or the artwork. */
export function setAnimationChannel(preferences, channel, enabled) {
  const current = normalizeAnimationPreferences(preferences);
  const nextEnabled = booleanPreference(enabled);
  if (!CHANNELS.includes(channel) || nextEnabled === undefined) return current;
  if (channel === 'board' && current.pieceStyle !== 'cartoon') return current;
  return { ...current, [channel]: nextEnabled };
}
