// Dripdirective Theme - Gen-Z Aesthetic
export const COLORS = {
  // Primary Gradient Colors
  primary: '#6366F1', // Indigo
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  
  // Accent Colors - Vibrant
  accent: '#EC4899', // Pink
  accentLight: '#F472B6',
  accentDark: '#DB2777',
  
  // Secondary - Electric Teal
  secondary: '#14B8A6',
  secondaryLight: '#2DD4BF',
  secondaryDark: '#0D9488',
  
  // Tertiary - Amber/Orange
  tertiary: '#F59E0B',
  tertiaryLight: '#FBBF24',
  tertiaryDark: '#D97706',
  
  // Background Colors
  background: '#0F0F1A', // Deep dark
  backgroundLight: '#1A1A2E',
  backgroundCard: '#16213E',
  backgroundGlass: 'rgba(255, 255, 255, 0.05)',
  
  // Surface Colors
  surface: '#1E1E32',
  surfaceLight: '#2A2A4A',
  surfaceHighlight: '#3A3A5C',
  
  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textAccent: '#818CF8',
  
  // Status Colors
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  error: '#EF4444',
  errorLight: '#F87171',
  info: '#3B82F6',
  infoLight: '#60A5FA',
  
  // Gradient Presets
  gradients: {
    primary: ['#6366F1', '#8B5CF6', '#A855F7'],
    accent: ['#EC4899', '#F472B6', '#FB7185'],
    sunset: ['#F59E0B', '#EF4444', '#EC4899'],
    ocean: ['#06B6D4', '#3B82F6', '#6366F1'],
    aurora: ['#10B981', '#14B8A6', '#06B6D4'],
    midnight: ['#1E1E32', '#0F0F1A'],
  },
  
  // Border Colors
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderAccent: 'rgba(99, 102, 241, 0.5)',
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
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
};

export default { COLORS, SPACING, BORDER_RADIUS, SHADOWS };

