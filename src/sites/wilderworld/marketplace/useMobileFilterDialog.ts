'use client';

import {useEffect,useRef,useState,type RefObject} from 'react';

const FOCUSABLE='a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

/** Adds modal behavior only while the responsive filter drawer is actually open. */
export function useMobileFilterDialog({open,onClose,panel,trigger,backdrop,breakpoint=760}:{open:boolean;onClose:()=>void;panel:RefObject<HTMLElement|null>;trigger:RefObject<HTMLButtonElement|null>;backdrop:RefObject<HTMLButtonElement|null>;breakpoint?:number}){
  const mediaQuery=`(max-width: ${breakpoint}px)`;
  const [mobile,setMobile]=useState(false);
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const media=typeof window.matchMedia==='function'?window.matchMedia(mediaQuery):null;
    const update=()=>{const matches=media?.matches??window.innerWidth<=breakpoint;setMobile(matches);if(!matches)close.current();};
    update();media?.addEventListener?.('change',update);window.addEventListener('resize',update);
    return()=>{media?.removeEventListener?.('change',update);window.removeEventListener('resize',update);};
  },[mediaQuery,breakpoint]);
  useEffect(()=>{
    if(!open||!mobile||!panel.current)return;
    const drawer=panel.current;
    const bodyOverflow=document.body.style.overflow,rootOverflow=document.documentElement.style.overflow;
    document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';
    // Make each sibling branch outside the drawer inert, including the shared header/footer.
    // The backdrop remains clickable; keyboard dismissal is inside the dialog and Escape.
    const isolated:Array<{element:HTMLElement;value:string|null}>=[];
    let branch:HTMLElement=drawer;
    while(branch.parentElement){
      const parent=branch.parentElement;
      for(const sibling of Array.from(parent.children))if(sibling instanceof HTMLElement&&sibling!==branch&&sibling!==backdrop.current&&!['SCRIPT','STYLE','LINK'].includes(sibling.tagName)){
        isolated.push({element:sibling,value:sibling.getAttribute('inert')});sibling.setAttribute('inert','');
      }
      if(parent===document.body)break;
      branch=parent;
    }
    const controls=()=>Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element=>element.tabIndex>=0&&!element.hidden&&!element.closest('[inert]')&&getComputedStyle(element).display!=='none'&&getComputedStyle(element).visibility!=='hidden').sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
    const focusFirst=()=>{(controls()[0]??drawer).focus({preventScroll:true});};
    focusFirst();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close.current();return;}
      if(event.key!=='Tab')return;
      const items=controls(),first=items[0],last=items.at(-1),active=document.activeElement;
      if(!first){event.preventDefault();drawer.focus();return;}
      if(event.shiftKey&&(active===first||active===drawer||!drawer.contains(active))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(active===last||active===drawer||!drawer.contains(active))){event.preventDefault();first.focus();}
    };
    const focusin=(event:FocusEvent)=>{if(event.target instanceof Node&&!drawer.contains(event.target)&&event.target!==backdrop.current)focusFirst();};
    document.addEventListener('keydown',keydown);document.addEventListener('focusin',focusin);
    return()=>{
      document.removeEventListener('keydown',keydown);document.removeEventListener('focusin',focusin);
      document.body.style.overflow=bodyOverflow;document.documentElement.style.overflow=rootOverflow;
      for(const {element,value} of isolated){if(value===null)element.removeAttribute('inert');else element.setAttribute('inert',value);}
      const stillMobile=typeof window.matchMedia==='function'?window.matchMedia(mediaQuery).matches:window.innerWidth<=breakpoint;
      const destination=stillMobile?trigger.current:drawer;
      if(destination?.isConnected)destination.focus({preventScroll:true});
    };
  },[open,mobile,panel,trigger,backdrop,mediaQuery,breakpoint]);
  return mobile;
}
