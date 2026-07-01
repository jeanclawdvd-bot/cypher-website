'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import GameplayCard, { type GameplayCardProps } from './GameplayCard';
import FactionSelector from './FactionSelector';
import NewsCarousel from './NewsCarousel';
import LazyVideo from './LazyVideo';
import { FadeInImage } from '@/components/FadeInImage';
import { useMobileMedia, mobileSrc } from './useMobileMedia';
import styles from './Landing.module.css';

const EARLY_ACCESS_URL =
  'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US';
const TRAILER_URL = 'https://www.youtube.com/watch?v=7G8SwYp6gPo';

const HERO_HEADING = 'The Simulation.';

const GAMEPLAY_MODES: GameplayCardProps[] = [
  {
    title: 'Race',
    description: 'Tear through the streets in high-speed races across Wiami.',
    video: '/videos/wiami-race.mp4',
    poster: 'race',
    href: '/gameplay#race',
  },
  {
    title: 'Fight',
    description: 'Take the fight street-level in intense FPS battles.',
    video: '/videos/wiami-fight.mp4',
    poster: 'fight',
    href: '/gameplay#fight',
  },
  {
    title: 'Explore',
    description: 'Roam a massive open world driven by RPG missions.',
    video: '/images/wilder-world/meow_craft.mp4',
    poster: 'explore',
    href: '/gameplay#explore',
  },
  {
    title: 'Build',
    description: 'Own and build everything from land to vehicles.',
    video: '/videos/wilder_construction.mp4',
    poster: 'build',
    href: '/gameplay#build',
  },
];

export default function WilderworldLanding() {
  const { isMobile, format } = useMobileMedia();
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [heroReady, setHeroReady] = useState(false);
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [actionsIn, setActionsIn] = useState(false);

  // If the video is served from cache the canplay event can fire before React
  // attaches its handler, so also check readyState once on mount.
  useEffect(() => {
    if (heroVideoRef.current && heroVideoRef.current.readyState >= 3) {
      setHeroReady(true);
    }
  }, []);

  // Type out the heading, then fade in the description, then slide up the buttons.
  useEffect(() => {
    let i = 0;
    const typer = setInterval(() => {
      i += 1;
      setTyped(HERO_HEADING.slice(0, i));
      if (i >= HERO_HEADING.length) {
        clearInterval(typer);
        setTypingDone(true);
      }
    }, 85);
    return () => clearInterval(typer);
  }, []);

  useEffect(() => {
    if (!typingDone) return;
    const actionsTimer = setTimeout(() => setActionsIn(true), 650);
    return () => {
      clearTimeout(actionsTimer);
    };
  }, [typingDone]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.frame}>
          <video
            ref={heroVideoRef}
            className={`${styles.video} ${styles.heroVideo} ${heroReady ? styles.heroVideoReady : ''}`}
            src="/videos/sunset_hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
            onCanPlay={() => setHeroReady(true)}
            onLoadedData={() => setHeroReady(true)}
          />
          <div className={styles.scrim} aria-hidden />
        </div>
        <div className={styles.overlay}>
          <h1 className={styles.heading}>
            {typed}
            <span
              className={`${styles.caret} ${typingDone ? styles.caretDone : ''}`}
              aria-hidden
            />
          </h1>
          <div
            className={`${styles.actions} ${styles.heroActions} ${actionsIn ? styles.heroActionsIn : ''}`}
          >
            <a
              className="sci-btn sci-btn-primary"
              href={EARLY_ACCESS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Early Access
              <ArrowUpRight size={16} />
            </a>
            <a
              className="sci-btn sci-btn-ghost"
              href={TRAILER_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Play size={15} />
              Watch Trailer
            </a>
          </div>
        </div>
      </section>

      <section id="gameplay" className={styles.gameplaySection}>
        <div className={styles.gameplayInner}>
          <SectionHeader
            eyebrow="Gameplay"
            title="Wire In"
            subtitle={
              <>
                A massive open-world simulation where you can race, fight,
                explore and build. Engage in high-speed street races, intense
                FPS battles, RPG-driven missions and own everything from land to
                vehicles, all within Wilder World.
              </>
            }
          />
          <div className={styles.gameplayGrid}>
            {GAMEPLAY_MODES.map((mode) => (
              <GameplayCard key={mode.title} {...mode} />
            ))}
          </div>
        </div>
      </section>

      <section id="city" className={styles.gameplaySection}>
        <div className={styles.gameplayInner}>
          <SectionHeader
            eyebrow="City"
            title="Welcome to Wiami"
            subtitle={
              <>
                Wiami is a massive virtual metropolis with residential areas,
                commercial hubs, industrial zones and legendary landmarks. More
                than just an open world, it&rsquo;s a city built for endless
                gameplay, exploration and discovery.
              </>
            }
          />
          <LazyVideo src="/videos/wiami-map.mp4" poster="map" />
        </div>
      </section>

      <section className={styles.gameplaySection}>
        <div className={styles.gameplayInner}>
          <SectionHeader
            eyebrow="The Breach"
            title="A City Under Attack"
            subtitle={
              <>
                The FORUM has breached The GATE and poured its forces into Wiami.
                Its mission: crush the rebellion before it can rise and seize
                control of the simulation.
              </>
            }
          />
          <div className={styles.cityMap}>
            <FadeInImage
              className={styles.cityMapVideo}
              src={
                isMobile
                  ? mobileSrc('spartan_attack', format)
                  : '/images/wilder-world/spartan_attack.png'
              }
              alt=""
              aria-hidden
            />
          </div>
        </div>
      </section>

      <section className={styles.gameplaySection}>
        <div className={styles.gameplayInner}>
          <SectionHeader
            eyebrow="Universe"
            title="Fight For Freedom"
            subtitle={
              <>
                Wiami was meant to stay hidden beyond The GATE. But The FORUM has
                found it, turning its full force on the city. The attack has
                begun, and only those willing to fight can keep the simulation
                standing.
              </>
            }
          />
          <div className={styles.cityMap}>
            <FadeInImage
              className={styles.cityMapVideo}
              src={
                isMobile
                  ? mobileSrc('trinity_fire', format)
                  : '/images/wilder-world/trinity_fire.png'
              }
              alt=""
              aria-hidden
            />
          </div>
        </div>
      </section>

      <section className={styles.gameplaySection}>
        <SectionHeader
          eyebrow="Factions"
          title="Choose Your Allegiance"
          subtitle={
            <>
              Every faction fights for a different vision of Wiami&rsquo;s
              future. Pick your side and decide who controls the simulation.
            </>
          }
        />
      </section>

      <section id="factions" className={styles.section}>
        <FactionSelector />
      </section>

      <section id="economy" className={styles.gameplaySection}>
        <div className={styles.gameplayInner}>
          <SectionHeader
            eyebrow="Economy"
            title="A Real Economy"
            subtitle={
              <>
                Wilder World runs on a fully onchain economy with embedded
                utility. Earn through quests and challenges, harness in-world
                resources, trade digital assets and vote to shape Wiami&rsquo;s
                future.
              </>
            }
          />
          <LazyVideo src="/videos/wiami-token.mp4" poster="token" />
        </div>
      </section>

      <section id="news" className={styles.gameplaySection}>
        <div className={styles.gameplayInner}>
          <SectionHeader
            eyebrow="News"
            title="From The Wire"
            subtitle={
              <>
                The latest dispatches from Wiami. Drops, updates and
                announcements straight from the Wilder World zine.
              </>
            }
          />
          <NewsCarousel />
        </div>
      </section>
    </div>
  );
}
