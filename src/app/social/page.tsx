import { FAQ } from '@/components/FAQ';
import type { FAQItem } from '@/components/FAQ';
import {
  CardGrid,
  Principles,
  StackDiagram,
  ZeroHero,
  ZeroSection,
} from '@/sites/zero/Blocks';
import type { CardItem } from '@/sites/zero/Blocks';

const SOCIAL_FABRIC: CardItem[] = [
  {
    title: 'Onchain Membership',
    description: 'Members join by purchasing a community token.',
  },
  {
    title: 'Token Gated Spaces',
    description: 'Members communicate in a secure space.',
  },
  {
    title: 'Community Treasury',
    description: 'Capital grows and can be collectively stewarded.',
  },
];

const ATTENTION_FEATURES: CardItem[] = [
  {
    title: 'Permissionless Access',
    description: 'Worlds are private by default and require membership.',
  },
  {
    title: 'Sovereign Membership',
    description: 'World entry requires a one-time purchased blockchain membership.',
  },
  {
    title: 'Built-in Economy',
    description: '100% of revenue generated goes directly to World members.',
  },
  {
    title: 'DAO Governance',
    description: 'World members shape their future through decentralized governance.',
  },
];

const WORLD_FEATURES: CardItem[] = [
  {
    title: 'Token Gated Worlds',
    description: 'Worlds require a cryptographic token to enter.',
  },
  {
    title: 'Sovereign Membership',
    description: 'You own an irrevocable membership in each World.',
  },
  {
    title: 'Rich Media Posts',
    description: 'Photos, video, files, intelligent link previews and more.',
  },
  {
    title: 'End-to-End Encryption',
    description: 'E2E encryption, no centralised key storage.',
  },
  {
    title: 'Mention Tags',
    description: 'Tag users to get their attention or include them in chats.',
  },
  {
    title: 'Fun Reactions',
    description: 'Instantly express your emotion with one-tap emotive icons.',
  },
  {
    title: 'Member Management',
    description: 'Securely add/remove admins and members from groups.',
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is ZERO Worlds?',
    answer:
      'Worlds is ZERO\u2019s onchain social network. Each World is a community that is owned and governed by its members, with token-gated spaces, a shared treasury, and decentralized governance built in.',
  },
  {
    question: 'How do I join ZERO Worlds?',
    answer:
      'Get started at zos.zero.tech. You can join an existing World by purchasing its membership token, or create your own World in minutes and start inviting members.',
  },
  {
    question: 'How can I get a world domain?',
    answer:
      'World domains are minted on the ZNS protocol by staking MEOW token. Once staked, your World is automatically minted on the Ethereum blockchain and issued directly to your wallet.',
  },
  {
    question: 'What is a subdomain?',
    answer:
      'A subdomain is an identity minted inside an existing World (e.g. 0://world.name). World owners set the price, currency, and payment model for minting subdomains in their World.',
  },
  {
    question: 'How can I get a subdomain?',
    answer:
      'Join a World and mint a subdomain under its domain, based on the rules set by the World owner. The subdomain is issued onchain to your wallet and is yours permanently.',
  },
  {
    question: 'How can I learn more about Worlds, world domains, and the ZERO social platform?',
    answer:
      'Read the ZERO whitepaper and the protocol documentation, or follow ZINE for stories from across the network.',
  },
];

export default function SocialPage() {
  return (
    <div>
      <ZeroHero
        title="Enter new worlds."
        subtitle="An onchain social network for communities building the future."
      />

      <ZeroSection
        eyebrow="Community"
        title="A new dimension of community."
        subtitle="Unlock the power of onchain communities, public goods, and societal systems. Launch, scale & fund the future. Onchain communities — owned and governed by their members."
      />

      <ZeroSection
        eyebrow="Social Fabric"
        title="A new social fabric."
        subtitle="ZERO empowers communities to unlock human potential and shape our future."
      >
        <CardGrid items={SOCIAL_FABRIC} columns={3} />
      </ZeroSection>

      <ZeroSection
        eyebrow="Attention"
        title="Change your attention. Change the world."
        subtitle="Existing social media uses addictive algorithms to maximize time-on-site, resulting in the fragmented attention of an entire generation. Worlds offer a contextual, coherent, and aligned social experience."
      >
        <CardGrid items={ATTENTION_FEATURES} columns={4} />
      </ZeroSection>

      <ZeroSection
        eyebrow="Protocol Stack"
        title="Onchain by default."
        subtitle="Worlds is built on the ZERO protocol stack. It provides deep integration into common Web3 primitives that protect your data and the future of civilization."
      >
        <StackDiagram />
      </ZeroSection>

      <ZeroSection
        eyebrow="Features"
        title="Invite. Unite. Build."
        subtitle="Join in minutes. Invite friends. Easily set up a World and start inviting members. Reclaim your power. Begin coordinating the future."
      >
        <CardGrid items={WORLD_FEATURES} columns={3} />
      </ZeroSection>

      <ZeroSection
        eyebrow="Principles"
        title="Built with purpose."
        subtitle="Every feature of ZERO is designed to put control back in your hands."
      >
        <Principles />
      </ZeroSection>

      <ZeroSection eyebrow="FAQ" title="Questions?">
        <FAQ title="" items={FAQ_ITEMS} />
      </ZeroSection>
    </div>
  );
}
