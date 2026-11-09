'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import styles from './SearchDepartmentSelect.module.css';

type SearchDepartment = { value: string; label: string };

export default function SearchDepartmentSelect({ value, options, onChange }: {
  value: string;
  options: SearchDepartment[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const typeahead = useRef({ text: '', time: 0 });
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    setActiveIndex(selectedIndex);
    setOpen(false);
  }, [value, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list=document.getElementById(`${id}-options`);
    const option=document.getElementById(`${id}-option-${activeIndex}`);
    if(!list||!option)return;
    // Scroll only the options panel. scrollIntoView also moves the page when
    // this menu opens near an edge, making the search header visibly jump.
    const top=option.getBoundingClientRect().top-list.getBoundingClientRect().top+list.scrollTop;
    if(top<list.scrollTop)list.scrollTop=top;
    else if(top+option.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=top+option.offsetHeight-list.clientHeight;
  }, [open, activeIndex, id]);

  const choose = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      return;
    }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(activeIndex);
      else { setActiveIndex(selectedIndex); setOpen(true); }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : !open ? selectedIndex : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = now - typeahead.current.time < 700 ? typeahead.current.text + event.key.toLowerCase() : event.key.toLowerCase();
      typeahead.current = { text, time: now };
      const repeated = [...text].every(character => character === text[0]);
      const query = repeated ? text[0] : text;
      const start = repeated ? activeIndex + 1 : activeIndex;
      const match = options.map((_, index) => (start + index) % options.length)
        .find(index => options[index].label.toLowerCase().startsWith(query));
      setOpen(true);
      if (match !== undefined) setActiveIndex(match);
    }
  };

  return <div ref={root} className={styles.select} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <input type="hidden" name="department" value={value}/>
    <button ref={trigger} type="button" role="combobox" className={styles.trigger}
      aria-label="Search department" aria-haspopup="listbox" aria-expanded={open}
      aria-controls={`${id}-options`} aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
      onKeyDown={onKeyDown} onClick={() => { setActiveIndex(selectedIndex); setOpen(!open); }}>
      <span>{options.find(option => option.value === value)?.label ?? 'Categories'}</span><ChevronDown size={14} aria-hidden/>
    </button>
    {open && <ul id={`${id}-options`} role="listbox" aria-label="Search department" className={styles.options}>
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option"
        aria-selected={option.value === value} data-active={index === activeIndex} data-divider={option.value === 'existing'}
        className={styles.option} onPointerMove={() => setActiveIndex(index)}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}</span>{option.value === value && <Check size={15} aria-hidden/>}
      </li>)}
    </ul>}
  </div>;
}
