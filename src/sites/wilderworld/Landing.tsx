'use client';

import { ArrowUpRight, Play } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import GameplayCard, { type GameplayCardProps } from './GameplayCard';
import styles from './Landing.module.css';

const EARLY_ACCESS_URL =
  'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US';
const TRAILER_URL = 'https://www.youtube.com/watch?v=7G8SwYp6gPo';

const GAMEPLAY_MODES: GameplayCardProps[] = [
  {
    title: 'Race',
    description: 'Tear through the streets in high-speed races across Wiami.',
    video: '/videos/wiami-race.mp4',
  },
  {
    title: 'Fight',
    description: 'Take the fight street-level in intense FPS battles.',
    video: '/videos/wiami-fight.mp4',
  },
  {
    title: 'Explore',
    description: 'Roam a massive open world driven by RPG missions.',
  },
  {
    title: 'Build',
    description: 'Own and build everything from land to vehicles.',
  },
];

export default function WilderworldLanding() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.frame}>
          <video
            className={styles.video}
            src="/videos/wiami-main.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
          <div className={styles.scrim} aria-hidden />
          <div className={styles.overlay}>
            <h1 className={styles.heading}>The Simulation.</h1>
            <div className={styles.actions}>
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
                vehicles&mdash;all within Wilder World.
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

      <section id="universe" className={styles.section}>
        <div className={styles.frame}>
          <img
            className={styles.bg}
            src="/images/wilder-world/wiami-forum.png"
            alt=""
            aria-hidden
          />
          <div className={styles.scrimDiagonal} aria-hidden />
          <div className={styles.overlay}>
            <h2 className={styles.heading}>Enter Wiami.</h2>
            <p className={styles.bodyText}>
              You start as nobody in the lower levels of Wiami, with no money, no
              weapons, and no allies. The FORUM, a rogue AI, rules the city
              through surveillance and calculation.
            </p>
            <p className={styles.bodyText}>
              To survive, you build your skills, form alliances, and learn to
              turn the city&rsquo;s systems against it. What begins as survival
              becomes the spark of a rebellion to take Wiami back.
            </p>
          </div>
        </div>
      </section>

      <section id="forum" className={styles.section}>
        <div className={styles.frame}>
          <img
            className={styles.bg}
            src="/images/wilder-world/the-forum.png"
            alt=""
            aria-hidden
          />
          <div className={styles.scrimDiagonal} aria-hidden />
          <div className={styles.overlay}>
            <h2 className={styles.heading}>The Forum.</h2>
            <p className={styles.bodyText}>
              Once built to keep Wiami safe, The FORUM now governs every street,
              transaction, and citizen through automated enforcement and
              predictive control.
            </p>
            <p className={styles.bodyText}>
              Its enforcers patrol the districts below and its sensors never
              sleep. Nothing moves through the city without its permission, and
              nothing is forgotten.
            </p>
          </div>
        </div>
      </section>

      <section id="trinity" className={styles.section}>
        <div className={styles.frame}>
          <img
            className={styles.bg}
            src="/images/wilder-world/trinity-program.png"
            alt=""
            aria-hidden
          />
          <div className={styles.scrimDiagonal} aria-hidden />
          <div className={styles.overlay}>
            <h2 className={styles.heading}>Trinity Program.</h2>
            <p className={styles.bodyText}>
              The Trinity Program forges raw recruits into something The FORUM
              never accounted for. Three disciplines &mdash; combat, code, and
              conviction &mdash; trained until they move as one.
            </p>
            <p className={styles.bodyText}>
              Master all three and you stop running from the city&rsquo;s
              systems and start turning them into weapons. This is where survivors
              become the spark of the rebellion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
