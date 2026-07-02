import { FAQ } from '@/components/FAQ';
import type { FAQItem } from '@/components/FAQ';
import { CardGrid, Prose, ZeroHero, ZeroSection } from '@/sites/zero/Blocks';
import type { CardItem } from '@/sites/zero/Blocks';

const FREEDOM_CARDS: CardItem[] = [
  {
    title: 'Identity Card',
    description: 'Your ZERO ID serves as your unique identifier on the decentralized Internet.',
  },
  {
    title: 'Phone Number',
    description: 'Anyone can call, message or initiate a video chat using your unique ZERO ID.',
  },
  {
    title: 'Bank Account',
    description: 'Anyone can quickly send you money in the form of tokens on the blockchain.',
  },
];

const ZNS_FEATURES: CardItem[] = [
  {
    title: 'Unique and Permanent',
    description: 'Your ID is completely unique. Like you, there can only ever be one.',
  },
  {
    title: 'Human Friendly',
    description: 'It\u2019s designed to be user-friendly, making it simple to read, share, and recall.',
  },
  {
    title: 'Sovereign Membership',
    description: 'World entry requires a one-time purchased blockchain membership.',
  },
  {
    title: 'No Renewals',
    description: 'Once you own your ZERO ID, there are no renewal fees. You own it forever.',
  },
];

const WORLD_PARAGRAPHS: string[] = [
  'Once minted on the blockchain, your ZERO ID lives within a unique space called a ZERO World. Different Worlds have different rules, can set different prices and charge in different currencies.',
  'Similar to a country, you can think of a ZERO ID as a decentralized digital passport, that is bound to a particular country.',
  'People can easily create their own Worlds. Owning a World enables you or your community to mint an identity in your World, based on your own defined price, currency and payment model.',
  'New Worlds are created by staking MEOW\u2014Minds Entering Other Worlds\u2014token. Once staked, your World is automatically minted on the Ethereum blockchain and ZNS protocol.',
  'You can destroy your World at anytime and recover your original MEOW (less a small protocol fee).',
];

const ID_CAPABILITIES: CardItem[] = [
  {
    title: 'Human Verification',
    description: 'Seamless proof-of-person, safeguarding genuine interactions.',
  },
  {
    title: 'Device Authentication',
    description: 'Robust sign-in with trusted devices to ensure secure user access.',
  },
  {
    title: 'Digital Asset Identity',
    description: 'Unique identifiers for your assets, securing digital ownership and transfer.',
  },
  {
    title: 'Onchain Address Space',
    description: 'Expansive and secure blockchain real estate for your transactional needs.',
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is a ZERO ID?',
    answer:
      'A ZERO ID is a memorable, one-of-a-kind decentralized identity that you own. It exists as cryptographic data on the ZNS protocol and Ethereum blockchain, and once you own it, no one can ever take it away from you.',
  },
  {
    question: 'How can I get a ZERO ID?',
    answer:
      'Mint one inside a ZERO World, based on the price, currency, and payment model set by that World, or create your own World by staking MEOW token and mint identities under it.',
  },
  {
    question: 'Where can I use my ZERO ID?',
    answer:
      'Across the ZERO ecosystem and the decentralized Internet: it is your handle in ZERO Messenger and Worlds, an address anyone can call or message, and an account anyone can send tokens to.',
  },
  {
    question: 'What is the difference between ZERO ID, Worlds, and ZNS?',
    answer:
      'ZNS is the underlying naming, indexing, and routing protocol. A World is a unique onchain space with its own rules and community. A ZERO ID is your personal identity, minted within a World on the ZNS protocol.',
  },
  {
    question: 'Are world domains the only type of ZERO IDs?',
    answer:
      'No. World domains are root-level identities, but Worlds can also mint subdomains \u2014 identities issued under a World\u2019s domain \u2014 based on their own pricing and rules.',
  },
  {
    question: 'How can I learn more about ZERO ID and ZNS?',
    answer:
      'Read the ZNS protocol documentation and the ZERO whitepaper, or explore the audited, open-source ZNS contracts.',
  },
];

export default function IdPage() {
  return (
    <div>
      <ZeroHero title="Identity you own." subtitle="Decentralized identity owned by you." />

      <ZeroSection
        eyebrow="Freedom"
        title="Reclaim your freedom."
        subtitle="Your ZERO ID is both memorable and one-of-a-kind. Once you own it, no one can ever take it away from you. It exists as cryptographic data on the ZNS protocol and Ethereum blockchain."
      >
        <CardGrid items={FREEDOM_CARDS} columns={3} />
      </ZeroSection>

      <ZeroSection
        eyebrow="ZNS"
        title="More than just an ID."
        subtitle="ZERO ID is built on the ZNS protocol — a global indexing and routing network for decentralized applications, websites, and protocols. ZNS is sovereign, secure, decentralized and censorship-resistant."
      >
        <CardGrid items={ZNS_FEATURES} columns={4} />
      </ZeroSection>

      <ZeroSection eyebrow="Worlds" title="Build infinite worlds.">
        <Prose paragraphs={WORLD_PARAGRAPHS} />
        <CardGrid items={ID_CAPABILITIES} columns={4} />
      </ZeroSection>

      <ZeroSection eyebrow="FAQ" title="Questions?">
        <FAQ title="" items={FAQ_ITEMS} />
      </ZeroSection>
    </div>
  );
}
