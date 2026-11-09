// Editorial facts checked 2026-11-08. Reward status is not a wallet entitlement.
const wiki = { label: 'Wilder Wiki · Genesis & Trinity', href: 'https://wiki.wilderworld.com/loyalty-and-rewards/genesis-and-trinity-rewards-program' };
const foundations = { label: 'Genesis rewards explained · June 2022', href: 'https://www.zine.live/diving-deeper-into-genesis-rewards/' };
const gens = { label: 'GENs release details · 2023', href: 'https://www.zine.live/a-new-genesis-collection-is-born-introducing-wilder-gens/' };
const devX = { label: 'Trinity program update · August 2024', href: 'https://www.zine.live/dev-log-x/' };
const land = { label: 'Wilder Wiki · The Island', href: 'https://wiki.wilderworld.com/nfts-and-industries/intro-to-industries-nft-collections-and-mints/land/the-island-genesis-land' };
const futureLand = { label: 'Land roadmap · Dev Log 11', href: 'https://www.zine.live/dev-log-11/' };
const avatar = { label: 'Trinity ZERO announcement · December 2025', href: 'https://www.zine.live/avatar-creator-2/' };
const season = { label: 'Trinity Season · September 2022', href: 'https://www.zine.live/trinity-season-recap/' };

export const trinityCommunityContent = {
  hero: { eyebrow: 'Community / Trinity', title: 'Keepers of the world.', description: 'For the Wilders who go deepest. Trinity brings together the collectors, creators and believers building a lasting connection to Wiami.', image: '/images/wilder-world/location_trinity_towers.png.webp', imageAlt: 'Trinity Island architecture in Wiami' },
  intro: { title: 'Three beginnings. One Trinity.', body: ['The Trinity program recognizes Wilder World’s most dedicated collectors through access, artifacts and new chapters of the simulation.', 'A Trinity starts with three qualifying Genesis assets from three different industries, held together in one wallet. Further qualifying industries extend that connection into a Trinity Chain. Each reward has its own snapshot and eligibility rules.'] },
  steps: [
    { title: 'Choose three industries', body: 'Collect a qualifying Genesis asset from each of three different Wilder industries. Three assets from the same industry do not form a Trinity.' },
    { title: 'Keep them together', body: 'Hold the qualifying assets in the same wallet. A Trinity is recognized through ownership; you do not combine or destroy the assets to form one.' },
    { title: 'Follow each chapter', body: 'Check the specific reward announcement before a snapshot. Eligible collections, chain rules and claim windows can differ between releases.' },
  ],
  chains: {
    title: 'Build a Trinity Chain.',
    body: 'A Trinity begins with three qualifying Genesis industries. Add an asset from another eligible industry to extend that same chain. Its level reflects the number of qualifying industry positions it contains.',
    levels: [
      { count: 3, title: 'Trinity', detail: 'Three qualifying industries' },
      { count: 4, title: 'Level 4', detail: 'Add a fourth industry' },
      { count: 5, title: 'Level 5', detail: 'Add a fifth industry' },
      { count: 6, title: 'Level 6', detail: 'Add a sixth industry' },
    ],
    caption: 'Illustrative progression. Each reward defines eligible industries and the maximum chain length.',
    notes: [
      { title: 'Depth and quantity', body: 'Two separate three-asset Trinities do not automatically make a Level 6 chain. More assets from an industry already represented do not increase its level.' },
      { title: 'A Wild Card connection', body: 'Qualifying Wild Cards can fill missing positions within the allowed chain limit. They do not grant the separate rewards reserved for an industry’s Genesis holders.' },
      { title: 'How rewards can differ', body: 'The August 2024 Land snapshot recognized the longest eligible chains automatically. Longer chains had a greater chance of rarer Land. Future rewards can use different rules.' },
    ],
    source: foundations,
    landSource: futureLand,
  },
  industries: [
    { title: 'Wheels', body: 'Genesis vehicles', href: '/store/market?c=wilderworld' },
    { title: 'Moto', body: 'Genesis motorcycles', href: '/store/market?c=wilder-moto' },
    { title: 'Beasts', body: 'Genesis Wolves', href: '/store/market?c=wilderbeasts-wolf' },
    { title: 'Crafts', body: 'Genesis flying craft', href: '/store/market?c=wilder-crafts-genesis' },
    { title: 'Cribs', body: 'Genesis residences', href: '/store/market?c=wilder-cribs-genesis' },
    { title: 'Kicks', body: 'AIR WILD Season 0', href: '/store/market?c=aws0' },
    { title: 'PALs', body: 'GENs; reward-specific eligibility', href: '/store/market?c=wilderpals-gen' },
    { title: 'Land', body: 'The Island; check future drop rules', href: '/store/market?c=wilder-land-the-island' },
    { title: 'Wild Cards', body: 'A substitute for a missing qualifying Genesis asset, subject to the reward’s rules.' },
  ],
  rewards: [
    { title: 'A GEN by your side', body: 'The 2023 GEN release included a claim for eligible Trinity Keepers captured in the March 1 snapshot. That historical claim window has closed.', status: 'Past claim', dateLabel: '2023', image: '/images/wilder-world/industries_gens_hero.jpg.webp', imageAlt: 'Original Wilder GEN companion artwork', source: gens },
    { title: 'The Trinity Totem', body: 'Eligible wallets received one digital Totem per Trinity from the March 1, 2023 snapshot. The airdrop was reported in August 2024. Later Trinities were not eligible.', status: 'Distributed', dateLabel: 'August 2024', image: '/images/marketplace/totems/trinity-totem-official.jpg', source: devX },
    { title: 'A place on The Island', body: 'Genesis Land Titles were distributed on October 31, 2024, following the August 21 snapshot. The collection contains 4,444 plots. GENs were excluded from this specific reward; longer chains affected allocation rarity.', status: 'Distributed', dateLabel: 'October 2024', image: '/images/wilder-world/industries_land_hero.png.webp', source: land },
  ],
  upcoming: [
    { title: 'Trinity ZERO', body: 'An exclusive assembled Avatar suit with a standing display case for a Crib or apartment. The announcement describes one Avatar per qualifying Trinity. Final snapshot and chain treatment await release details; the earlier 2026 target is not a confirmed claim date.', status: 'Announced · release unverified', source: avatar },
    { title: 'The next land chapters', body: 'Mainland and No Man’s Land rewards have been announced for qualifying Keepers. Each has separate eligibility and delivery conditions. These are future allocations, not additional claims on the completed Island snapshot.', status: 'Announced · details pending', source: futureLand },
    { title: 'Trinity Islands', body: 'The original program announced special access across the Trinity Islands archipelago. Current access and supported experiences depend on the released game build.', status: 'Announced access', source: season },
    { title: 'From digital to physical', body: 'A physical sterling-silver Totem opportunity was announced for the original eligible cohort, with material costs applying. Forging availability and fulfillment are not confirmed here.', status: 'Announced · availability unverified', source: devX },
  ],
  faq: [
    { question: 'What makes a Trinity Chain?', answer: 'Add qualifying assets from further, distinct industries in the same wallet. A longer chain can change a reward’s allocation rules. Chain length and the number of separate Trinities are different measures; always read the rules for that snapshot.' },
    { question: 'Does any item in the store count?', answer: 'No. Genesis eligibility is collection-specific. New clothing, rims, furniture and Frank Wilder totems do not automatically qualify. The Trinity Totem is a separate historical reward, not a substitute for forming a Trinity.' },
    { question: 'Do GENs and Wild Cards count?', answer: 'GENs have reward-specific eligibility and did not count for the Island Genesis Land snapshot. The consolidated Trinity Wild Card collection can substitute for a missing Genesis asset under the program rules. Confirm the exact collection and applicable snapshot before buying.' },
    { question: 'Does forming a Trinity today unlock past rewards?', answer: 'No. Previous distributions were tied to historical snapshots. Buying the underlying assets later does not recreate an expired claim or a past wallet entitlement.' },
    { question: 'Is a Trinity suit the same as Trinity ZERO?', answer: 'Trinity suits are the armor worn by characters in the simulation. Trinity ZERO is the separately announced Keeper reward. Owning a suit or a Pack item does not itself establish Keeper status.' },
  ],
  sources: [wiki, foundations, gens, devX, land, futureLand, avatar, season],
} as const;
