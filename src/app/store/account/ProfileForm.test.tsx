import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('./profile-photo',()=>({prepareProfilePhoto:vi.fn()}));
import {prepareProfilePhoto} from './profile-photo';
import ProfileForm from './ProfileForm';
import type {LocalAccount} from '@/sites/wilderworld/marketplace/account-client';
const original='/api/store/v1/profile/photo?v=original';
const updated='/api/store/v1/profile/photo?v=updated';
const preview='data:image/jpeg;base64,/9j/2Q==';
const account:LocalAccount={mode:'local',user:{id:'account-1',email:'person@example.test',displayName:'Test person',bio:'Original bio',createdAt:'2026-11-08T00:00:00Z',avatarUrl:original,profileSource:'local',zeroSyncStatus:'unconfigured'},inventory:[],listings:[],purchases:[],sales:[],reviews:[]};
const file=()=>new File(['example'],'photo.png',{type:'image/png'});
beforeEach(()=>{vi.mocked(prepareProfilePhoto).mockReset().mockResolvedValue(preview);});
afterEach(()=>vi.restoreAllMocks());
function changePhoto(){fireEvent.change(screen.getByLabelText('Choose profile photo file'),{target:{files:[file()]}});}
describe('Profile photo editor',()=>{
  it('preserves unsaved display-name and bio drafts across photo failure, retry and refreshed saved-photo props',async()=>{
    const onPhotoSave=vi.fn().mockRejectedValueOnce(new Error('Retry upload')).mockResolvedValue(undefined),onSave=vi.fn();const props={account,busy:false,onPhotoSave,onSave};
    const {rerender}=render(<ProfileForm {...props}/>);fireEvent.change(screen.getByLabelText('Display name'),{target:{value:'Unsaved name'}});fireEvent.change(screen.getByLabelText(/^About you/),{target:{value:'Unsaved bio'}});
    changePhoto();await screen.findByAltText('Selected profile photo preview');fireEvent.click(screen.getByRole('button',{name:'Save photo'}));await screen.findByRole('alert');expect(screen.getByLabelText('Display name')).toHaveValue('Unsaved name');
    fireEvent.click(screen.getByRole('button',{name:'Save photo'}));await screen.findByText('Photo saved locally. ZERO sync is not connected.');
    rerender(<ProfileForm {...props} account={{...account,user:{...account.user,avatarUrl:updated}}}/>);
    expect(screen.getByLabelText('Display name')).toHaveValue('Unsaved name');expect(screen.getByLabelText(/^About you/)).toHaveValue('Unsaved bio');expect(screen.getByAltText('Saved profile photo')).toHaveAttribute('src',updated);expect(onSave).not.toHaveBeenCalled();
  });

  it('previews a choice before saving and updates the authenticated saved image',async()=>{
    const onPhotoSave=vi.fn().mockResolvedValue(undefined),onSave=vi.fn();const props={account,onPhotoSave,onSave,busy:false};
    const {rerender}=render(<ProfileForm {...props}/>);expect(screen.getByAltText('Saved profile photo')).toHaveAttribute('src',original);
    changePhoto();await screen.findByAltText('Selected profile photo preview');expect(onPhotoSave).not.toHaveBeenCalled();expect(screen.getByText('Photo preview · Not saved yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Save photo'}));await waitFor(()=>expect(onPhotoSave).toHaveBeenCalledWith(preview));
    rerender(<ProfileForm {...props} account={{...account,user:{...account.user,avatarUrl:updated}}}/>);
    await screen.findByText('Photo saved locally. ZERO sync is not connected.');expect(screen.getByAltText('Saved profile photo')).toHaveAttribute('src',updated);expect(onSave).not.toHaveBeenCalled();
  });
  it('requires save for removal and lets removal be cancelled',async()=>{
    const onPhotoSave=vi.fn().mockResolvedValue(undefined);render(<ProfileForm account={account} busy={false} onSave={vi.fn()} onPhotoSave={onPhotoSave}/>);
    fireEvent.click(screen.getByRole('button',{name:'Remove photo'}));expect(screen.queryByAltText('Saved profile photo')).toBeNull();expect(onPhotoSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Cancel photo change'}));expect(screen.getByAltText('Saved profile photo')).toHaveAttribute('src',original);
    fireEvent.click(screen.getByRole('button',{name:'Remove photo'}));fireEvent.click(screen.getByRole('button',{name:'Save photo'}));await waitFor(()=>expect(onPhotoSave).toHaveBeenCalledWith(null));
  });
  it('retains a rejected save for retry and does not claim ZERO sync',async()=>{
    const onPhotoSave=vi.fn().mockRejectedValueOnce(new Error('Upload unavailable')).mockResolvedValue(undefined);render(<ProfileForm account={account} busy={false} onSave={vi.fn()} onPhotoSave={onPhotoSave}/>);
    changePhoto();await screen.findByAltText('Selected profile photo preview');fireEvent.click(screen.getByRole('button',{name:'Save photo'}));await screen.findByRole('alert');
    expect(screen.getByAltText('Selected profile photo preview')).toHaveAttribute('src',preview);expect(screen.queryByText('Photo saved locally. ZERO sync is not connected.')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Save photo'}));await screen.findByText('Photo saved locally. ZERO sync is not connected.');expect(onPhotoSave).toHaveBeenCalledTimes(2);expect(screen.getByText('ZERO account sync · Not connected')).toBeTruthy();
  });
  it('keeps the current image when a selected source fails validation',async()=>{
    vi.mocked(prepareProfilePhoto).mockRejectedValue(new Error('Choose a photo smaller than 5 MB.'));const onPhotoSave=vi.fn();render(<ProfileForm account={account} busy={false} onSave={vi.fn()} onPhotoSave={onPhotoSave}/>);
    changePhoto();await screen.findByRole('alert');expect(screen.getByAltText('Saved profile photo')).toHaveAttribute('src',original);expect(screen.queryByRole('button',{name:'Save photo'})).toBeNull();expect(onPhotoSave).not.toHaveBeenCalled();
  });
  it('ignores an old decode result when the visitor selects a second photo',async()=>{
    let finish!:(value:string)=>void;vi.mocked(prepareProfilePhoto).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce(preview);
    render(<ProfileForm account={account} busy={false} onSave={vi.fn()} onPhotoSave={vi.fn()}/>);changePhoto();changePhoto();await screen.findByAltText('Selected profile photo preview');
    await act(async()=>finish('data:image/jpeg;base64,old'));expect(screen.getByAltText('Selected profile photo preview')).toHaveAttribute('src',preview);
  });
  it('does not render remote photo URLs and preserves unsaved text during a background profile refresh',async()=>{
    const onSave=vi.fn().mockResolvedValue(undefined),props={account:{...account,user:{...account.user,avatarUrl:'https://untrusted.example/tracker.jpg'}},busy:false,onSave,onPhotoSave:vi.fn()};
    const {rerender}=render(<ProfileForm {...props}/>);expect(screen.queryByRole('img')).toBeNull();fireEvent.change(screen.getByLabelText('Display name'),{target:{value:'My draft'}});
    rerender(<ProfileForm {...props} account={{...props.account,user:{...props.account.user,displayName:'External change'}}}/>);expect(screen.getByLabelText('Display name')).toHaveValue('My draft');
    fireEvent.click(screen.getByRole('button',{name:'Save profile'}));await waitFor(()=>expect(onSave).toHaveBeenCalledWith({displayName:'My draft',bio:'Original bio'}));
  });
  it('reloads a failed saved-image preview without changing the stored profile',()=>{
    const onPhotoSave=vi.fn();render(<ProfileForm account={account} busy={false} onSave={vi.fn()} onPhotoSave={onPhotoSave}/>);fireEvent.error(screen.getByAltText('Saved profile photo'));
    expect(screen.queryByRole('img')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Reload photo'}));expect(screen.getByAltText('Saved profile photo')).toHaveAttribute('src',original);expect(onPhotoSave).not.toHaveBeenCalled();
  });
});
