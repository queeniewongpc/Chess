const TEAMS = Object.freeze({
  'red-yellow': Object.freeze(['red', 'yellow']),
  'blue-green': Object.freeze(['blue', 'green']),
});

/** Opposite seats form fixed teams; existing seats and move ownership stay intact. */
export function partyTeamFor(color) {
  return Object.keys(TEAMS).find(team => TEAMS[team].includes(color)) ?? null;
}

export function partyTeamColors(team) { return [...(TEAMS[team] ?? [])]; }

export function partyTeamLabel(team) {
  return partyTeamColors(team).map(color => `${color[0].toUpperCase()}${color.slice(1)}`).join(' & ');
}

export function samePartyTeam(first, second) {
  const team = partyTeamFor(first);
  return team !== null && team === partyTeamFor(second);
}

export function isPartyTeams(settings = {}) {
  return settings.mode === 'party' && (settings.playerCount ?? 4) === 4 && settings.partyVariant === 'teams';
}
