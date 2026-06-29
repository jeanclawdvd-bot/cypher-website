import { Inter, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * Central font registry. Each loader exposes a neutral CSS variable
 * (`--font-inter`, `--font-jetbrains`, `--font-ddin`). Semantic tokens
 * (`--font-sans`, `--font-mono`, `--font-display`) live in globals.css and are
 * remapped per company so each brand can pick its own typeface.
 */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

/** D-DIN (Datto, SIL OFL 1.1) — Wilder World brand face. */
export const dDin = localFont({
  variable: '--font-ddin',
  display: 'swap',
  src: [
    {
      path: '../app/fonts/d-din/D-DIN.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../app/fonts/d-din/D-DIN-Bold.woff',
      weight: '700',
      style: 'normal',
    },
  ],
});

/** Every font variable attached to <html>, regardless of active brand. */
export const fontVariables = `${inter.variable} ${jetbrainsMono.variable} ${dDin.variable}`;
