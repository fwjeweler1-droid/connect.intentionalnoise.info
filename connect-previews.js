import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://xyudcdgjyormlokwhfoi.supabase.co','sb_publishable_-gMviWXPBzov-2D-htf9iA_y6ZVV-q0',{auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
const $=id=>document.getElementById(id),show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
let member=null,clips=[],uploading=false,previewObjectUrl=null;
const types=new Set(['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','video/mp4','video/quicktime','video/webm']);
const memberParam=new URLSearchParams(location.search).get('member');
const viewingOther=!!memberParam&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(memberParam);
function note(msg){$('status').textContent=msg;}
function setCounter(){ $('count').textContent=clips.length+' of 5 slots in use';$('save').disabled=clips.length>=5||uploading; }
async function createPlayer(row,parent){
 const {data,error}=await db.storage.from('connect-clips').createSignedUrl(row.file_path,1200);
 if(error||!data?.signedUrl){const p=document.createElement('p');p.textContent='Preview unavailable. '+(error?.message||'');parent.append(p);return}
 const el=document.createElement(row.media_type==='video'?'video':'audio');el.src=data.signedUrl;el.controls=true;el.preload='none';el.className='media';if(row.media_type==='video')el.playsInline=true;parent.append(el);
}
function printRows(rows,isOwner){
 const root=$('clipList');root.replaceChildren();
 if(!rows.length){const empty=document.createElement('p');empty.className='muted';empty.textContent=isOwner?'No works yet. Add up to five audio/video previews.':'No approved work previews are available to your audience.';root.append(empty);return}
 for(const row of rows){
  const card=document.createElement('article');card.className='clip';
  const name=document.createElement('h3');name.textContent=row.title;
  const info=document.createElement('p');info.className='muted';
  info.textContent=(row.media_type==='audio'?'Audio':'Video')+' · '+Number(row.duration_seconds).toFixed(0)+' sec · '+(row.audience==='members'?'Connect members':'Public')+(isOwner?' · '+(row.status==='pending'?'Awaiting review':row.status==='approved'?'Approved':'Needs changes'):'');
  card.append(name,info);
  if(row.status==='approved'){createPlayer(row,card)}
  else if(isOwner){
    const p=document.createElement('p');p.textContent=row.status==='pending'?'Your work is stored privately for content review.':(row.review_note||'This submission needs a correction.');card.append(p);
  }
  if(isOwner){const btn=document.createElement('button');btn.type='button';btn.className='alt';btn.textContent='Remove this work';btn.addEventListener('click',async()=>{
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
 if(!viewingOther)setCounter();
 printRows(clips,!viewingOther);
 if(viewingOther){const {data:profile}=await db.from('artist_pages').select('display_name').eq('user_id',id).eq('published',true).maybeSingle();$('heading').textContent=profile?.display_name?profile.display_name+' · Work previews':'Musician work previews'}
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
 uploading=true;setCounter();note('Saving your preview privately…');
 let path=null;
 try{
  const ext=(f.name.toLowerCase().match(/\.[a-z0-9]{2,5}$/)||['.dat'])[0];
  path=member.id+'/'+crypto.randomUUID()+ext;
  const {error:se}=await db.storage.from('connect-clips').upload(path,f,{contentType:f.type,upsert:false});
  if(se)throw se;
  const row={user_id:member.id,title,media_type:f.type.startsWith('video/')?'video':'audio',file_path:path,mime_type:f.type,duration_seconds:Math.round(dur*100)/100,audience:$('audience').value};
  const {error:de}=await db.from('connect_work_previews').insert(row);
  if(de)throw de;
  $('uploadForm').reset();renderFile();note('Saved! This work is pending review and not yet visible to others.');
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