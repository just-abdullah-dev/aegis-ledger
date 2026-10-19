import { Platform } from 'react-native';

export const AegisColors = {
  // Deep Navy Aegis Palette
  navy950: '#0B0F19', // Deepest background
  navy900: '#0F172A', // Main Navy background
  navy800: '#1E293B', // Card Surface
  navy700: '#334155', // Border & separators
  navy600: '#475569', // Subtle outline

  // Primary Brand Accent
  primary500: '#2563EB',
  primary400: '#3B82F6',
  primary600: '#1D4ED8',

  // Status & Financial Indicators
  emerald500: '#10B981', // Available Liquidity / Solvency Success
  emerald400: '#34D399',
  emerald900: '#064E3B',
  emeraldBg: '#064E3B40',

  amber500: '#F59E0B', // Active Holds / Ring-Fenced Warning
  amber400: '#FBBF24',
  amber900: '#78350F',
  amberBg: '#78350F40',

  rose500: '#EF4444', // Debits / Locked / Danger
  roseBg: '#7F1D1D40',

  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Highlights
  cardGlow: 'rgba(59, 130, 246, 0.08)',
  accentGlow: 'rgba(16, 185, 129, 0.12)',
} as const;

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F8FAFC',
    backgroundElement: '#EDF2F7',
    backgroundSelected: '#E2E8F0',
    textSecondary: '#64748B',
  },
  dark: {
    text: '#F8FAFC',
    background: AegisColors.navy900,
    backgroundElement: AegisColors.navy800,
    backgroundSelected: '#283548',
    textSecondary: AegisColors.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display, system-ui)',
    serif: 'var(--font-serif, serif)',
    rounded: 'var(--font-rounded, sans-serif)',
    mono: 'var(--font-mono, monospace)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
