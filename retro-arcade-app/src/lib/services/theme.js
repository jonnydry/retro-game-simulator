export const THEME_OPTIONS = [
  {
    id: 'neon-cyan',
    label: 'Neon Cyan',
    accentSecondary: '#66f5ff',
    accentTertiary: '#ffce72'
  },
  {
    id: 'laser-magenta',
    label: 'Laser Magenta',
    accentSecondary: '#f85bff',
    accentTertiary: '#66f5ff'
  },
  {
    id: 'spark-gold',
    label: 'Spark Gold',
    accentSecondary: '#ffce72',
    accentTertiary: '#ff68d8'
  },
  {
    id: 'arcade-violet',
    label: 'Arcade Violet',
    accentSecondary: '#7f6dff',
    accentTertiary: '#66f5ff'
  },
  {
    id: 'ember-coral',
    label: 'Ember Coral',
    accentSecondary: '#ff8c66',
    accentTertiary: '#ffce72'
  },
  {
    id: 'pixel-lilac',
    label: 'Pixel Lilac',
    accentSecondary: '#d8c0ff',
    accentTertiary: '#f85bff'
  }
];

export const DEFAULT_THEME = THEME_OPTIONS[0].id;

export function normalizeTheme(themeId) {
  return THEME_OPTIONS.some((theme) => theme.id === themeId) ? themeId : DEFAULT_THEME;
}

export function applyTheme(themeId) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = normalizeTheme(themeId);
}
