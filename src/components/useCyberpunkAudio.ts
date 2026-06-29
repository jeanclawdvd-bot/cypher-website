'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

const BPM = 130;
const STEP_SEC = 60 / BPM / 4;

const NOTE: Record<string, number> = {
  C2: 65.41, Eb2: 77.78, F2: 87.31, G2: 98.0,
  C3: 130.81, Eb3: 155.56, F3: 174.61, G3: 196.0, Bb3: 233.08,
  C4: 261.63, Eb4: 311.13,
};

const ARP = [
  NOTE.C3, NOTE.Eb3, NOTE.G3, NOTE.C4,
  NOTE.Bb3, NOTE.G3, NOTE.Eb3, NOTE.F3,
  NOTE.G3, NOTE.Bb3, NOTE.C4, NOTE.Eb4,
  NOTE.C4, NOTE.Bb3, NOTE.G3, NOTE.Eb3,
];

const BASS = [NOTE.C2, NOTE.C2, NOTE.Eb2, NOTE.C2];
const HIHAT_STEPS = new Set([0, 2, 4, 6, 8, 10, 12, 14]);
const KICK_STEPS = new Set([0, 4, 8, 12]);

function makeNoise(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 0.1;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  comp: DynamicsCompressorNode;
  noise: AudioBuffer;
  timer: number;
  step: number;
  nextTime: number;
  running: boolean;
}

export function useCyberpunkAudio() {
  const eng = useRef<Engine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playArp = useCallback((e: Engine, freq: number, t: number) => {
    const o = e.ctx.createOscillator();
    const g = e.ctx.createGain();
    const f = e.ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(400, t + STEP_SEC * 0.8);
    f.Q.setValueAtTime(8, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + STEP_SEC * 0.9);
    o.connect(f).connect(g).connect(e.comp);
    o.start(t);
    o.stop(t + STEP_SEC);
  }, []);

  const playKick = useCallback((e: Engine, t: number) => {
    const o = e.ctx.createOscillator();
    const g = e.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.15);
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(e.comp);
    o.start(t);
    o.stop(t + 0.3);
  }, []);

  const playHat = useCallback((e: Engine, t: number) => {
    const s = e.ctx.createBufferSource();
    const g = e.ctx.createGain();
    const f = e.ctx.createBiquadFilter();
    s.buffer = e.noise;
    f.type = 'highpass';
    f.frequency.setValueAtTime(8000, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f).connect(g).connect(e.comp);
    s.start(t);
    s.stop(t + 0.05);
  }, []);

  const playBass = useCallback((e: Engine, freq: number, t: number) => {
    const o = e.ctx.createOscillator();
    const g = e.ctx.createGain();
    const f = e.ctx.createBiquadFilter();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t);
    f.Q.setValueAtTime(2, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + STEP_SEC * 3.5);
    o.connect(f).connect(g).connect(e.comp);
    o.start(t);
    o.stop(t + STEP_SEC * 4);
  }, []);

  const tick = useCallback(() => {
    const e = eng.current;
    if (!e?.running) return;
    const ahead = 0.1;
    while (e.nextTime < e.ctx.currentTime + ahead) {
      const s = e.step % 16;
      const t = e.nextTime;
      playArp(e, ARP[s], t);
      if (KICK_STEPS.has(s)) playKick(e, t);
      if (HIHAT_STEPS.has(s)) playHat(e, t);
      if (s % 4 === 0) playBass(e, BASS[s / 4], t);
      e.nextTime += STEP_SEC;
      e.step++;
    }
  }, [playArp, playKick, playHat, playBass]);

  const toggle = useCallback(() => {
    if (eng.current?.running) {
      const e = eng.current;
      e.running = false;
      e.master.gain.linearRampToValueAtTime(0, e.ctx.currentTime + 0.3);
      clearInterval(e.timer);
      setTimeout(() => e.ctx.suspend(), 350);
      setIsPlaying(false);
      return;
    }

    if (!eng.current) {
      const ctx = new AudioContext();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-20, 0);
      comp.ratio.setValueAtTime(4, 0);
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, 0);
      comp.connect(master).connect(ctx.destination);
      eng.current = {
        ctx, master, comp,
        noise: makeNoise(ctx),
        timer: 0, step: 0, nextTime: 0, running: false,
      };
    }

    const e = eng.current;
    e.ctx.resume().then(() => {
      e.running = true;
      e.step = 0;
      e.nextTime = e.ctx.currentTime + 0.05;
      e.master.gain.setValueAtTime(0, e.ctx.currentTime);
      e.master.gain.linearRampToValueAtTime(0.7, e.ctx.currentTime + 0.3);
      e.timer = window.setInterval(tick, 25);
      tick();
      setIsPlaying(true);
    });
  }, [tick]);

  useEffect(() => {
    return () => {
      if (eng.current) {
        eng.current.running = false;
        clearInterval(eng.current.timer);
        eng.current.ctx.close();
        eng.current = null;
      }
    };
  }, []);

  return { isPlaying, toggle } as const;
}
