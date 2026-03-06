import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DREAMCAST_SYSTEM_ID,
  defaultEnabledSystems,
  systemOrder
} from '../src/lib/config/systems.js';

test('Dreamcast is opt-in until runtime support is confirmed', () => {
  assert.equal(systemOrder.includes(DREAMCAST_SYSTEM_ID), true);
  assert.equal(defaultEnabledSystems.includes(DREAMCAST_SYSTEM_ID), false);
});
