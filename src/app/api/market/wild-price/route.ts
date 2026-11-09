import {NextResponse} from 'next/server';
import {readWildRate} from '@/lib/wild-price.server';
export const dynamic='force-dynamic';
export async function GET(){
  const result=await readWildRate();
  return NextResponse.json(result,{headers:{'Cache-Control':result.rate?'public, max-age=15, s-maxage=30':'no-store','X-Content-Type-Options':'nosniff'}});
}
