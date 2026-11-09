import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { featuredMaterial, findMarketProduct } from './catalog';
import rugMedia from './rug-product-media.json';
import overrides from './rug-material-overrides.json';

describe('source-patterned apartment rug', () => {
  it('leads both browse and product gallery with the authored game material', () => {
    const rug=findMarketProduct(rugMedia.productId)!;
    expect(rug.image).toBe(rugMedia.image);
    expect(rug.gallery).toEqual(rugMedia.gallery);
    expect(rug.variants[0].id).toBe(rugMedia.defaultVariantId);
    expect(rug.variants[0].name).toBe('Study Original');
    expect(featuredMaterial(rug)?.id).toBe(rugMedia.defaultVariantId);
    expect(rug.imageKind).toBe('authored_source_material_render');
  });
  it('retains nine existing concept identities with exact source ornament and mapped texture provenance', () => {
    const rug=findMarketProduct(rugMedia.productId)!;
    expect(rug.variants.map(v=>v.id)).toEqual(Object.keys(overrides));
    expect(rug.variants).toHaveLength(9);
    expect(Object.values(overrides).filter(v=>v.authoredSourceMaterial)).toHaveLength(1);
    for(const variant of rug.variants){
      expect(variant.materialSpec?.pattern).toBe('Authored medallion and floral border');
      expect(variant.materialSpec?.textureBasis).toContain('T_carpet_BC');
      expect(variant.materialSpec?.roughness).toBeNull();
      expect(variant.materialSpec?.metallic).toBeNull();
      expect(variant.name).not.toMatch(/wood|metal|lacquer|walnut/i);
      expect(variant.image).toMatch(/^\/images\/marketplace\/rug-materials\//);
    }
  });
  it('has local hero and thumbnail derivatives for every reviewed rug option', () => {
    for(const row of Object.values(overrides)){
      expect(row.geometryUnchanged&&row.sourcePatternPreserved).toBe(true);
      expect(existsSync(resolve('public','.'+row.image))).toBe(true);
      expect(existsSync(resolve('public','.'+row.thumbnail))).toBe(true);
    }
    expect(rugMedia.gallery.every(image=>existsSync(resolve('public','.'+image)))).toBe(true);
  });
});
