import styles from './page.module.css';
import { ImageCarousel } from '../_components/ImageCarousel';
import type { CarouselSlide } from '../_components/ImageCarousel';
import { FAQ } from '../_components/FAQ';
import type { FAQItem } from '../_components/FAQ';
import zeroOs1 from './assets/zero-os-1.png';

const heroSlides: CarouselSlide[] = [
  { src: zeroOs1.src, alt: 'ZERO OS interface' },
  { src: '/images/zero/Films_Ex_Machina_M_018.jpg', alt: 'ZERO OS concept art' },
];

const faqItems: FAQItem[] = [
  {
    question: 'What is ZERO OS?',
    answer:
      'ZERO OS is a modern operating system built for a world where computing is distributed, AI-driven, and constantly connected. It creates a single trusted environment that moves with you—wherever it runs.',
  },
  {
    question: 'How does ZERO OS handle security?',
    answer:
      'Security is built in at every layer using post-quantum cryptography. All files, communications, financial transactions, and identity are protected by default—not as an add-on or plugin.',
  },
  {
    question: 'What does "agent-first" mean?',
    answer:
      'In ZERO OS, AI agents are first-class citizens. You can launch secure agents that execute tasks, coordinate across systems, and operate autonomously—all within your cryptographic trust boundary.',
  },
  {
    question: 'Can I run ZERO OS on my existing hardware?',
    answer:
      'Yes. ZERO OS runs anywhere—in a web browser for instant access, inside a virtual machine for isolated workloads, or directly on bare metal for maximum performance. The experience and security guarantees remain identical across all deployment targets.',
  },
  {
    question: 'Do I have to replace my current OS?',
    answer:
      'No. ZERO OS can coexist with your existing setup. Start in the browser or a VM with no commitment. Expand as needed—your environment remains consistent across all modes.',
  },
  {
    question: 'Is ZERO OS open source?',
    answer:
      'Core components of the ZERO OS ecosystem are being developed in the open. The architecture emphasizes determinism, minimalism, and inspectability so behavior can be trusted—not assumed.',
  },
];

const featureSlides: CarouselSlide[] = [
  {
    title: 'Post-quantum cryptography.',
    description:
      'All security primitives resist future quantum attacks by default.',
  },
  {
    title: 'Verifiable state.',
    description:
      'Every state transition is deterministic, replayable, and auditable from an immutable commit log.',
  },
  {
    title: 'Agent-first execution.',
    description:
      'AI agents are native OS citizens that launch, coordinate, and operate within your trust boundary.',
  },
  {
    title: 'Delegated computing.',
    description:
      'Agents analyze, build, transact, and communicate on your behalf—shifting computing to autonomous delegation.',
  },
  {
    title: 'GPU-accelerated desktop.',
    description:
      'A WebGPU-powered compositor delivers fluid, high-fidelity visuals across all deployment targets.',
  },
  {
    title: 'Modular workspace.',
    description:
      'Compose your environment from panels, tiles, and overlays—arrange them however you work best.',
  },
  {
    title: 'Browser runtime.',
    description:
      'Access ZERO OS instantly from any modern web browser—no install required.',
  },
  {
    title: 'Portable identity.',
    description:
      'One cryptographic identity spans all your devices and environments.',
  },
];

export default function ZeroPage() {
  return (
    <div className={styles.page}>
      {/* 1. The Promise */}
      <header id="hero" className={styles.hero}>
        <p className={styles.eyebrow}>ZERO OS</p>
        <h1 className={styles.heading}>
          A Secure OS
          <br />
          <span className={styles.accent}>for an Agentic World.</span>
        </h1>
        <p className={styles.subtitle}>
        ZERO OS is a new operating system that unifies your devices, data, and AI into one secure environment that goes wherever you do.
        </p>
      </header>

      <div className={styles.heroCarousel}>
        <ImageCarousel slides={heroSlides} unoptimized />
      </div>

      <p className={styles.pillarsLead}>
        A new operating system designed for security, agentic automation, and portability.
      </p>

      <section className={styles.pillars}>
        <div className={styles.pillarCard}>
          <div className={styles.pillarIllustration}>
            <svg width="260" height="230" viewBox="0 0 260 230" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g stroke="rgba(255,255,255,0.32)" strokeWidth="0.75">
                <path d="M130 10 L230 65 L230 165 L130 220 L30 165 L30 65 Z" />
                <path d="M130 32 L214 78 L214 152 L130 198 L46 152 L46 78 Z" />
                <path d="M130 54 L198 91 L198 139 L130 176 L62 139 L62 91 Z" />
                <path d="M130 76 L182 104 L182 126 L130 154 L78 126 L78 104 Z" />
                <ellipse cx="130" cy="68" rx="40" ry="12" />
                <line x1="130" y1="10" x2="130" y2="220" strokeDasharray="3 5" />
              </g>
              <circle cx="130" cy="115" r="2.5" fill="rgba(255,255,255,0.45)" />
            </svg>
          </div>
          <p className={styles.pillarTitle}>Built for security</p>
          <p className={styles.pillarDesc}>
            ZERO OS is built from the ground up with post-quantum cryptography and verifiability at every layer.
          </p>
        </div>

        <div className={styles.pillarCard}>
          <div className={styles.pillarIllustration}>
            <svg width="260" height="230" viewBox="0 0 260 230" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g stroke="rgba(255,255,255,0.32)" strokeWidth="0.75">
                <path d="M80 75 L130 48 L180 75 L180 125 L130 152 L80 125 Z" />
                <path d="M130 48 L130 100" />
                <path d="M80 75 L130 100" />
                <path d="M180 75 L130 100" />
                <path d="M80 125 L130 100" />
                <path d="M180 125 L130 100" />

                <path d="M20 130 L70 103 L120 130 L120 180 L70 207 L20 180 Z" />
                <path d="M70 103 L70 155" />
                <path d="M20 130 L70 155" />
                <path d="M120 130 L70 155" />

                <path d="M140 130 L190 103 L240 130 L240 180 L190 207 L140 180 Z" />
                <path d="M190 103 L190 155" />
                <path d="M140 130 L190 155" />
                <path d="M240 130 L190 155" />
              </g>
              <circle cx="130" cy="48" r="2" fill="rgba(255,255,255,0.45)" />
              <circle cx="70" cy="103" r="2" fill="rgba(255,255,255,0.45)" />
              <circle cx="190" cy="103" r="2" fill="rgba(255,255,255,0.45)" />
            </svg>
          </div>
          <p className={styles.pillarTitle}>Powered by agents</p>
          <p className={styles.pillarDesc}>
            AI agents are first-class citizens that execute, coordinate, and operate autonomously within your trust boundary.
          </p>
        </div>

        <div className={styles.pillarCard}>
          <div className={styles.pillarIllustration}>
            <svg width="260" height="230" viewBox="0 0 260 230" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g stroke="rgba(255,255,255,0.32)" strokeWidth="0.75">
                <rect x="30" y="135" width="100" height="60" rx="1" />
                <rect x="42" y="123" width="100" height="60" rx="1" />
                <rect x="54" y="111" width="100" height="60" rx="1" />
                <rect x="66" y="99" width="100" height="60" rx="1" />
                <rect x="78" y="87" width="100" height="60" rx="1" />
                <rect x="90" y="75" width="100" height="60" rx="1" />
                <rect x="102" y="63" width="100" height="60" rx="1" />
                <rect x="114" y="51" width="100" height="60" rx="1" />
                <rect x="126" y="39" width="100" height="60" rx="1" />

                <line x1="30" y1="195" x2="226" y2="99" strokeDasharray="3 5" />
              </g>
            </svg>
          </div>
          <p className={styles.pillarTitle}>Designed for portability</p>
          <p className={styles.pillarDesc}>
            One environment moves with you across browser, VM, and bare metal without reconfiguration.
          </p>
        </div>
      </section>

      <section id="promise" className={styles.promise}>
        <p className={styles.promiseLead}>
          Computing today is fragmented. Your laptop, phone, cloud accounts, and
          AI tools all operate under different trust models.
        </p>
        <p className={styles.promiseBody}>
          ZERO OS unifies them into one cryptographically secure desktop where your
          identity, data, and automation live together—not scattered across
          platforms. You don&apos;t log into environments. You carry your
          environment with you.
        </p>
      </section>

      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>FEATURES</p>
          <h2 className={styles.heading}>
            Built Different.
            <span className={styles.accent}> By Design.</span>
          </h2>
        </div>
        <div className={styles.carouselBleed}>
          <ImageCarousel slides={featureSlides} />
        </div>
      </section>

      <section className={styles.divider} />

      {/* 2. What ZERO Lets You Do */}
      <section id="capabilities" className={styles.capabilities}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>CAPABILITIES</p>
          <h2 className={styles.heading}>
            One Desktop.
            <span className={styles.accent}> Many Tools.</span>
          </h2>
        </div>
        <div className={styles.capabilityList}>
          <div className={styles.capabilityItem}>
            <span className={styles.capabilityIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="16" height="12" rx="2" />
                <path d="M6 18h8" />
                <path d="M10 15v3" />
              </svg>
            </span>
            <div>
              <p className={styles.capabilityTitle}>
                Unified secure workspace
              </p>
              <p className={styles.capabilityDesc}>
                Use the same environment across all devices with consistent
                identity, policies, and security guarantees.
              </p>
            </div>
          </div>
          <div className={styles.capabilityItem}>
            <span className={styles.capabilityIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="10" cy="8" r="3" />
                <path d="M6 18c0-3 2-5 4-5s4 2 4 5" />
                <path d="M14 5l2-2m0 0l2 2m-2-2v4" />
              </svg>
            </span>
            <div>
              <p className={styles.capabilityTitle}>
                Private agent swarms
              </p>
              <p className={styles.capabilityDesc}>
                Launch intelligent agents that perform tasks on your behalf—inside
                your security boundary, not outside it.
              </p>
            </div>
          </div>
          <div className={styles.capabilityItem}>
            <span className={styles.capabilityIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 10h14" />
                <path d="M10 3v14" />
                <rect x="2" y="2" width="16" height="16" rx="3" />
              </svg>
            </span>
            <div>
              <p className={styles.capabilityTitle}>
                Seamless portability
              </p>
              <p className={styles.capabilityDesc}>
                Move between local, virtual, and web environments without
                losing context or reconfiguring anything.
              </p>
            </div>
          </div>
          <div className={styles.capabilityItem}>
            <span className={styles.capabilityIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 2l1.5 3.5L15 7l-3 2.5.5 3.5-2.5-1.5L7.5 13l.5-3.5L5 7l3.5-1.5z" />
              </svg>
            </span>
            <div>
              <p className={styles.capabilityTitle}>
                Secure by default
              </p>
              <p className={styles.capabilityDesc}>
                Files, communication, and transactions are secured
                automatically. No plugins, no extra tools.
              </p>
            </div>
          </div>
          <div className={styles.capabilityItem}>
            <span className={styles.capabilityIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 2v4m0 8v4M2 10h4m8 0h4" />
                <circle cx="10" cy="10" r="3" />
              </svg>
            </span>
            <div>
              <p className={styles.capabilityTitle}>
                Sovereign identity
              </p>
              <p className={styles.capabilityDesc}>
                Own your digital identity. One cryptographic identity spans all
                your devices—independent of platforms or providers.
              </p>
            </div>
          </div>
        </div>
        <p className={styles.capabilityCoda}>
          It feels like one system, not many tools stitched together.
        </p>
      </section>

      <section className={styles.divider} />

      {/* 3. Why You Can Trust It */}
      <section id="trust" className={styles.trust}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>SECURITY</p>
          <h2 className={styles.heading}>
            Secure by Default.
            <br />
            <span className={styles.accent}>Not by Configuration.</span>
          </h2>
        </div>
        <div className={styles.trustGrid}>
          <div className={styles.trustCard}>
            <p className={styles.trustLabel}>Post-Quantum Cryptography</p>
            <p className={styles.trustDesc}>
              Built on algorithms designed to remain secure even against future
              quantum attacks.
            </p>
          </div>
          <div className={styles.trustCard}>
            <p className={styles.trustLabel}>Verifiable Behavior</p>
            <p className={styles.trustDesc}>
              System state transitions are deterministic and auditable—not
              opaque background processes.
            </p>
          </div>
          <div className={styles.trustCard}>
            <p className={styles.trustLabel}>Minimal Trusted Core</p>
            <p className={styles.trustDesc}>
              A smaller core means fewer attack surfaces and a system you can
              actually inspect.
            </p>
          </div>
          <div className={styles.trustCard}>
            <p className={styles.trustLabel}>No Hidden Trust</p>
            <p className={styles.trustDesc}>
              No hidden data flows or third-party trust assumptions. Security is
              enforced structurally.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.divider} />

      {/* 4. Built to Be Verifiable */}
      <section id="open" className={styles.open}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>OPEN SOURCE</p>
          <h2 className={styles.heading}>
            Verifiable
            <span className={styles.accent}> and Open.</span>
          </h2>
        </div>
        <p className={styles.body}>
          ZERO OS is open and auditable by design. Its architecture emphasizes
          determinism, minimalism, and inspectability so behavior can be trusted—not
          assumed.
        </p>
      </section>

      <section className={styles.divider} />

      {/* 8. Get Started */}
      <section id="start" className={styles.start}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>GET STARTED</p>
          <h2 className={styles.heading}>
            Try ZERO OS.
          </h2>
        </div>
        <div className={styles.startActions}>
          <div className={styles.startAction}>
            <span className={styles.startDot} />
            <p>Launch it in a browser session</p>
          </div>
          <div className={styles.startAction}>
            <span className={styles.startDot} />
            <p>Run it locally in a VM</p>
          </div>
          <div className={styles.startAction}>
            <span className={styles.startDot} />
            <p>Explore the code and architecture</p>
          </div>
          <div className={styles.startAction}>
            <span className={styles.startDot} />
            <p>Deploy it progressively into your workflow</p>
          </div>
        </div>
        <p className={styles.startCoda}>
          No migration required. No lock-in assumed.
        </p>
      </section>

      <section className={styles.divider} />

      <section className={styles.closing}>
        <p className={styles.closingText}>
          ZERO OS is not just another operating system. It is a foundation for
          secure, agent-driven computing in a connected world.
        </p>
      </section>

      <section className={styles.divider} />

      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>FAQ</p>
          <h2 className={styles.heading}>
            Questions
            <br />
            <span className={styles.accent}>&amp; Answers.</span>
          </h2>
        </div>
        <FAQ title="" items={faqItems} />
      </section>
    </div>
  );
}
