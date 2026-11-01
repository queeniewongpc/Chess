const recommendedTakebacks = { classic: 'approval', endgame: 'free', half: 'free', party: 'off' };
const modeKey = mode => mode === 'custom' ? 'endgame' : mode;

// Apply recommendations only when choosing an unseen mode in fresh game setup.
// Existing rooms bypass this helper, and allowances remain exactly as selected.
export function updateSetupDefaults(current, next, preferences = {}) {
  const currentMode = modeKey(current.mode);
  const nextMode = modeKey(next.mode);
  const remembered = { ...preferences, [currentMode]: current.undoMode };
  const settings = currentMode === nextMode ? next : {
    ...next,
    undoMode: remembered[nextMode] ?? recommendedTakebacks[nextMode] ?? next.undoMode,
  };
  return { settings, preferences: { ...remembered, [nextMode]: settings.undoMode } };
}
