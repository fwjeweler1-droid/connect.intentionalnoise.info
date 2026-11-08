import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://xyudcdgjyormlokwhfoi.supabase.co','sb_publishable_-gMviWXPBzov-2D-htf9iA_y6ZVV-q0',{auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
const $=id=>document.getElementById(id),show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
let member=null,clips=[],uploading=false,previewObjectUrl=null,artistTitles=new Set();
const types=new Set(['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','video/mp4','video/quicktime','video/webm']);
const memberParam=new URLSearchParams(location.search).get('member');
const viewingOther=!!memberParam&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(memberParam);
function note(msg){$('status').textContent=msg;}
function setCounter(){ $('count').textContent=clips.length+' of 5 slots in use';$('save').disabled=clips.length>=5||uploading; }
async function createPlayer(row,parent){
 const {data,error}=await db.storage.from('connect-clips').createSignedUrl(row.file_path,120);
 if(error||!data?.signedUrl){const p=document.createElement('p');p.textContent='Preview unavailable. '+(error?.message||'');parent.append(p);return}
 const el=document.createElement(row.media_type==='video'?'video':'audio');el.src=data.signedUrl;el.controls=true;el.preload='none';el.className='media';if(row.media_type==='video')el.playsInline=true;parent.append(el);
}
function editPreviewTitle(row,card,button){
 if(uploading||card.querySelector('form.preview-title-editor'))return;
 button.disabled=true;
 const form=document.createElement('form');form.className='preview-title-editor';
 form.style.cssText='margin-top:12px;padding:14px;border:1px solid #6b9da6;border-radius:9px';
 const label=document.createElement('label');label.textContent='Change preview title';
 const input=document.createElement('input');input.type='text';input.maxLength=120;input.required=true;input.value=row.title;
 input.style.cssText='display:block;width:100%;margin-top:8px';
 label.append(input);form.append(label);
 const save=document.createElement('button');save.type='submit';save.textContent='Save title';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.className='alt';cancel.style.marginLeft='10px';
 cancel.addEventListener('click',()=>{form.remove();button.disabled=false});
 form.append(save,cancel);card.append(form);
 form.addEventListener('submit',async event=>{
  event.preventDefault();const title=input.value.trim();
  if(!title||title.length>120){note('Enter a title between 1 and 120 characters.');return}
  save.disabled=true;
  const {data,error}=await db.from('connect_work_previews').update({title})
   .eq('id',row.id).eq('user_id',member.id).eq('status','approved').select('id');
  if(error||!data?.length){note('Could not update title: '+(error?.message||'Refresh and try again.'));save.disabled=false;return}
  await loadClips();note('Preview title updated.');
 });
}
function printRows(rows,isOwner){
 const root=$('clipList');root.replaceChildren();
 if(!rows.length){const empty=document.createElement('p');empty.className='muted';empty.textContent=isOwner?'No works yet. Add up to five audio/video previews.':'No approved work previews are available to your audience.';root.append(empty);return}
 for(const row of rows){
  const card=document.createElement('article');card.className='clip';
  const name=document.createElement('h3');name.textContent=row.title;
  const info=document.createElement('p');info.className='muted';
  info.textContent=(row.media_type==='audio'?'Audio':'Video')+' · '+Number(row.duration_seconds).toFixed(0)+' sec · '+(row.audience==='members'?'Connect members':'Public')+(isOwner?' · '+(row.status==='pending'?'Processing':row.status==='approved'?'Shared':'Taken offline'):'');
  card.append(name,info);
  if(isOwner&&artistTitles.has(normalizeTitle(row.title))){
   const duplicate=document.createElement('p');duplicate.className='muted';
   duplicate.textContent='Also posted in your public artist media. Edit or remove one if the repeat was unintentional.';
   card.append(duplicate);
  }
  if(row.status==='approved'||isOwner){createPlayer(row,card)}
  else if(isOwner){
    const p=document.createElement('p');p.textContent=row.status==='pending'?'Your work is stored privately for content review.':(row.review_note||'This submission needs a correction.');card.append(p);
  }
  if(!isOwner&&row.status==='approved'){const btn=document.createElement('button');btn.type='button';btn.className='alt';btn.textContent='Report this work';btn.addEventListener('click',async()=>{const reason=prompt('Describe the problem with this recording (12 characters minimum):');if(reason===null)return;if(reason.trim().length<12){note('Please provide at least 12 characters.');return}btn.disabled=true;const {data,error}=await db.rpc('report_connect_clip',{p_clip_id:row.id,p_reason:reason.trim()});note(error?'Could not file report: '+error.message:(data||'Report received.'));btn.disabled=false});card.append(btn)}
  if(isOwner){
   if(row.status==='approved'){
    const edit=document.createElement('button');edit.type='button';edit.className='alt';edit.textContent='Edit title';
    edit.addEventListener('click',()=>editPreviewTitle(row,card,edit));card.append(edit);
   }
   const btn=document.createElement('button');btn.type='button';btn.className='alt';btn.textContent='Remove this work';btn.addEventListener('click',async()=>{
    if(!confirm('Remove "'+row.title+'" from your preview slots? The hosted preview file will also be deleted.'))return;
    btn.disabled=true;note('Removing work…');
    const {error}=await db.from('connect_work_previews').delete().eq('id',row.id).eq('user_id',member.id);
    if(error){note(error.message);btn.disabled=false;return}
    await db.storage.from('connect-clips').remove([row.file_path]);await loadClips();note('Work removed.');
  });card.append(btn)}
  root.append(card);
 }
}
async function loadClips(){
 const id=viewingOther?memberParam:member?.id;
 if(!id)return;
 let query=db.from('connect_work_previews').select('id,title,media_type,file_path,duration_seconds,audience,status,review_note').eq('user_id',id).order('created_at',{ascending:false}).limit(5);
 if(viewingOther)query=query.eq('status','approved');
 const {data,error}=await query;
 if(error){note('Could not load previews: '+error.message);return}
 clips=data||[];
 if(!viewingOther){
  const {data:artistMedia}=await db.from('artist_media_submissions')
   .select('title').eq('user_id',member.id).neq('status','rejected').limit(100);
  artistTitles=new Set((artistMedia||[]).map(v=>normalizeTitle(v.title)));
  setCounter();
 }
 printRows(clips,!viewingOther);
 if(viewingOther){const {data:profile}=await db.from('artist_pages').select('display_name').eq('user_id',id).eq('published',true).maybeSingle();$('heading').textContent=profile?.display_name?profile.display_name+' · Work previews':'Musician work previews'}
}
const normalizeTitle=v=>String(v||'').toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
async function findDuplicatePosts(title){
 const [previews,artist]=await Promise.all([
  db.from('connect_work_previews').select('title,status').eq('user_id',member.id).neq('status','rejected').limit(10),
  db.from('artist_media_submissions').select('title,status').eq('user_id',member.id).neq('status','rejected').limit(100)
 ]);
 if(previews.error||artist.error)throw previews.error||artist.error;
 const key=normalizeTitle(title),matches=[];
 for(const row of previews.data||[])if(normalizeTitle(row.title)===key)matches.push('existing preview: '+row.title);
 for(const row of artist.data||[])if(normalizeTitle(row.title)===key)matches.push('artist-page media: '+row.title);
 return matches;
}
function checkDuration(file){
 return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file);const el=document.createElement(file.type.startsWith('video/')?'video':'audio');el.preload='metadata';el.onloadedmetadata=()=>{URL.revokeObjectURL(u);resolve(el.duration)};el.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Unable to read audio/video duration.'))};el.src=u;});
}
function renderFile(){
 const f=$('file').files?.[0];if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null}
 $('preview').replaceChildren();
 if(!f){$('filename').textContent='No file selected';return}
 $('filename').textContent=f.name+' · '+(f.size/1048576).toFixed(1)+' MB';
 if(!$('title').value.trim())$('title').value=f.name.replace(/\.[^.]+$/,'').slice(0,120);
 if(types.has(f.type)){previewObjectUrl=URL.createObjectURL(f);const el=document.createElement(f.type.startsWith('video/')?'video':'audio');el.src=previewObjectUrl;el.controls=true;el.preload='metadata';el.className='media';$('preview').append(el)}
}
$('file').addEventListener('change',renderFile);
$('drop').addEventListener('dragover',e=>{e.preventDefault();$('drop').classList.add('dragover')});
$('drop').addEventListener('dragleave',()=>$('drop').classList.remove('dragover'));
$('drop').addEventListener('drop',e=>{e.preventDefault();$('drop').classList.remove('dragover');const f=e.dataTransfer.files[0];if(!f)return;const dt=new DataTransfer();dt.items.add(f);$('file').files=dt.files;renderFile()});
$('uploadForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!member||uploading)return;
 if(clips.length>=5){note('Five previews maximum. Remove a work before adding another.');return}
 const f=$('file').files?.[0];const title=$('title').value.trim();
 if(!f||!types.has(f.type)||!(/^(audio|video)\//.test(f.type))){note('Only audio or video files are allowed.');return}
 if(f.size===0||f.size>52428800){note('File must be 50 MB or smaller.');return}
 if(!title||title.length>120){note('Enter a title up to 120 characters.');return}
 if(!$('rights').checked){note('Confirm you own or have permission to use the work and accept the content rules.');return}
 let dur;try{dur=await checkDuration(f)}catch(err){note(err.message);return}
 if(!Number.isFinite(dur)||dur<=0||dur>60){note('Each preview must be at most 60 seconds. Trim the work before uploading.');return}
 let intentionalDuplicate=false;
 try{
  const matches=await findDuplicatePosts(title);
  if(matches.length){
   if(!confirm('POSSIBLE DUPLICATE POSTING\\n\\nThis work may already appear as:\\n'+matches.slice(0,8).join('\\n')+'\\n\\nDo you INTEND to share another copy? Select Cancel to review the existing item.')){
    note('Duplicate posting cancelled. You can edit or remove an existing work below.');return;
   }
   intentionalDuplicate=true;
  }
 }catch(error){note('Could not check existing posts: '+(error.message||error)+'. Please try again.');return}
 uploading=true;setCounter();note('Saving your preview privately…');
 let path=null;
 try{
  const ext=(f.name.toLowerCase().match(/\.[a-z0-9]{2,5}$/)||['.dat'])[0];
  path=member.id+'/'+crypto.randomUUID()+ext;
  const {error:se}=await db.storage.from('connect-clips').upload(path,f,{contentType:f.type,upsert:false});
  if(se)throw se;
  const row={user_id:member.id,title,media_type:f.type.startsWith('video/')?'video':'audio',file_path:path,mime_type:f.type,duration_seconds:Math.round(dur*100)/100,audience:$('audience').value,intentional_duplicate:intentionalDuplicate};
  const {error:de}=await db.from('connect_work_previews').insert(row);
  if(de)throw de;
  $('uploadForm').reset();renderFile();note('Saved to your selected audience.');
 }catch(err){if(path)await db.storage.from('connect-clips').remove([path]);note('Could not save: '+(err.message||'Please try again.'))}
 finally{uploading=false;await loadClips();setCounter()}
});
async function loadModeratorLink(){
 const link=$('reviewLink');if(!link)return;link.hidden=true;
 try{const {data,error}=await db.rpc('is_connect_moderator');if(!error&&data===true)link.hidden=false}catch(e){}
}
async function start(){
 const {data:{user},error}=await db.auth.getUser();member=error?null:user;
 show('guest',!member&&!viewingOther);show('editor',!!member&&!viewingOther);show('publicHeader',viewingOther);
 if(viewingOther){await loadClips();note('Only reviewed works permitted for your audience appear here.');return}
 if(!member){const link=$('reviewLink');if(link)link.hidden=true;note('Sign in through Connect to share work.');return}
 const {data:profile}=await db.from('musician_profiles').select('display_name').eq('user_id',member.id).maybeSingle();
 $('heading').textContent=(profile?.display_name||'My')+' · Show my work';
 const share=$('shareLink');if(share){share.href='show-your-work.html?member='+encodeURIComponent(member.id);share.hidden=false}
 await loadModeratorLink();
 await loadClips();note('Free for members. A maximum of five audio/video previews, each 60 seconds or less.');
}
db.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_IN'||ev==='SIGNED_OUT')setTimeout(start,0)});
await start();