import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { getCurrentCompany } from '@/lib/companies/current';
import { ZodePrivacy, zodePrivacyMetadata } from '@/sites/zode/pages/ZodePrivacy';
import { getPrivacyContent } from './content';

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCurrentCompany();
  if (company.key === 'zode') return zodePrivacyMetadata;
  const content = getPrivacyContent(company.key);
  return {
    title: content.metaTitle,
    description: content.metaDescription,
  };
}

export default async function PrivacyPage() {
  const company = await getCurrentCompany();
  // Zode keeps its own legal document styling from the standalone site.
  if (company.key === 'zode') {
    return <ZodePrivacy />;
  }
  const content = getPrivacyContent(company.key);
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
