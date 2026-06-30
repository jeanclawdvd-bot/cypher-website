'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './CityShowcase.module.css';

const BACKDROPS = [
  { id: 'day', label: 'Day', Icon: Sun, src: '/videos/midday.mp4' },
  { id: 'night', label: 'Night', Icon: Moon, src: '/videos/night.mp4' },
] as const;

type BackdropId = (typeof BACKDROPS)[number]['id'];

export default function CityShowcase() {
  const [active, setActive] = useState<BackdropId>('day');
  // The frame is always full width; its height is derived from the active
  // clip's real aspect ratio so the whole width shows with no cropping. The
  // ratio is reserved on the container so the frame never collapses (and flashes
  // the footer) while a newly selected clip loads.
  const [aspectRatio, setAspectRatio] = useState('16 / 9');
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeBackdrop = BACKDROPS.find((b) => b.id === active) ?? BACKDROPS[0];

  const syncRatio = useCallback(() => {
    const v = videoRef.current;
    if (v && v.videoWidth && v.videoHeight) {
      setAspectRatio(`${v.videoWidth} / ${v.videoHeight}`);
    }
  }, []);

  // Metadata can finish loading before React attaches the handler (e.g. a
  // cached clip), so re-measure after mount and whenever the clip changes.
  useEffect(() => {
    syncRatio();
  }, [active, syncRatio]);

  return (
    <div className={styles.showcase} style={{ aspectRatio }}>
      <video
        ref={videoRef}
        className={styles.video}
        src={activeBackdrop.src}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
        onLoadedMetadata={syncRatio}
      />
      <div className={styles.timeControls}>
        {BACKDROPS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.timeButton} ${
              id === active ? styles.timeButtonActive : ''
            }`}
            onClick={() => setActive(id)}
            aria-label={label}
            aria-pressed={id === active}
            title={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}
