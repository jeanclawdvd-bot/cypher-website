import Image from 'next/image';
import styles from './Landing.module.css';
import { FAQ } from '@/components/FAQ';
import type { FAQItem } from '@/components/FAQ';
import heroImg from './assets/brave_screenshot_linear.app.png';
import zodeIcon from './assets/zode-icon.png';

const faqItems: FAQItem[] = [
  {
    question: 'What is ZODE?',
    answer:
      'ZODE is a cloud-native compute environment where autonomous AI agents plan, write, test, and ship code on your behalf—continuously and securely within your infrastructure.',
  },
  {
    question: 'How do agents interact with my codebase?',
    answer:
      'Agents connect directly to your repositories and issue trackers. When a task is created or triaged, an agent examines the context, proposes changes, opens pull requests, and moves work through your pipeline—without manual intervention.',
  },
  {
    question: 'Is my code safe?',
    answer:
      'All compute runs within your trust boundary using ZERO OS cryptographic guarantees. Agent actions are deterministic, auditable, and sandboxed. Nothing leaves your security perimeter unless you permit it.',
  },
  {
    question: 'Can I control what agents do?',
    answer:
      'Yes. You define policies, approval gates, and scope boundaries. Agents operate within the constraints you set—whether that means autonomous execution or human-in-the-loop review on every change.',
  },
  {
    question: 'What tools and services does ZODE integrate with?',
    answer:
      'ZODE integrates with popular version control, CI/CD, issue tracking, and communication platforms out of the box. Custom integrations are supported through a composable plugin architecture.',
  },
  {
    question: 'Do I need to rewrite my workflow?',
    answer:
      'No. ZODE augments your existing development workflow. Start by assigning a single agent to triage issues—then expand to full autonomous pipelines as confidence grows.',
  },
];

const featureCards = [
  {
    title: 'Autonomous triage',
    description:
      'Agents classify, prioritize, and route issues the moment they appear—so nothing sits idle.',
  },
  {
    title: 'Code generation',
    description:
      'From issue to pull request in minutes. Agents explore the repo, implement changes, and open PRs ready for review.',
  },
  {
    title: 'Continuous testing',
    description:
      'Every change is validated against your test suite automatically before it reaches a human reviewer.',
  },
  {
    title: 'Policy-gated execution',
    description:
      'Define approval rules, scope limits, and rollback triggers. Agents respect your guardrails at every step.',
  },
];

export default function ZodeLanding() {
  return (
    <div className={styles.page}>
      <section id="hero" className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.appIcon}>
            <Image
              src={zodeIcon}
              alt="Zode"
              width={56}
              height={56}
              className={styles.appIconImg}
            />
          </div>
          <h1 className={styles.heroTitle}>ZODE</h1>
          <p className={styles.heroDesc}>
            Autonomous AI agents that triage, code, test, and ship—inside your infrastructure.
          </p>
          <div className={styles.heroCtas}>
            <a href="#" className={styles.ctaPrimary}>
              DEPLOY AGENTS
            </a>
            <a href="#" className={styles.ctaSecondary}>
              Read the Docs
            </a>
          </div>
        </div>
        <div className={styles.heroImageWrap}>
          <Image
            src={heroImg}
            alt="ZODE agentic workflow — AI agents triaging and resolving engineering tasks"
            priority
            placeholder="blur"
            className={styles.screenshot}
          />
        </div>
      </section>

      <section id="how-it-works" className={styles.section}>
        <div className={styles.howItWorks}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>HOW IT WORKS</p>
            <h2 className={styles.heading}>
              From Issue to
              <span className={styles.accent}> Deployed Code.</span>
            </h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>01</span>
              <div>
                <p className={styles.stepTitle}>Issue created</p>
                <p className={styles.stepDesc}>
                  A team member files a bug or feature request in your existing
                  tracker. ZODE picks it up instantly.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>02</span>
              <div>
                <p className={styles.stepTitle}>Agent examines context</p>
                <p className={styles.stepDesc}>
                  The agent explores the repository, understands the codebase
                  structure, and plans the implementation.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>03</span>
              <div>
                <p className={styles.stepTitle}>Code written &amp; tested</p>
                <p className={styles.stepDesc}>
                  Changes are implemented, validated against your test suite, and
                  packaged into a clean pull request.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>04</span>
              <div>
                <p className={styles.stepTitle}>Review &amp; ship</p>
                <p className={styles.stepDesc}>
                  Your team reviews the PR like any other contribution. Approve,
                  iterate, or let the agent refine further.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.section}>
        <div className={styles.features}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>FEATURES</p>
            <h2 className={styles.heading}>
              Built for
              <span className={styles.accent}> Velocity.</span>
            </h2>
          </div>
          <div className={styles.featureGrid}>
            {featureCards.map((card) => (
              <div key={card.title} className={styles.featureCard}>
                <p className={styles.featureTitle}>{card.title}</p>
                <p className={styles.featureDesc}>{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className={styles.section}>
        <div className={styles.security}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>SECURITY</p>
            <h2 className={styles.heading}>
              Your Code.
              <br />
              <span className={styles.accent}>Your Infrastructure.</span>
            </h2>
          </div>
          <p className={styles.body}>
            ZODE runs inside your trust boundary—not ours. Every agent action is
            sandboxed, deterministic, and auditable. Built on ZERO OS
            post-quantum cryptography, your intellectual property never leaves
            your security perimeter.
          </p>
          <div className={styles.securityPoints}>
            <div className={styles.securityPoint}>
              <span className={styles.securityDot} />
              <p>Sandboxed agent execution</p>
            </div>
            <div className={styles.securityPoint}>
              <span className={styles.securityDot} />
              <p>Deterministic, replayable actions</p>
            </div>
            <div className={styles.securityPoint}>
              <span className={styles.securityDot} />
              <p>Post-quantum cryptographic guarantees</p>
            </div>
            <div className={styles.securityPoint}>
              <span className={styles.securityDot} />
              <p>Zero data exfiltration by design</p>
            </div>
          </div>
        </div>
      </section>

      <section id="start" className={styles.section}>
        <div className={styles.start}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>GET STARTED</p>
            <h2 className={styles.heading}>Deploy Your First Agent.</h2>
          </div>
          <div className={styles.startActions}>
            <div className={styles.startAction}>
              <span className={styles.startDot} />
              <p>Connect your repository and issue tracker</p>
            </div>
            <div className={styles.startAction}>
              <span className={styles.startDot} />
              <p>Define agent policies and scope</p>
            </div>
            <div className={styles.startAction}>
              <span className={styles.startDot} />
              <p>Assign your first issue to an agent</p>
            </div>
            <div className={styles.startAction}>
              <span className={styles.startDot} />
              <p>Review the PR and ship</p>
            </div>
          </div>
          <p className={styles.startCoda}>
            No workflow migration. No vendor lock-in. Start in minutes.
          </p>
          <p className={styles.closingQuote}>
            ZODE turns your backlog into a pipeline—where agents handle the
            execution and engineers focus on what matters.
          </p>
        </div>
      </section>

      <section id="faq" className={styles.section}>
        <div className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 className={styles.heading}>
              Questions
              <br />
              <span className={styles.accent}>&amp; Answers.</span>
            </h2>
          </div>
          <FAQ title="" items={faqItems} />
        </div>
      </section>
    </div>
  );
}
