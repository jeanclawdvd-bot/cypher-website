import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GhostlineCheckout from '@/sites/wilderworld/GhostlineCheckout';
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
  return { title: pass ? `Checkout — ${pass.name}` : 'Checkout — Ghostline' };
}

export default async function GhostlineCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pass = getGhostlinePass(id);
  if (!pass) notFound();
  return <GhostlineCheckout pass={pass} />;
}
