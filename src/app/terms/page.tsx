import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { getCurrentCompany } from '@/lib/companies/current';
import { ZodeTerms, zodeTermsMetadata } from '@/sites/zode/pages/ZodeTerms';
import { getTermsContent } from './content';

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCurrentCompany();
  if (company.key === 'zode') return zodeTermsMetadata;
  const content = getTermsContent(company.key);
  return {
    title: content.metaTitle,
    description: content.metaDescription,
  };
}

export default async function TermsPage() {
  const company = await getCurrentCompany();
  // Zode keeps its own legal document styling from the standalone site.
  if (company.key === 'zode') {
    return <ZodeTerms />;
  }
  const content = getTermsContent(company.key);
  return (
    <LegalDocument
      title={content.title}
      description={content.description}
      effectiveDate={content.effectiveDate}
      intro={content.intro}
      sections={content.sections}
      contactBody={content.contactBody}
      email={content.email}
    />
  );
}
