import type { Metadata } from 'next';
import { PlaceholderPaper } from '../_components/PlaceholderPaper';
import { getPaper } from '../_components/papers';

const paper = getPaper('aura-harness')!;

export const metadata: Metadata = {
  title: `${paper.title} | Cypher Research`,
  description: paper.blurb,
};

export default function AuraHarnessPaper() {
  return <PlaceholderPaper paper={paper} />;
}
