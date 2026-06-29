'use client';

import { useState, useEffect, useRef, type CSSProperties, type ReactNode, type JSX } from 'react';

export interface TypewriterSegment {
  text: string;
  className?: string;
  style?: CSSProperties;
}

interface TypewriterTextProps {
  segments: TypewriterSegment[];
  /** Milliseconds per character */
  speed?: number;
  /** Milliseconds before typing starts */
  delay?: number;
  /** Wrapper element type */
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;
  /** Fired once the full text has finished typing */
  onComplete?: () => void;
  children?: never;
}

export function TypewriterText({
  segments,
  speed = 60,
  delay = 0,
  as: Tag = 'span',
  className,
  style,
  onComplete,
}: TypewriterTextProps) {
  const totalLength = segments.reduce((sum, s) => sum + s.text.length, 0);
  const [visibleCount, setVisibleCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (totalLength > 0 && visibleCount >= totalLength) {
      onCompleteRef.current?.();
    }
  }, [visibleCount, totalLength]);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;

      const step = (timestamp: number) => {
        if (cancelled) return;
        if (startTimeRef.current === null) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const count = Math.min(Math.floor(elapsed / speed) + 1, totalLength);
        setVisibleCount(count);
        if (count < totalLength) {
          rafRef.current = requestAnimationFrame(step);
        }
      };

      rafRef.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [totalLength, speed, delay]);

  let rendered = 0;
  const nodes: ReactNode[] = segments.map((seg, i) => {
    if (rendered >= visibleCount) return null;
    const charsToShow = Math.min(seg.text.length, visibleCount - rendered);
    rendered += seg.text.length;
    return (
      <span key={i} className={seg.className} style={seg.style}>
        {seg.text.slice(0, charsToShow)}
      </span>
    );
  });

  return (
    <Tag className={className} style={style}>
      {nodes}
      {visibleCount < totalLength && (
        <span aria-hidden style={{ opacity: 0.6 }}>▌</span>
      )}
    </Tag>
  );
}
