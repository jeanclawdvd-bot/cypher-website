import { FAQ } from '@/components/FAQ';
import type { FAQItem } from '@/components/FAQ';
import {
  BadgeRow,
  CardGrid,
  Principles,
  ZeroHero,
  ZeroSection,
} from '@/sites/zero/Blocks';
import type { CardItem } from '@/sites/zero/Blocks';

const FEATURES: CardItem[] = [
  {
    title: 'Quick Onboarding',
    description: 'Easy sign-up. Invite your tribe. Support for Web3 and Web2 authentication.',
  },
  {
    title: 'End-to-End Encryption',
    description: 'Messages are encrypted with your private key; no keys are stored on servers.',
  },
  {
    title: 'Permissionless Access',
    description: 'No phone number or personal data required to create an account.',
  },
  {
    title: 'Rich-Media Support',
    description: 'Send emojis, GIFs, files, audio, images, and video in every conversation.',
  },
  {
    title: 'Expressive Messages',
    description: 'Mentions. Link Previews. Pinned Messages. Reply-to-Messages. Reactions.',
  },
  {
    title: 'Personalised Themes',
    description: 'Customize your chat experience with themes that reflect your style.',
  },
  {
    title: 'Instant Device Synchronization',
    description: 'Public Supergroups. Private Channels. Direct Messages. Stay connected always.',
  },
  {
    title: 'Custom Notifications',
    description: 'Customizable desktop and mobile notifications — including Zen Mode.',
  },
  {
    title: 'Cross-Platform Compatibility',
    description: 'Browsers, Mac, Windows, Linux, iOS & Android. Access from anywhere.',
  },
];

const AVA_FEATURES: CardItem[] = [
  {
    title: 'Owned by You',
    description: 'AVA is sovereign, ensures no surveillance, and is open-sourced.',
  },
  {
    title: 'General Purpose AI',
    description: 'Pose any question to AVA, covering a wide range of subjects & interests.',
  },
  {
    title: 'Adaptive Learning',
    description: 'AVA will understand your preferences to streamline your workflows.',
  },
  {
    title: 'Smooth Integration',
    description: 'AVA can seamlessly link with top apps/services to boost utility.',
  },
];

const ZODE_FEATURES: CardItem[] = [
  {
    title: 'Power the Network',
    description: 'Join a community driving global decentralization.',
  },
  {
    title: 'Protect the Future',
    description: 'Ensure the utmost protection of your data.',
  },
  {
    title: 'Get Rewarded',
    description: 'Receive generous rewards for your contributions.',
  },
];

const CONSCIOUS_FEATURES: CardItem[] = [
  { title: 'No Advertising' },
  { title: 'No Surveillance' },
  { title: 'No Data Collection' },
  { title: 'Spam Protection' },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is ZERO Messenger?',
    answer:
      'ZERO Messenger is a private, sovereign, decentralized messaging app. Conversations are end-to-end encrypted, hosted on a distributed network of ZODES, and free of ads, surveillance, and data collection.',
  },
  {
    question: 'How can I join ZERO Messenger?',
    answer:
      'Sign up on the web at zos.zero.tech, or download the app for iOS, Android, Windows, Mac, or Linux. Onboarding takes minutes with support for both Web3 and Web2 authentication.',
  },
  {
    question: 'Do I need an Ethereum wallet to use the app?',
    answer:
      'No. You can sign up with a standard Web2 account. An Ethereum wallet unlocks additional Web3 features such as wallet login, token-gated chats, and identity verification with ZERO ID.',
  },
  {
    question: 'How does ZERO ID interact with ZERO Messenger?',
    answer:
      'Your ZERO ID is your unique, self-owned identifier on the decentralized Internet. Inside Messenger it acts as your handle — anyone can message, call, or send you tokens using your ZERO ID, with no phone number required.',
  },
  {
    question: 'Can I invite others to join the app?',
    answer:
      'Yes. You can invite friends directly from the app and easily set up channels, groups, and direct messages to bring your community with you.',
  },
  {
    question: 'How can I learn more about ZERO Messenger?',
    answer:
      'Read the ZERO whitepaper, follow ZINE for news from across the network, or explore the open-source code — ZERO is 100% free and open-source under the MIT license.',
  },
];

export default function MessengerPage() {
  return (
    <div>
      <ZeroHero
        title="A messenger from the future."
        subtitle="Built to protect your inalienable digital rights."
      />

      <ZeroSection
        eyebrow="Decentralized Tech"
        title="Built with decentralized tech."
        subtitle="ZERO runs on open, decentralized infrastructure from the ground up."
      >
        <BadgeRow items={['Ethereum', 'Matrix', 'ZERO', 'Arweave', 'The Graph']} />
      </ZeroSection>

      <ZeroSection
        eyebrow="Principles"
        title="Built with purpose."
        subtitle="Every feature of ZERO is designed to put control back in your hands."
      >
        <Principles />
      </ZeroSection>

      <ZeroSection
        eyebrow="Design"
        title="Simple and elegant."
        subtitle="ZERO is designed with unrelenting elegance and precision. A familiar, yet radical messaging experience that is free for everyone."
      >
        <BadgeRow
          label="Available on"
          items={['Windows', 'Apple', 'Linux', 'iOS', 'Android']}
        />
      </ZeroSection>

      <ZeroSection
        eyebrow="Rewards"
        title="Earn from everything."
        subtitle="Every action, every idea, every contribution turns into rewards."
      />

      <ZeroSection
        eyebrow="Conscious Technology"
        title="Conscious technology."
        subtitle="A fresh alternative to Big Tech. It is time to declare our collective digital independence."
      >
        <CardGrid items={CONSCIOUS_FEATURES} columns={4} />
      </ZeroSection>

      <ZeroSection
        eyebrow="Features"
        title="Minimalism, not maximalism."
        subtitle="Join in minutes. Invite friends. Easily set up channels and groups. Coordinate the future."
      >
        <CardGrid items={FEATURES} columns={3} />
      </ZeroSection>

      <ZeroSection
        eyebrow="Calling"
        title="Your new phone."
        subtitle="Crisp voice and video calling without the need for a phone number or centralized ID."
      />

      <ZeroSection
        eyebrow="AVA"
        title="AI you own."
        subtitle="ZERO integrates a general-purpose Advanced Virtual Assistant based on state-of-the-art AI models. Unlike closed AI, which tracks and stores your sensitive data, AVA is 100% private, open-source, and controlled by you."
      >
        <CardGrid items={AVA_FEATURES} columns={4} />
      </ZeroSection>

      <ZeroSection
        eyebrow="ZODES"
        title="A network you power."
        subtitle="ZERO is powered by a distributed network of computers called ZODES. As a Citizen, you can run your own ZODE to secure and decentralize ZERO."
      >
        <CardGrid items={ZODE_FEATURES} columns={3} />
      </ZeroSection>

      <ZeroSection
        eyebrow="Bridges"
        title="Communicate across dimensions."
        subtitle="Bridge your existing communities and coordinate the future from one place."
      >
        <BadgeRow items={['Slack', 'Matrix', 'Discord', 'Telegram']} />
      </ZeroSection>

      <ZeroSection eyebrow="FAQ" title="Questions?">
        <FAQ title="" items={FAQ_ITEMS} />
      </ZeroSection>
    </div>
  );
}
