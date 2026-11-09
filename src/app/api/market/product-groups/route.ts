import {NextResponse} from 'next/server';
import {familyBrowseItem,originalGroupCollection,originalGroupTraitCategories} from '@/lib/original-product-groups';

export async function GET(request:Request) {
  const params=new URL(request.url).searchParams;
  const slug=params.get('slug')??'';
  const collection=originalGroupCollection(slug);
  if(!collection)return NextResponse.json({error:'Collection is not in the grouping pilot'},{status:404});
  const cursor=params.get('next')??'0';
  const offset=Number(cursor);
  if(!/^(0|[1-9]\d*)$/.test(cursor)||!Number.isSafeInteger(offset))return NextResponse.json({error:'Invalid cursor'},{status:400});
  let traits:Record<string,string[]>={};
  try { const input=JSON.parse(params.get('attributes')??'{}');if(!input||typeof input!=='object'||Array.isArray(input)||Object.values(input).some(v=>!Array.isArray(v)||v.some(x=>typeof x!=='string')))throw Error();traits=input; }
  catch{return NextResponse.json({error:'Invalid filters'},{status:400});}
  const query=(params.get('q')??'').trim().toLowerCase().slice(0,200);
  const filtered=collection.families.flatMap(f=>{
    const familyMatch=!query||[f.name,f.sourceAssetId].join(' ').toLowerCase().includes(query);
    const edition=f.variants.find(v=>(familyMatch||v.traits.map(t=>t.value).join(' ').toLowerCase().includes(query))&&Object.entries(traits).every(([type,values])=>!values.length||v.traits.some(t=>t.type===type&&values.includes(t.value))));
    return edition?[{family:f,edition}]:[];
  });
  if(params.get('sort')==='name')filtered.sort((a,b)=>a.family.name.localeCompare(b.family.name));
  const page=filtered.slice(offset,offset+24);
  return NextResponse.json({items:page.map(({family,edition})=>familyBrowseItem(family,edition.id)),next:offset+24<filtered.length?String(offset+24):null,totalProducts:filtered.length,totalObservedItems:collection.itemCount,observedAt:collection.observedAt,traitCategories:originalGroupTraitCategories(slug),mode:'catalog-snapshot',error:false});
}
