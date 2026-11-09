import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve('../../../outputs/ww-marketplace-20261106');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const origin=process.env.MARKET_QA_URL??'http://127.0.0.1:8791';
const results=[];
async function check(label,fn){await fn();results.push(label);console.log('PASS',label);}
async function go(p){const r=await page.goto(origin+p,{waitUntil:'networkidle',timeout:90000});if(!r?.ok())throw new Error(`${p}: ${r?.status()}`);}
async function loadImages(){await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}window.scrollTo(0,0);await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});}
try {
 await check('landing page and category navigation',async()=>{await go('/store');await page.getByRole('heading',{level:1,name:/Your world/}).waitFor();if(await page.locator('h2').count()<8)throw new Error('Missing category cards');await loadImages();await page.screenshot({path:path.join(out,'desktop-store.png'),fullPage:true});});
 await check('landing images and width',async()=>{const bad=await page.locator('main img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src));if(bad.length)throw new Error('Broken images: '+bad.join(','));if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Horizontal overflow');});
 await check('clothing filtering and list toggle',async()=>{await go('/store/collections/clothing?category=jacket');await page.getByRole('heading',{level:1,name:'Jackets',exact:true}).waitFor();await page.getByRole('button',{name:'List view',exact:true}).click();await page.waitForTimeout(200);if(await page.getByRole('button',{name:'List view'}).getAttribute('aria-pressed')!=='true')throw new Error('List view failed');await page.screenshot({path:path.join(out,'clothing-list.png'),fullPage:false});});
 await check('search empty state and reset',async()=>{await page.getByRole('searchbox',{name:'Filter products'}).fill('no-such-item-zzzz');await page.getByRole('heading',{name:'No matches just yet.'}).waitFor();await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.locator('article').first().waitFor();});
 await check('finish filter and product variant deep link',async()=>{await go('/store/collections/furniture?finish=cognac');await page.locator('article').first().waitFor();if(await page.locator('article').count()!==3)throw new Error('Expected three furniture finish products');await page.getByRole('link',{name:'Trinity Apartment Sofa',exact:true}).click();await page.getByRole('heading',{level:1,name:'Trinity Apartment Sofa'}).waitFor();await page.getByRole('button',{name:'Cognac',exact:true}).click();if(!page.url().includes('variant=object-145-sm-sofa-cognac'))throw new Error('Variant URL not preserved');await page.reload({waitUntil:'networkidle'});if(await page.getByRole('button',{name:'Cognac',exact:true}).getAttribute('aria-pressed')!=='true')throw new Error('Variant reload failed');await page.screenshot({path:path.join(out,'furniture-detail.png'),fullPage:true});});
 await check('statues and source options',async()=>{await go('/store/collections/statues');await page.getByRole('heading',{level:1,name:'Statues & art',exact:true}).waitFor();if(await page.locator('article').count()<20)throw new Error('Missing statues');});
 await check('mobile layout and filters',async()=>{await page.setViewportSize({width:390,height:844});await go('/store');await page.screenshot({path:path.join(out,'mobile-store.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow');await go('/store/collections/furniture');await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByRole('button',{name:'Cognac',exact:true}).click();await page.getByRole('button',{name:'Close filters',exact:true}).click();if(await page.locator('article').count()!==3)throw new Error('Mobile finish filter failed');});
 if(errors.length)throw new Error(errors.join('\n'));
 await writeFile(path.join(out,'browser-validation.json'),JSON.stringify({passed:results,errors},null,2));
} finally {await browser.close();}
