const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

function isVisible(element) {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

export function getFocusableElements(container) {
  if (!container) return [];

  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (element) => element instanceof HTMLElement && isVisible(element) && element.getAttribute('aria-hidden') !== 'true'
  );
}

export function focusFirstElement(container) {
  const [first] = getFocusableElements(container);
  if (first) {
    first.focus();
    return true;
  }

  if (container instanceof HTMLElement) {
    container.focus();
    return true;
  }

  return false;
}

export function trapFocus(event, container) {
  if (event.key !== 'Tab') return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    if (container instanceof HTMLElement) container.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
