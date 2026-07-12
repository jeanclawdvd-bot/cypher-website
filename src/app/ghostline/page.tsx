import type { Metadata } from 'next';
import GhostlineStore from '@/sites/wilderworld/GhostlineStore';

export const metadata: Metadata = {
  title: 'Ghostline — Wilder World',
  description: 'Two cars. One compound. Choose your way into Wiami.',
};

export default function GhostlinePage() {
  return <GhostlineStore />;
}
