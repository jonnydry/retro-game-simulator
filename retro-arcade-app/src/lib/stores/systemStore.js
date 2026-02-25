import { writable } from 'svelte/store';
import { DREAMCAST_SYSTEM_ID, defaultEnabledSystems, systemOrder } from '$lib/config/systems.js';

export const enabledSystems = writable(defaultEnabledSystems);

export function setDreamcastEnabled(enabled) {
  enabledSystems.update((systems) => {
    const hasDreamcast = systems.includes(DREAMCAST_SYSTEM_ID);
    if (enabled && !hasDreamcast) {
      const merged = [...systems, DREAMCAST_SYSTEM_ID];
      return systemOrder.filter((id) => merged.includes(id));
    }
    if (!enabled && hasDreamcast) {
      return systems.filter((id) => id !== DREAMCAST_SYSTEM_ID);
    }
    return systems;
  });
}
