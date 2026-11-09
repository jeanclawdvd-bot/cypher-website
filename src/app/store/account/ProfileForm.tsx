'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowUpRight,Camera,UserRound} from 'lucide-react';
import {accountErrorMessage,type LocalAccount} from '@/sites/wilderworld/marketplace/account-client';
import {prepareProfilePhoto} from './profile-photo';
import common from './AccountPage.module.css';
import styles from './ProfileForm.module.css';

function profilePhotoUrl(value:unknown){return typeof value==='string'&&/^\/api\/store\/v1\/profile\/photo(?:\?v=[a-zA-Z0-9_-]{1,128})?$/.test(value)?value:null;}
export default function ProfileForm({account,onSave,onPhotoSave,busy}:{account:LocalAccount;onSave:(body:{displayName:string;bio:string})=>Promise<void>;onPhotoSave:(dataUrl:string|null)=>Promise<void>;busy:boolean}){
  const [displayName,setDisplayName]=useState(account.user.displayName),[bio,setBio]=useState(account.user.bio),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[saving,setSaving]=useState(false);
  const [pendingPhoto,setPendingPhoto]=useState<string|null|undefined>(),[reading,setReading]=useState(false),[photoSaving,setPhotoSaving]=useState(false),[photoError,setPhotoError]=useState(''),[photoSaved,setPhotoSaved]=useState(false),[imageFailed,setImageFailed]=useState(false),[imageRevision,setImageRevision]=useState(0);
  const fileInput=useRef<HTMLInputElement|null>(null),photoGeneration=useRef(0),mounted=useRef(true),id=useId();
  const savedPhoto=profilePhotoUrl(account.user.avatarUrl),photo=pendingPhoto===undefined?savedPhoto:pendingPhoto,photoChanged=pendingPhoto!==undefined;
  const disabled=busy||saving||photoSaving,photoBusy=disabled||reading;
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;photoGeneration.current++;};},[]);
  useEffect(()=>{if(!dirty){setDisplayName(account.user.displayName);setBio(account.user.bio);}},[account.user.displayName,account.user.bio,dirty]);
  useEffect(()=>{setImageFailed(false);},[photo]);
  async function choosePhoto(file:File|undefined){
    if(!file||disabled)return;const generation=++photoGeneration.current;setReading(true);setPhotoError('');setPhotoSaved(false);
    try{const result=await prepareProfilePhoto(file);if(!mounted.current||generation!==photoGeneration.current)return;setPendingPhoto(result);setImageFailed(false);}
    catch(reason){if(mounted.current&&generation===photoGeneration.current)setPhotoError(accountErrorMessage(reason));}
    finally{if(mounted.current&&generation===photoGeneration.current)setReading(false);}
  }
  function discardPhoto(){photoGeneration.current++;setReading(false);setPendingPhoto(undefined);setPhotoError('');setImageFailed(false);}
  async function savePhoto(){
    if(!photoChanged||photoBusy)return;const draft=pendingPhoto!;setPhotoSaving(true);setPhotoError('');setPhotoSaved(false);
    try{await onPhotoSave(draft);if(!mounted.current)return;setPendingPhoto(undefined);setPhotoSaved(true);}
    catch(reason){if(mounted.current)setPhotoError(accountErrorMessage(reason));}
    finally{if(mounted.current)setPhotoSaving(false);}
  }
  async function saveProfile(event:React.FormEvent){
    event.preventDefault();if(disabled||reading)return;setError('');setSaved(false);
    try{if(!displayName.trim()||displayName.trim().length>60)throw new Error('Use a display name between 1 and 60 characters.');if(bio.length>500)throw new Error('Keep your bio to 500 characters.');setSaving(true);await onSave({displayName:displayName.trim(),bio});if(!mounted.current)return;setDirty(false);setSaved(true);}
    catch(reason){if(mounted.current)setError(accountErrorMessage(reason));}
    finally{if(mounted.current)setSaving(false);}
  }
  return <section className={styles.root}>
    <header className={styles.heading}><h2>Profile details</h2><p>Your display name appears on your local listings.</p></header>
    <div className={styles.sync}><strong>ZERO account sync · Not connected</strong><p>ZERO will be the profile source when connected. Changes here are saved only to this local preview; they do not update your ZERO or game account.</p></div>
    <section className={styles.photoEditor} aria-labelledby={`${id}-photo-heading`}>
      <div className={styles.photoPreview}>{photo&&!imageFailed?<img key={imageRevision} src={photo} alt={photoChanged?'Selected profile photo preview':'Saved profile photo'} onError={()=>setImageFailed(true)}/>:<UserRound size={44} strokeWidth={1} aria-hidden/>}</div>
      <div className={styles.photoControls}><h3 id={`${id}-photo-heading`}>Profile photo</h3><p>JPEG, PNG or WebP · Up to 5 MB.<br/>Photos are cropped to a square.</p>
        <input ref={fileInput} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo file" disabled={disabled} onChange={event=>{const file=event.target.files?.[0];event.target.value='';void choosePhoto(file);}}/>
        <div className={styles.actions}><button className={common.secondary} type="button" disabled={disabled} onClick={()=>fileInput.current?.click()}><Camera size={15} aria-hidden/>{photo?'Replace photo':'Choose photo'}</button>{photo&&<button className={styles.textButton} type="button" disabled={photoBusy} onClick={()=>{setPendingPhoto(savedPhoto?null:undefined);setPhotoError('');setPhotoSaved(false);}}>Remove photo</button>}</div>
        {reading&&<p role="status">Preparing your photo…</p>}
        {imageFailed&&<div className={styles.photoError}><p>The photo preview could not load.</p><button className={styles.textButton} type="button" disabled={photoBusy} onClick={()=>{setImageFailed(false);setImageRevision(value=>value+1);}}>Reload photo</button></div>}
        {photoChanged&&<><p className={styles.unsaved}>{pendingPhoto===null?'Your photo will be removed when you save.':'Photo preview · Not saved yet.'}</p><div className={styles.actions}><button className={common.primary} type="button" disabled={photoBusy} onClick={savePhoto}>{photoSaving?'Saving photo…':'Save photo'}</button><button className={styles.textButton} type="button" disabled={disabled} onClick={discardPhoto}>Cancel photo change</button></div></>}
        {photoError&&<p role="alert" className={common.error}>{photoError} {photoChanged?'Your photo change is still here. Try Save photo again.':''}</p>}
        {photoSaved&&<p role="status" className={styles.saved}>Photo saved locally. ZERO sync is not connected.</p>}
      </div>
    </section>
    <form className={`${common.form} ${common.profile}`} onSubmit={saveProfile}>
      <label>Display name<input value={displayName} onChange={event=>{setDisplayName(event.target.value);setDirty(true);setSaved(false);}} required maxLength={60} disabled={disabled}/></label>
      <label>About you<textarea rows={4} value={bio} onChange={event=>{setBio(event.target.value);setDirty(true);setSaved(false);}} maxLength={500} disabled={disabled}/><small>{bio.length} / 500</small></label>
      <div className={common.readonly}><span>Email</span><strong>{account.user.email}</strong><small>Local account · Joined {new Date(account.user.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}</small><small>Email is fixed for this test account. Production account details will be managed by ZERO.</small></div>
      {error&&<p role="alert" className={common.error}>{error}</p>}{saved&&<p role="status" className={styles.saved}>Profile saved locally. ZERO sync is not connected.</p>}
      <button className={common.primary} disabled={disabled||reading}>{saving?'Saving profile…':'Save profile'}<ArrowUpRight size={16} aria-hidden/></button>
    </form>
  </section>;
}
