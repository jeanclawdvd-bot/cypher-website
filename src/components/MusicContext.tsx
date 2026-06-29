'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useCyberpunkAudio } from './useCyberpunkAudio';

interface MusicContextValue {
  isPlaying: boolean;
  toggle: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  isPlaying: false,
  toggle: () => {},
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const audio = useCyberpunkAudio();
  return (
    <MusicContext.Provider value={audio}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
