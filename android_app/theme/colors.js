// Dripdirective Theme - Luxury Minimal (black/charcoal + gold accents)
// NOTE: This file intentionally keeps existing key names (primary/accent/etc.)
// to avoid touching every screen at once.
export const COLORS = {
  // Brand
  primary: '#D6B15E', // Gold
  primaryDark: '#B8903D',
  primaryLight: '#F0DCA2',

  // Accent (subtle, premium)
  accent: '#E6C878',
  accentLight: '#F4E6B8',
  accentDark: '#C9A44B',

  // Secondary (cool neutral highlight)
  secondary: '#9CA3AF',
  secondaryLight: '#D1D5DB',
  secondaryDark: '#6B7280',

  // Tertiary (warm neutral)
  tertiary: '#A78BFA',
  tertiaryLight: '#C4B5FD',
  tertiaryDark: '#7C3AED',

  // Backgrounds
  background: '#0B0B0C',
  backgroundLight: '#111113',
  backgroundCard: '#0F0F11',
  // Glass / overlays
  backgroundGlass: 'rgba(255, 255, 255, 0.06)',
  backgroundGlassStrong: 'rgba(255, 255, 255, 0.10)',

  // Surfaces
  surface: '#141416',
  surfaceLight: '#1B1B1E',
  surfaceHighlight: '#222226',

  // Text
  textPrimary: '#F5F5F5',
  textSecondary: '#B9BCC2',
  textMuted: '#7C7F87',
  textAccent: '#D6B15E',

  // Status
  success: '#2DD4BF',
  successLight: '#5EEAD4',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  error: '#EF4444',
  errorLight: '#FCA5A5',
  info: '#60A5FA',
  infoLight: '#93C5FD',

  // Gradients
  gradients: {
    // Subtle gold sheen
    primary: ['#B8903D', '#D6B15E', '#F0DCA2'],
    // Neutral luxury surface
    accent: ['#1B1B1E', '#141416'],
    // Dark background
    midnight: ['#111113', '#0B0B0C'],
    // Decorative (optional)
    ember: ['#3B2F1A', '#0B0B0C'],
  },

  // Borders
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.16)',
  borderAccent: 'rgba(214, 177, 94, 0.45)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  glow: {
    shadowColor: '#D6B15E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 15,
  },
};

export default { COLORS, SPACING, BORDER_RADIUS, SHADOWS };

