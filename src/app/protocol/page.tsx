import {
  CardGrid,
  Prose,
  StackDiagram,
  ZeroHero,
  ZeroSection,
} from '@/sites/zero/Blocks';
import type { CardItem } from '@/sites/zero/Blocks';

const SYSTEMS: CardItem[] = [
  {
    title: 'Z NS',
    description:
      'A smart contract protocol that enables decentralized global unique identity, indexing, and routing.',
  },
  {
    title: 'Z XP',
    description:
      'A smart contract protocol for designing novel game, reputation, governance and incentive landscapes.',
  },
  {
    title: 'Z DAO',
    description:
      'A smart contract protocol for launching, managing, and participating in a network of DAOs.',
  },
  {
    title: 'ZODE',
    description:
      'A distributed network protocol for incentivizing the operation of ZERO computing services.',
  },
];

const XP_USE_CASES: CardItem[] = [
  {
    title: 'Onchain Tournaments',
    description:
      'Competitive events with cryptographically verifiable scoring, ranking, and rewards.',
  },
  {
    title: 'Role Playing Games',
    description:
      'Progression, levels, and reputation systems that live onchain and travel between games.',
  },
  {
    title: 'Decentralized Social Credit',
    description:
      'Community-defined reputation landscapes that assign verifiable voting power to onchain entities.',
  },
];

export default function ProtocolPage() {
  return (
    <div>
      <ZeroHero
        title="The ZERO protocol."
        subtitle="A sovereign, decentralized social operating system — 100% owned, operated, and governed by its Citizens."
      />

      <ZeroSection eyebrow="Overview" id="overview" title="A social operating system.">
        <Prose
          paragraphs={[
            'ZERO is a social operating system that protects your sovereign digital rights. It is 100% owned, operated and governed by its Citizens. A ZERO Citizen is a wallet that holds a sovereign domain on the ZERO Name Service protocol.',
            'ZERO is an alternative to legacy messaging apps, social networks and financial institutions. You can use it to start anything from a group chat with friends, to your own community, guild, organization or network-state.',
            'ZERO is built using 4 interoperable systems:',
          ]}
        />
        <CardGrid items={SYSTEMS} columns={4} />
        <StackDiagram />
      </ZeroSection>

      <ZeroSection eyebrow="Applications" id="applications" title="New social systems.">
        <Prose
          paragraphs={[
            'ZERO enables the creation of new social media systems that remove the reliance on advertising and align incentives between stakeholders — content creators, consumers and developers. Censorship can be eliminated at the level of code and infrastructure by distributing data between ZODES.',
            'Information can be contextualized based on shared-context, affinity, and reputation, using systems such as Z NS, Z XP and Z DAO. Disinformation can be reduced through the introduction of novel consensus, reputation and coordination systems. Identity mechanisms can be constructed to cryptographically verify the origin, creator and legitimacy of digital content.',
            'The ZERO protocol provides the core building blocks and primitives for coordination at societal scale, whether digital or otherwise. Tokens can serve as units of account and mediums of exchange, DAOs can serve as societal governance systems to coordinate critical decision making, Z XP can aid in the creation of advanced reputation systems, and Z NS can serve as a general-purpose registry for the ownership of scarce physical resources and virtual network space.',
          ]}
        />
      </ZeroSection>

      <ZeroSection eyebrow="Z NS" id="z-ns" title="ZERO Name Service.">
        <Prose
          paragraphs={[
            'ZERO ID (Z ID) is powered by the ZERO Name Service (Z NS) protocol. Z ID is a human-readable identity and routing protocol that can be deployed to any distributed system or blockchain.',
            'Z NS can be thought of as a meta-chain that sits a layer above any single blockchain or distributed system connected to the internet. It abstracts the underlying technical details and address space of any blockchain implementation, in order to create a simple human-readable interface (similar to \u2018http://\u2019). The root and reference implementation of Z NS is deployed to Ethereum, with the intention to support more chains in the future.',
            'The Registry within Z NS functions as a comprehensive repository, cataloging the entirety of domains that exist within the Z NS domain-tree. To mint a World Domain, users stake a fixed amount of MEOW (Minds Entering Other Worlds) token \u2014 the native protocol token for ZERO. Upon depositing MEOW into the staking contract, a new ZERO World is minted at \u20180://\u2026\u2019 and issued directly to the depositor\u2019s wallet.',
          ]}
        />
      </ZeroSection>

      <ZeroSection eyebrow="Z DAO" id="z-dao" title="A network of DAOs.">
        <Prose
          paragraphs={[
            'Z DAO is a flexible and modular protocol to easily create, operate, extend and scale DAOs (Decentralized Autonomous Organizations) on EVM-compatible chains. The vision of Z DAO is to create large-scale coordination networks with millions of interoperable DAOs, which share resources, members and code modules to achieve collective objectives.',
            'Z DAO is powerful but also simple, enabling deep configuration or out of the box use. Individuals can create and configure a DAO with limited technical experience in a matter of minutes. Similar to a modern App Store, developers and members can easily extend DAOs with autonomous modules called Neurons \u2014 bits of code that manage rules, processes and functions within the DAO.',
            'Within ZERO, every DAO points to a unique Z NA on the Z NS protocol and is interoperable with one another. The integration of Z DAO and Z NS enables the construction of a logical index for all registered Z DAOs, enhancing DAO discovery, search and coordination.',
          ]}
        />
      </ZeroSection>

      <ZeroSection eyebrow="Z XP" id="z-xp" title="Experience protocol.">
        <Prose
          paragraphs={[
            'Zero Experience Protocol (Z XP) enables the fast and flexible development of onchain game, reputation and reward systems.',
            'Z XP enables protocols to construct novel token reputation systems, based on any type of programmed set of mechanics, in order to assign cryptographically verifiable voting power to an onchain entity (such as a person, program or DAO). Voting power can be utilized in onchain governance \u2014 or anything really.',
            'Z XP provides the core building blocks to build alternative governance systems. It makes building these types of incentive schemes simple and interoperable between games, networks, and applications, and is interoperable with existing ZERO protocols including Z NS and Z DAO.',
          ]}
        />
        <CardGrid items={XP_USE_CASES} columns={3} />
      </ZeroSection>

      <ZeroSection eyebrow="ZODE" id="zode" title="A network you power.">
        <Prose
          paragraphs={[
            'ZODE is a distributed network protocol for incentivizing the operation of ZERO computing services. ZERO is powered by a distributed network of computers called ZODES, which host encrypted data and secure the network.',
            'As a Citizen, you can run your own ZODE to secure and decentralize ZERO \u2014 powering the network, protecting the future of your data, and receiving rewards for your contributions.',
          ]}
        />
      </ZeroSection>
    </div>
  );
}
