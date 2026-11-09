'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Box, Search } from 'lucide-react';
import { CollectionNavigation } from './CollectionNavigation';
import collection from './Collections.module.css';
import styles from './ApartmentInventory.module.css';
import { findStandaloneBaseRender } from './furniture-base-images';

export type ApartmentDefinition = {
  id: string;
  name: string;
  category: string;
  type: string;
  rooms: string[];
  instanceCount: number;
  assemblyStatus: 'assembled' | 'piece' | 'unresolved';
  structural: boolean;
  sourceIds: string[];
  sourceAssets: string[];
  thumbnail?: string | null;
  unresolved: string[];
  notes?: string;
  roomCounts?: Record<string, number>;
};
export type ApartmentInventoryScope = {
  scope: string;
  capturedAt?: string;
  caveat: string;
  scopeDetails?: string[];
  definitions: ApartmentDefinition[];
  assemblies?: { id: string; name: string; definition: string; status: string; sourceAssets: string[]; unresolved: string[] }[];
};
export type ApartmentInventoryData = ApartmentInventoryScope & {
  summary?: { placedInstances: number; definitions: number };
  garage?: ApartmentInventoryScope;
};

const assemblyLabels = {
  assembled: 'Complete object mesh',
  piece: 'Assembly piece',
  unresolved: 'Assembly to review',
};
const categoryLabel = (value: string) => ({
  furniture: 'Furniture', 'furnishing/décor': 'Furnishing / décor', 'furnishing/decor': 'Furnishing / décor',
  equipment: 'Equipment', 'fixed fixture': 'Fixed fixture', fixed_fixture: 'Fixed fixture',
  'assembly part': 'Assembly part', assembly_part: 'Assembly part', structure: 'Structure',
}[value] ?? value);
const placementsInRoom = (item: ApartmentDefinition, room: string): number | null => room === 'all'
  ? item.instanceCount : item.roomCounts?.[room] ?? (item.rooms.length === 1 ? item.instanceCount : null);
const placementCount = (definitions: ApartmentDefinition[], room = 'all') => definitions.reduce((total, item) => total + (placementsInRoom(item, room) ?? 0), 0);
const placementLabel = (item: ApartmentDefinition, room: string) => {
  const count = placementsInRoom(item, room);
  return count === null ? 'Room count to confirm' : `${count} ${count === 1 ? 'placement' : 'placements'}`;
};
const roomList = (item: ApartmentDefinition) => item.rooms.length ? item.rooms : ['Room to confirm'];

export default function ApartmentInventory({ data }: { data: ApartmentInventoryData }) {
  const [scopeKey, setScopeKey] = useState<'apartment' | 'garage'>('apartment');
  const [query, setQuery] = useState('');
  const [room, setRoom] = useState('all');
  const [type, setType] = useState('all');
  const [assembly, setAssembly] = useState('all');
  const [includeStructure, setIncludeStructure] = useState(false);
  const [visible, setVisible] = useState(24);
  const activeScope = scopeKey === 'garage' && data.garage ? data.garage : data;
  const definitions = activeScope.definitions;
  const rooms = useMemo(() => [...new Set(definitions.flatMap(roomList))].sort(), [definitions]);
  const types = useMemo(() => [...new Set(definitions.filter(item => includeStructure || !item.structural).map(item => item.type))].sort(), [definitions, includeStructure]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return definitions.filter(item => (includeStructure || !item.structural)
      && (room === 'all' || roomList(item).includes(room))
      && (type === 'all' || item.type === type)
      && (assembly === 'all' || item.assemblyStatus === assembly)
      && (!needle || [item.name, ...item.sourceIds, ...item.sourceAssets].join(' ').toLocaleLowerCase().includes(needle)));
  }, [definitions, includeStructure, room, type, assembly, query]);
  const reset = () => { setQuery(''); setRoom('all'); setType('all'); setAssembly('all'); setIncludeStructure(false); setVisible(24); };
  const changeScope = (next: 'apartment' | 'garage') => { setScopeKey(next); reset(); };
  const hasFilters = !!query || room !== 'all' || type !== 'all' || assembly !== 'all' || includeStructure;

  return <div className={collection.page}>
    <CollectionNavigation active="furniture" />
    <header className={`${collection.intro} ${styles.intro}`}>
      <Link href="/store/collections/furniture" className={collection.back}><ArrowLeft size={14} aria-hidden /> Furniture collection</Link>
      <p className={collection.eyebrow}>Wilder: Furniture / Source review</p>
      <h1 className={collection.heading}>Apartment inventory</h1>
      <p>Define the objects already in the space. Complete objects, assembly pieces and furnishings are reviewed here before becoming products.</p>
      <p className={styles.reviewNote}>Inventory review only. These definitions are not purchase listings.</p>
      <Link href="/store/collections/furniture/base-renders" className={collection.textLink}>Review neutral base renders <ArrowUpRight size={14} aria-hidden /></Link>
    </header>
    <section className={styles.inventory} aria-label="Apartment inventory review">
      {data.garage && <div className={styles.scopeTabs} role="group" aria-label="Inventory scope">
        <button type="button" aria-pressed={scopeKey === 'apartment'} onClick={() => changeScope('apartment')}>Apartment</button>
        <button type="button" aria-pressed={scopeKey === 'garage'} onClick={() => changeScope('garage')}>Garage · separate inventory</button>
      </div>}
      <div className={styles.scopeHeader}>
        <div><h2>{activeScope.scope}</h2><p>{activeScope.caveat}</p></div>
        <dl className={styles.scopeCounts} aria-label="Full source inventory">
          <div><dt>Source mesh definitions</dt><dd>{definitions.length.toLocaleString('en-US')}</dd></div>
          <div><dt>Source placements</dt><dd>{placementCount(definitions).toLocaleString('en-US')}</dd></div>
        </dl>
      </div>
      <details className={styles.scopeDetails}>
        <summary>About this source inventory</summary>
        {activeScope.capturedAt && <p>Source snapshot: {activeScope.capturedAt}</p>}
        <p>Each definition represents one source mesh, not one approved product. Placements count how often that mesh appears in the saved source scene. Multiple pieces may form a single object.</p>
        {activeScope.scopeDetails?.length ? <ul>{activeScope.scopeDetails.map((detail, index) => <li key={index}>{detail}</li>)}</ul> : null}
      </details>
      <div className={styles.controls}>
        <label className={styles.search}><Search size={17} aria-hidden /><input type="search" aria-label="Search apartment inventory" placeholder="Search objects or source IDs" value={query} onChange={event => { setQuery(event.target.value); setVisible(24); }} /></label>
        <label className={styles.select}><span>Room</span><select aria-label="Filter by room" value={room} onChange={event => { setRoom(event.target.value); setVisible(24); }}><option value="all">All rooms</option>{rooms.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className={styles.select}><span>Type</span><select aria-label="Filter by type" value={type} onChange={event => { setType(event.target.value); setVisible(24); }}><option value="all">All types</option>{types.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      <div className={styles.secondaryControls}>
        <div className={styles.assemblyFilters} role="group" aria-label="Object assembly">
          {[['all', 'All definitions'], ['assembled', 'Complete objects'], ['piece', 'Assembly pieces'], ['unresolved', 'To resolve']].map(([value, label]) => <button key={value} type="button" aria-pressed={assembly === value} onClick={() => { setAssembly(value); setVisible(24); }}>{label}</button>)}
        </div>
        <label className={styles.structureToggle}><input type="checkbox" checked={includeStructure} onChange={event => { setIncludeStructure(event.target.checked); setType('all'); setVisible(24); }} /> Include structure</label>
      </div>
      <div className={styles.resultsLine}>
        <p role="status">{filtered.length.toLocaleString('en-US')} {filtered.length === 1 ? 'definition' : 'definitions'} · {placementCount(filtered, room).toLocaleString('en-US')} source {placementCount(filtered, room) === 1 ? 'placement' : 'placements'}{filtered.some(item => placementsInRoom(item, room) === null) ? ' · Some room counts need review' : ''}{!includeStructure ? ' · Structure hidden' : ''}</p>
        {hasFilters && <button type="button" onClick={reset}>Clear filters</button>}
      </div>
      {filtered.length ? <div className={styles.grid}>
        {filtered.slice(0, visible).map(item => {
          const baseRender = findStandaloneBaseRender(item.sourceAssets);
          const preview = baseRender?.hero ?? item.thumbnail;
          return <article className={styles.card} key={item.id} aria-label={item.name}>
          <div className={styles.preview}>
            {preview ? <Image src={preview} alt={`${item.name} ${baseRender ? 'neutral base render' : 'source preview'}`} fill unoptimized sizes="(max-width:600px) 100vw, (max-width:1000px) 50vw, 25vw" /> : <div className={styles.placeholder}><Box size={34} aria-hidden /><span>Source preview unavailable</span></div>}
            {preview && <span className={styles.previewLabel}>{baseRender ? 'Neutral base render' : 'Source preview'}</span>}
          </div>
          <div className={styles.cardBody}>
            <div className={styles.meta}><span>{categoryLabel(item.category)}</span><span>{placementLabel(item, room)}</span></div>
            <h3>{item.name}</h3>
            <p className={styles.rooms}>{roomList(item).join(' / ')}</p>
            <span className={styles.assemblyLabel} data-status={item.assemblyStatus}>{assemblyLabels[item.assemblyStatus]}</span>
            {item.unresolved.length > 0 && <p className={styles.unresolved}>{item.unresolved.length} {item.unresolved.length === 1 ? 'definition question' : 'definition questions'} to resolve</p>}
            <details className={styles.sourceDetails}>
              <summary>Source details</summary>
              <dl><div><dt>Definition</dt><dd><code>{item.id}</code></dd></div><div><dt>Type</dt><dd>{item.type}</dd></div></dl>
              <p>Source identifiers</p><ul>{item.sourceIds.map(id => <li key={id}><code>{id}</code></li>)}</ul>
              {item.sourceAssets.length > 0 && <><p>Source assets</p><ul>{item.sourceAssets.map(asset => <li key={asset}><code>{asset}</code></li>)}</ul></>}
              {item.roomCounts && <><p>Saved placements by room</p><ul>{Object.entries(item.roomCounts).map(([label, count]) => <li key={label}>{label}: {count}</li>)}</ul></>}
              {item.notes && <p>{item.notes}</p>}
              {baseRender && item.thumbnail && <div className={collection.sourcePreview}><Image src={item.thumbnail} alt={`${item.name} original source preview`} width={256} height={256} unoptimized /><p>Original source preview</p></div>}
              {item.unresolved.length > 0 && <><p>To resolve</p><ul>{item.unresolved.map((question, index) => <li key={index}>{question}</li>)}</ul></>}
            </details>
          </div>
        </article>; })}
      </div> : <div className={collection.empty}><p>No definitions match these filters.</p><button type="button" className="sci-btn sci-btn-ghost" onClick={reset}>Reset inventory view</button></div>}
      {filtered.length > visible && <button type="button" className={`sci-btn sci-btn-ghost ${styles.loadMore}`} onClick={() => setVisible(count => count + 24)}>Show more definitions <ArrowUpRight size={16} aria-hidden /></button>}
      {activeScope.assemblies?.length ? <details className={styles.assemblies}>
        <summary>Assemblies and related pieces <span>{activeScope.assemblies.length} {activeScope.assemblies.length === 1 ? 'group' : 'groups'} in review</span></summary>
        <p>Proposed object definitions connect related source meshes. These groups are reviewed separately from the mesh and placement totals above.</p>
        <div>{activeScope.assemblies.map(group => <details key={group.id} className={styles.assemblyGroup}>
          <summary>{group.name} <span>{group.status.replaceAll('_', ' ')}</span></summary>
          <p>{group.definition}</p>
          {group.unresolved.length > 0 && <><h3>To resolve</h3><ul>{group.unresolved.map((value, index) => <li key={index}>{value}</li>)}</ul></>}
          <h3>Related source assets</h3><ul>{group.sourceAssets.map(asset => <li key={asset}><code>{asset}</code></li>)}</ul>
        </details>)}</div>
      </details> : null}
    </section>
  </div>;
}
