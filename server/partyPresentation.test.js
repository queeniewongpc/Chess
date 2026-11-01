import test from 'node:test';
import assert from 'node:assert/strict';
import { partySeatPresentation, partySeatCenter } from '../shared/partyPresentation.js';
import { getPartyGeometry } from '../shared/partyGeometry.js';

test('same-device seat strips face their unchanged four-player and three-player armies', () => {
  for (const count of [3, 4]) {
    const geometry = getPartyGeometry(count);
    for (const seat of geometry.seats) {
      const placement = partySeatPresentation(count, seat.color);
      assert.equal(placement.positionRotation, seat.rotation);
      assert.equal(placement.facingRotation, seat.rotation);
      const center = partySeatCenter(geometry.width, geometry.height, placement.positionRotation, 30);
      const radians = seat.rotation * Math.PI / 180;
      const outward = (center.x - geometry.width / 2) * -Math.sin(radians) + (center.y - geometry.height / 2) * Math.cos(radians);
      assert.ok(outward > geometry.height / 2, `${seat.color} must sit outside its home edge`);
    }
  }
});

test('every online viewer has their own bottom strip with upright content and correctly rotated rivals', () => {
  for (const count of [3, 4]) {
    const geometry = getPartyGeometry(count);
    for (const viewer of geometry.seats) {
      for (const seat of geometry.seats) {
        const placement = partySeatPresentation(count, seat.color, { local: false, viewColor: viewer.color });
        assert.equal(placement.facingRotation, 0);
        assert.equal(placement.positionRotation, (seat.rotation - viewer.rotation + 360) % 360);
        if (seat.color === viewer.color) assert.equal(placement.positionRotation, 0);
      }
    }
  }
  assert.equal(partySeatPresentation(3, 'green'), null);
  assert.deepEqual(partySeatPresentation(4, 'blue', { local: false, viewColor: 'missing' }), { positionRotation: 90, facingRotation: 0 });
});
