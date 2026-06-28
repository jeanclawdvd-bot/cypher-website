import type { Metadata } from 'next';
import { WhitepaperLayout } from '../_components/WhitepaperLayout';
import { WhitepaperBody } from '../_components/WhitepaperBody';
import { abstract, blocks, toc } from './content';

export const metadata: Metadata = {
  title: 'ZERO OS — A Social Operating System | Cypher Research',
  description:
    'The zer0 whitepaper: a peer-to-peer social operating system and a decentralized alternative to centralized internet platforms.',
};

export default function ZeroOsPaper() {
  return (
    <WhitepaperLayout
      eyebrow="Research / Whitepaper"
      title={
        <>
          zer0: A Social
          <br />
          Operating System
        </>
      }
      status="Whitepaper · v0.8"
      year="2020"
      lead={<p>{abstract}</p>}
      sections={toc}
    >
      <WhitepaperBody blocks={blocks} />
    </WhitepaperLayout>
  );
}
