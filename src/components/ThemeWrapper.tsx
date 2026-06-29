'use client';

import { ThemeProvider } from './ThemeContext';
import type { Theme, AccentColor } from '@/lib/companies/types';

export function ThemeWrapper({
  children,
  defaultTheme = 'dark',
  defaultAccent = 'cyan',
  storageKey,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultAccent?: AccentColor;
  storageKey?: string;
}) {
  return (
    <ThemeProvider defaultTheme={defaultTheme} defaultAccent={defaultAccent} storageKey={storageKey}>
      {children}
    </ThemeProvider>
  );
}
