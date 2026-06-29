'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { Theme, AccentColor } from '@/lib/companies/types';

type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  accent: AccentColor;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: AccentColor) => void;
}

const DEFAULT_STORAGE_KEY = 'zui-theme';
const VALID_THEMES: Theme[] = ['dark', 'light', 'system'];
const VALID_ACCENTS: AccentColor[] = ['cyan', 'blue', 'purple', 'green', 'orange', 'rose'];

function getStoredPrefs(storageKey: string): { theme: Theme; accent: AccentColor } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      VALID_THEMES.includes(parsed.theme) &&
      VALID_ACCENTS.includes(parsed.accent)
    ) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function savePrefs(storageKey: string, theme: Theme, accent: AccentColor) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ theme, accent }));
  } catch { /* ignore */ }
}

function applyToDocument(resolved: ResolvedTheme, accent: AccentColor) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-accent', accent);
}

function useSystemTheme(): ResolvedTheme {
  const [sys, setSys] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSys(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return sys;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  accent: 'cyan',
  resolvedTheme: 'dark',
  systemTheme: 'dark',
  setTheme: () => {},
  setAccent: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  defaultAccent?: AccentColor;
  /** localStorage key. Namespace per company so prefs don't bleed across domains. */
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  defaultAccent = 'cyan',
  storageKey = DEFAULT_STORAGE_KEY,
}: ThemeProviderProps) {
  const systemTheme = useSystemTheme();

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = getStoredPrefs(storageKey);
    return stored?.theme ?? defaultTheme;
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    const stored = getStoredPrefs(storageKey);
    return stored?.accent ?? defaultAccent;
  });

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'system') return systemTheme;
    return theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    applyToDocument(resolvedTheme, accent);
  }, [resolvedTheme, accent]);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      savePrefs(storageKey, t, accent);
    },
    [accent, storageKey],
  );

  const setAccent = useCallback(
    (a: AccentColor) => {
      setAccentState(a);
      savePrefs(storageKey, theme, a);
    },
    [theme, storageKey],
  );

  const value: ThemeContextValue = useMemo(
    () => ({ theme, accent, resolvedTheme, systemTheme, setTheme, setAccent }),
    [theme, accent, resolvedTheme, systemTheme, setTheme, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
