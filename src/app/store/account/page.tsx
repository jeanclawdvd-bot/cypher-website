import type {Metadata} from 'next';
import AccountPage from './AccountPage';
export const metadata:Metadata={title:'Your account | Wilder World',description:'Your local Wilder World account, test inventory and simulated listings.',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  return <AccountPage initialTab={typeof params.tab==='string'?params.tab:undefined}/>;
}
