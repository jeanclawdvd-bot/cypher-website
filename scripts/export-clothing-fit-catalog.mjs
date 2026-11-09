import {createServer} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const output=process.argv[2];
if(!output||!path.isAbsolute(output))throw new Error('Provide an absolute output directory.');
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try {
  const {marketProducts,browseProducts}=await server.ssrLoadModule('/src/sites/wilderworld/marketplace/catalog.ts');
  const {clothingFit,clothingFitFamily}=await server.ssrLoadModule('/src/sites/wilderworld/marketplace/clothing-fit.ts');
  const definitions=JSON.parse(await readFile('src/sites/wilderworld/marketplace/clothing-fit-families.json','utf8'));
  const products=marketProducts.filter(p=>p.department==='clothing').map(p=>({
    productId:p.id,name:p.name,sourceSku:p.sourceIds,sourceAssets:p.sourceAssets,
    styleId:clothingFitFamily(p.id)?.styleId??p.id,styleName:clothingFitFamily(p.id)?.name??p.name,
    category:p.subcategory,brand:p.brand,fit:clothingFit(p.id),previewPriceCents:p.priceCents,
    variants:p.variants.map(v=>({conceptId:v.id,name:v.name,image:v.image,swatch:v.swatch,editionId:null,onchainTokenIds:[],gameMaterialBinding:null})),
    gameFitValidation:'pending',sourceEvidence:definitions.evidence,
  }));
  const counts={sourceProducts:products.length,styleEntries:browseProducts(marketProducts,{department:'clothing'}).length,
    womenCuts:products.filter(p=>p.fit.basis==='source_cut'&&p.fit.fits.includes('Women')).length,
    menCuts:products.filter(p=>p.fit.basis==='source_cut'&&p.fit.fits.includes('Men')).length,
    sharedSourceTable:products.filter(p=>p.fit.basis==='source_table'&&p.fit.fits.length===2).length,
    fitUnconfirmed:products.filter(p=>p.fit.basis==='unconfirmed').length,
    visualConcepts:products.reduce((n,p)=>n+p.variants.length,0),wholeStoreSourceProducts:marketProducts.length,
    wholeStoreStyleEntries:browseProducts(marketProducts,{}).length,wholeStoreVisualConcepts:marketProducts.reduce((n,p)=>n+p.variants.length,0)};
  await mkdir(output,{recursive:true});
  await writeFile(path.join(output,'Clothing-Catalog.json'),JSON.stringify({schemaVersion:1,date:'2026-11-08',counts,policy:definitions.policy,families:definitions.families,unresolvedProductIds:definitions.unresolvedProductIds,products},null,2)+'\n');
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  await writeFile(path.join(output,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wilder World — clothing catalog</title><style>body{margin:0;padding:40px;background:#101113;color:#e6e8eb;font:15px/1.6 system-ui}main{max-width:1400px;margin:auto}h1{font-size:36px;line-height:1.1}h2{margin-top:40px}p{max-width:85ch;color:#b9bec4}strong{color:#fff}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:12px;border-bottom:1px solid #34363a}th{color:#ff754a}code{font-size:12px}a{color:#ff754a}</style><main><h1>Clothing catalog</h1><p><strong>${counts.sourceProducts} retained fit-specific items · ${counts.styleEntries} style entries · ${counts.visualConcepts} color concepts.</strong><br>${counts.womenCuts} source-backed women’s cuts, ${counts.menCuts} paired men’s cuts, ${counts.sharedSourceTable} shared source-table records, ${counts.fitUnconfirmed} items awaiting fit confirmation.</p><h2>Catalog structure</h2>${Object.values(definitions.policy).map(p=>`<p>${escape(p)}</p>`).join('')}<h2>Matching fit families</h2><div class="scroll"><table><thead><tr><th>Style</th><th>Men’s SKU</th><th>Women’s SKU</th></tr></thead><tbody>${definitions.families.map(f=>`<tr><td>${escape(f.name)}</td>${f.fits.map(x=>`<td><code>${escape(x.productId)}</code></td>`).join('')}</tr>`).join('')}</tbody></table></div><h2>Unresolved</h2><p>Six suffix candidates are not yet verified female cuts: ${definitions.unresolvedProductIds.map(escape).join(', ')}. Basement Anthem artwork stays separate until design alignment is confirmed. The V04 yoga leggings remain unidentified. All game fit and final color bindings still require release validation.</p><h2>Full retained inventory</h2><p><a href="Clothing-Catalog.json">Download the source-to-style and concept registry</a>. Existing exclusions, prices, supply proposals and item identities are unchanged.</p><div class="scroll"><table><thead><tr><th>Style</th><th>Source product</th><th>Category</th><th>Recorded fit</th><th>Concepts</th></tr></thead><tbody>${products.map(p=>`<tr><td>${escape(p.styleName)}</td><td><code>${escape(p.productId)}</code></td><td>${escape(p.category)}</td><td>${escape(p.fit.fits.join(' / ')||'Unconfirmed')}</td><td>${p.variants.length}</td></tr>`).join('')}</tbody></table></div></main></html>`);
  console.log(JSON.stringify(counts));
}finally{await server.close();}
