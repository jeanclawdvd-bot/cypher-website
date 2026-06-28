import type { Metadata } from 'next';
import { PlaceholderPaper } from '../_components/PlaceholderPaper';
import { getPaper } from '../_components/papers';

const paper = getPaper('zns')!;

export const metadata: Metadata = {
  title: `${paper.title} | Cypher Research`,
  description: paper.blurb,
};

export default function ZnsPaper() {
  return <PlaceholderPaper paper={paper} />;
}
