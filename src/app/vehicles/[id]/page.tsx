import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GhostlineDetail from '@/sites/wilderworld/GhostlineDetail';
import { GHOSTLINE_PASSES, getGhostlinePass } from '@/sites/wilderworld/ghostline';

export function generateStaticParams() {
  return GHOSTLINE_PASSES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pass = getGhostlinePass(id);
  return { title: pass ? `${pass.name} — Wilder World` : 'Ghostline — Wilder World' };
}

export default async function GhostlinePassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pass = getGhostlinePass(id);
  if (!pass) notFound();
  return <GhostlineDetail pass={pass} />;
}
