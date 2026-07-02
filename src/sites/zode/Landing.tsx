import type { CSSProperties } from 'react';
import { ProductHero } from '@/sites/zode/components/ProductHero';
import { ProductCapabilities } from '@/sites/zode/components/ProductCapabilities';
import { ProductStats } from '@/sites/zode/components/ProductStats';
import { ProductExplorer } from '@/sites/zode/components/ProductExplorer';
import { ProductFeature } from '@/sites/zode/components/ProductFeature';
import { ProductCards } from '@/sites/zode/components/ProductCards';
import { ProductTech } from '@/sites/zode/components/ProductTech';
import { ProductScale } from '@/sites/zode/components/ProductScale';
import { ProductSpecs } from '@/sites/zode/components/ProductSpecs';
import { ProductCTA } from '@/sites/zode/components/ProductCTA';

// Sun-toned accent, scoped to the product page only. `display: contents`
// keeps layout untouched while the overridden token cascades to children.
const productAccent = {
  '--color-accent': '#ffd6a0',
  display: 'contents',
} as CSSProperties;

export default function ZodeLanding() {
  return (
    <div style={productAccent}>
      <ProductHero />
      <ProductStats />
      <ProductExplorer />
      <ProductFeature />
      <ProductCards />
      <ProductCapabilities />
      <ProductTech />
      <ProductScale />
      <ProductSpecs />
      <ProductCTA />
    </div>
  );
}
