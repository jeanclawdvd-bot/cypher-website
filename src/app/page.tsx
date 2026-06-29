import type { ComponentType } from 'react';
import { getCurrentCompany } from '@/lib/companies/current';
import type { CompanyKey } from '@/lib/companies/types';
import CypherLanding from '@/sites/cypher/Landing';
import ZodeLanding from '@/sites/zode/Landing';
import ZeroLanding from '@/sites/zero/Landing';
import WilderworldLanding from '@/sites/wilderworld/Landing';
import ZchainLanding from '@/sites/zchain/Landing';

const LANDINGS: Record<CompanyKey, ComponentType> = {
  cypher: CypherLanding,
  zode: ZodeLanding,
  zero: ZeroLanding,
  wilderworld: WilderworldLanding,
  zchain: ZchainLanding,
};

export default async function Home() {
  const company = await getCurrentCompany();
  const Landing = LANDINGS[company.key] ?? CypherLanding;
  return <Landing />;
}
