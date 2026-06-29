'use client';

import { useTheme } from './ThemeContext';
import { ChevronLeft, Sun, Moon, AudioLines } from 'lucide-react';
import { useMusic } from './MusicContext';
import styles from './BottomWidget.module.css';

interface BottomWidgetProps {
  collapsed: boolean;
  onToggle: () => void;
}

function GithubIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function XIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function BottomWidget({ collapsed, onToggle }: BottomWidgetProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { isPlaying, toggle: toggleMusic } = useMusic();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const hiddenClass = collapsed ? styles.iconBtnHidden : '';

  return (
    <div className={`${styles.widget} ${collapsed ? styles.widgetCollapsed : ''}`}>
      <button
        className={styles.toggleBtn}
        onClick={onToggle}
        aria-label={collapsed ? 'Expand side menu' : 'Collapse side menu'}
      >
        <ChevronLeft
          size={14}
          className={`${styles.toggleIcon} ${collapsed ? styles.toggleIconCollapsed : ''}`}
        />
      </button>
      <button
        className={`${styles.iconBtn} ${hiddenClass} ${isPlaying ? styles.musicActive : ''}`}
        onClick={toggleMusic}
        aria-label={isPlaying ? 'Stop music' : 'Play music'}
      >
        <AudioLines size={13} />
      </button>
      <a
        href="https://github.com/cypher-asi"
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.iconBtn} ${hiddenClass}`}
        aria-label="GitHub"
      >
        <GithubIcon />
      </a>
      <a
        href="https://x.com/cyaborgs"
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.iconBtn} ${hiddenClass}`}
        aria-label="X"
      >
        <XIcon />
      </a>
      <button
        className={`${styles.iconBtn} ${hiddenClass}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {resolvedTheme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      </button>
    </div>
  );
}
