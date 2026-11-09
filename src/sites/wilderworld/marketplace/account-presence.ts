import {useSyncExternalStore} from 'react';
import {STORE_ACCOUNT_EVENT,storeAccountApi} from './account-client';

type AccountPresence='unknown'|'signed-in'|'signed-out';
// A browser-lifetime label hint only. Never store a user, address, session token,
// permission or credential here; every account action still authenticates itself.
let presence:AccountPresence='unknown';
let controller:AbortController|undefined;
let revision=0;
let listening=false;
const listeners=new Set<()=>void>();
function publish(value:AccountPresence){if(presence!==value){presence=value;listeners.forEach(listener=>listener());}}
function invalidate(){controller?.abort();revision++;publish('unknown');}
function read(invalidateFirst=false){
  if(invalidateFirst)invalidate();
  if(!listeners.size)return;
  controller?.abort();const request=new AbortController();controller=request;const id=++revision;
  // Preserve only a known signed-in label during navigation revalidation.
  if(presence!=='signed-in')publish('unknown');
  storeAccountApi.session(request.signal).then(session=>{
    if(!request.signal.aborted&&id===revision)publish(session.user?'signed-in':'signed-out');
  }).catch(()=>{if(!request.signal.aborted&&id===revision)publish('unknown');});
}
function install(){
  if(listening||typeof window==='undefined')return;listening=true;
  // Keep auth invalidation active between route mounts. Only a three-state label
  // survives; no account information is persisted to browser storage.
  window.addEventListener(STORE_ACCOUNT_EVENT,()=>read(true));
  window.addEventListener('focus',()=>{if(listeners.size)read();else invalidate();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(listeners.size)read();else invalidate();}});
}
function subscribe(listener:()=>void){
  install();const first=listeners.size===0;listeners.add(listener);if(first)read();
  return()=>{listeners.delete(listener);if(!listeners.size){controller?.abort();revision++;}};
}
const snapshot=()=>presence;
const serverSnapshot=():AccountPresence=>'unknown';
export function useAccountPresence(){return useSyncExternalStore(subscribe,snapshot,serverSnapshot);}
