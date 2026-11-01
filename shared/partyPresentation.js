import { getPartyGeometry } from './partyGeometry.js';

/** Cosmetic seat placement follows the same rotation as the rendered armies. */
export function partySeatPresentation(playerCount, color, { local = true, viewColor = 'red' } = {}) {
  const geometry = getPartyGeometry(playerCount);
  const seat = geometry.seats.find(item => item.color === color);
  if (!seat) return null;
  const viewer = geometry.seats.find(item => item.color === viewColor) || geometry.seats[0];
  const positionRotation = ((seat.rotation - (local ? 0 : viewer.rotation)) % 360 + 360) % 360;
  return { positionRotation, facingRotation: local ? seat.rotation : 0 };
}

/** Centers sit beyond the army's home edge, never on a playable square. */
export function partySeatCenter(width, height, positionRotation, clearance) {
  const radians = positionRotation * Math.PI / 180;
  const radius = height / 2 + clearance;
  return {
    x: width / 2 - Math.sin(radians) * radius,
    y: height / 2 + Math.cos(radians) * radius,
  };
}
