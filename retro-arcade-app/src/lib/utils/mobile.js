/**
 * Detect if the current viewport is considered mobile.
 * Matches portrait narrow screens (<=768px) or landscape phones (short height).
 */
export function isMobile() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches
  );
}

/**
 * Svelte-safe subscription to mobile state.
 * Returns a function that checks current state.
 */
export function getIsMobile() {
  return isMobile();
}
