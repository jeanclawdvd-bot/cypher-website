import ImageAccordion, { type AccordionItem } from '@/components/ImageAccordion';

const PILLARS: AccordionItem[] = [
  {
    id: 'fight',
    title: 'Fight',
    description:
      'Drop into PvPvE city runs, clear Breaches, and fight your way to extraction.',
    image: '/images/wilder-world/fight_moonboots_encouter.png',
    href: '#fight',
  },
  {
    id: 'race',
    title: 'Race',
    description:
      "Tear through Wiami's streets in high-speed, high-stakes races.",
    image: '/images/wilder-world/race_gameplay.png',
    href: '#race',
  },
  {
    id: 'explore',
    title: 'Explore',
    description:
      'Roam a massive open world of RPG missions and discovery.',
    image: '/images/wilder-world/explore.png',
    href: '#explore',
  },
  {
    id: 'build',
    title: 'Build',
    description: 'Own and build everything from land to vehicles.',
    image: '/images/wilder-world/mining.png',
    href: '#build',
  },
];

export default function GameplayPillars() {
  return <ImageAccordion items={PILLARS} />;
}
