import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://xyudcdgjyormlokwhfoi.supabase.co','sb_publishable_-gMviWXPBzov-2D-htf9iA_y6ZVV-q0',{auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
const $=id=>document.getElementById(id);
const setText=(id,value)=>{$(id).textContent=value};
const show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
let user=null,page=null,submissions=[],busy=false,previewUrl=null;
const categories={logo:['image/png','image/jpeg','image/webp'],artwork:['image/png','image/jpeg','image/webp'],track:['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav'],reel:['video/mp4','video/quicktime','video/webm']};
const extensions={logo:'.png,.jpg,.jpeg,.webp',artwork:'.png,.jpg,.jpeg,.webp',track:'.mp3,.m4a,.wav',reel:'.mp4,.mov,.webm'};
const readableKind={logo:'Artist logo',artwork:'Artwork',track:'Music track',reel:'Video Reel'};
const publicLink=slug=>'https://intentionalnoise.band/'+encodeURIComponent(slug);
function status(id,msg){setText(id,msg)}
function escapeText(s){return String(s||'').slice(0,130)}
function httpsImage(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}}
function portraitInitials(name){const words=String(name||'Artist').trim().split(/\s+/).filter(Boolean);return (words.length>1?words.slice(0,2).map(s=>s[0]).join(''):words[0].slice(0,2)).toUpperCase()}
async function updateArtistPortrait(){
 if(!page||!user)return;
 const name=$('artistName').textContent;
 $('artistPortraitInitials').textContent=portraitInitials(name);
 const image=$('artistPortrait');
 image.hidden=true;image.removeAttribute('src');
 const logos=submissions.filter(x=>x.kind==='logo'&&x.status==='approved');
 const art=submissions.filter(x=>x.kind==='artwork'&&x.status==='approved').reverse();
 const choices=[...logos,{source_type:'link',external_url:page.logo_url},...art];
 const urls=[];
 for(const item of choices){
  if(item.source_type==='link'){const src=httpsImage(item.external_url);if(src&&!urls.includes(src))urls.push(src)}
  else if(item.source_type==='upload'&&item.storage_path){
   const {data,error}=await db.storage.from('artist-review').createSignedUrl(item.storage_path,600);
   if(!error&&data?.signedUrl&&!urls.includes(data.signedUrl))urls.push(data.signedUrl);
  }
 }
 let index=0;
 image.onload=()=>{image.hidden=false;$('artistPortraitNote').textContent='Saved image is ready. Public visitors see it only if your artist page is published.'};
 image.onerror=()=>{image.hidden=true;if(index<urls.length)image.src=urls[index++];else $('artistPortraitNote').textContent='No viewable artist image yet. Add a photo or a publicly accessible image link below.'};
 if(urls.length){$('artistPortraitNote').textContent='Checking your saved artist picture…';image.src=urls[index++];}
 else $('artistPortraitNote').textContent='No artist image yet. Upload one or link your existing photo; until then the name initials are your default.';
}
function jumpToPortraitMedia(method){
 $('mediaKind').value='logo';
 $('mediaMethod').value=method;
 $('mediaTitle').value='Artist profile image';
 setMethod();
 $('uploadPanel').scrollIntoView({behavior:'smooth',block:'start'});
 const target=method==='upload'?'mediaFile':'mediaUrl';
 $(target).focus({preventScroll:true});
}
function detailsSection(label,values){if(!Array.isArray(values)||values.length===0)return;const wrap=document.createElement('div');wrap.className='detail-row';const strong=document.createElement('strong');strong.textContent=label+': ';wrap.append(strong);wrap.append(document.createTextNode(values.join(', ')));$('details').append(wrap)}
async function refresh(){
 try{
  const {data:{user:account},error}=await db.auth.getUser();user=error?null:account;
  show('guest',!user);show('workspace',!!user);
  if(!user)return;
  const {data:profile,error:pe}=await db.from('musician_profiles').select('display_name,bio,roles,instruments,genres,available_for_gigs').eq('user_id',user.id).maybeSingle();
  if(pe)throw pe;
  if(!profile){show('workspace',false);show('completeProfile',true);return}
  show('completeProfile',false);
  setText('artistName',profile.display_name||'Artist');
  setText('artistBio',profile.bio||'No biography provided yet.');
  $('details').replaceChildren();
  const roleMap={musician:'Musician',sound_engineer:'Sound engineer',band:'Band',vocalist:'Vocalist',guitar:'Guitarist',bass:'Bassist',drums:'Drummer',keys:'Keyboard player',producer:'Producer',songwriter:'Songwriter'};
  detailsSection('Roles',(profile.roles||[]).map(x=>roleMap[x]||x));
  detailsSection('Instruments',profile.instruments||[]);
  detailsSection('Genres',profile.genres||[]);
  if(profile.available_for_gigs)detailsSection('Gigs',['Available for gigs']);
  const {data:artist,error:ae}=await db.from('artist_pages').select('slug,published,logo_url,showcase_url').eq('user_id',user.id).maybeSingle();
  if(ae)throw ae;
  page=artist;
  if(!page){show('workspace',false);show('completeProfile',true);return}
  setText('publicationStatus',page.published?'Public':'Private draft');
  $('publicationStatus').className=page.published?'state live':'state';
  $('publish').disabled=page.published;
  $('unpublish').disabled=!page.published;
  $('urlSlug').value=page.slug||'';
  $('urlSlug').disabled=page.published;
  $('saveSlug').disabled=page.published;
  const url=publicLink(page.slug);
  $('publicUrl').href=url;
  $('publicUrl').textContent=page.published?url:'Your public link activates after publishing';
  $('publicUrl').classList.toggle('disabled-link',!page.published);
  const nav=$('publicViewLink');
  nav.href=page.published?url:'#publishPanel';
  nav.classList.toggle('disabled-link',!page.published);
  nav.setAttribute('aria-disabled',String(!page.published));
  setText('publicNote',page.published?'Your artist page is live. Visitors see the media you choose to share.':'Your artist-page draft was created automatically from Connect. Publish when you are ready.');
  await loadSubmissions();
 }catch(e){status('pageMessage','Unable to load your artist page: '+(e.message||'Please refresh.'))}
}
async function loadSubmissions(){
 const {data,error}=await db.from('artist_media_submissions').select('id,title,kind,source_type,storage_path,external_url,status,review_note,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(75);
 if(error){status('submissionsStatus','Could not load your saved media: '+error.message);return}
 submissions=data||[];
 await updateArtistPortrait();
 const {data:previewRows}=await db.from('connect_work_previews')
  .select('title').eq('user_id',user.id).neq('status','rejected').limit(10);
 const previewTitles=new Set((previewRows||[]).map(v=>normalizedTitle(v.title)));
 const list=$('submissionList');list.replaceChildren();
 if(submissions.length===0){const p=document.createElement('p');p.className='muted';p.textContent='No media added yet. Add your first image, track or Reel above.';list.append(p);return}
 for(const item of submissions){
  const article=document.createElement('article');article.className='submission';
  const head=document.createElement('div');head.className='submission-head';
  const label=document.createElement('strong');label.textContent=item.title;
  const state=document.createElement('span');state.className='state '+(item.status==='approved'?'live':item.status==='rejected'?'rejected':'');state.textContent=item.status==='pending'?'Not shared yet':item.status==='approved'?(page?.published?'Shared on public page':'Ready for your public page'):'Taken offline';
  head.append(label,state);
  const desc=document.createElement('p');desc.className='muted';desc.textContent=(readableKind[item.kind]||item.kind)+' · '+(item.source_type==='upload'?'Hosted upload':'Storage/website link');
  if(previewTitles.has(normalizedTitle(item.title)))desc.textContent+=' · ALSO POSTED IN 60-SECOND PREVIEWS';
  article.append(head,desc);
  if(item.review_note){const p=document.createElement('p');p.textContent='Moderation note: '+item.review_note;article.append(p)}
  if(item.status==='pending'){
   const share=document.createElement('button');share.type='button';share.className='secondary compact';share.textContent='Share this saved item';share.addEventListener('click',()=>sharePending(item,share));article.append(share);
  }
  if(item.status==='approved'){
   const edit=document.createElement('button');edit.type='button';edit.className='secondary compact';
   edit.textContent='Edit title or source';edit.addEventListener('click',()=>editMedia(item,article,edit));article.append(edit);
  }
  const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary compact';cancel.textContent='Remove media';cancel.addEventListener('click',()=>removeSubmission(item,cancel));article.append(cancel);
  list.append(article);
 }
 status('submissionsStatus',submissions.length+' media submission'+(submissions.length===1?'':'s')+' saved.');
}
async function sharePending(item,button){
 if(busy||!user||item.status!=='pending')return;
 busy=true;button.disabled=true;status('mediaStatus','Sharing saved media…');
 try{
  const {data,error}=await db.from('artist_media_submissions').update({status:'approved'}).eq('id',item.id).eq('user_id',user.id).eq('status','pending').select('id');
  if(error)throw error;
  if(!data?.length)throw Error('This item could not be shared. Refresh and try again.');
  status('mediaStatus','Saved item shared. It will appear when your artist page is public.');
  await loadSubmissions();
 }catch(e){status('mediaStatus','Could not share: '+e.message);button.disabled=false;}
 finally{busy=false}
}
function editMedia(item,article,button){
 if(busy||article.querySelector('.inline-media-editor'))return;
 button.disabled=true;
 const form=document.createElement('form');form.className='inline-media-editor';
 form.style.cssText='margin-top:14px;padding:14px;border:1px solid #6a9ba5;border-radius:9px';
 const make=(tag,label,value,required=false)=>{
  const wrapper=document.createElement('label');wrapper.textContent=label;
  const input=document.createElement(tag);input.value=value||'';input.required=required;
  input.style.cssText='display:block;width:100%;margin-top:6px;padding:11px;border-radius:8px;background:#0c202a;color:#fff;border:1px solid #78949e;font:inherit';
  wrapper.append(input);form.append(wrapper);return input;
 };
 const title=make('input','Media title',item.title,true);title.maxLength=120;
 const url=make('input',item.source_type==='link'?'External share link':'Optional: replace hosted upload with an HTTPS share link',item.external_url,item.source_type==='link');
 url.type='url';url.placeholder='https://...';url.maxLength=2048;
 const hint=document.createElement('p');hint.className='hint';
 hint.textContent=item.source_type==='upload'?'Leave this blank to keep your uploaded file. If you enter a link, the hosted copy will be removed after the link is saved. Other previews are unaffected.':'Change only this public media link. Your private storage shortcut is not changed.';
 form.append(hint);
 const actions=document.createElement('div');actions.className='actions';
 const save=document.createElement('button');save.type='submit';save.textContent='Save changes';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent='Cancel';
 cancel.addEventListener('click',()=>{form.remove();button.disabled=false});
 actions.append(save,cancel);form.append(actions);article.append(form);
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||!user)return;
  const t=title.value.trim(),link=url.value.trim(),replacing=item.source_type==='upload'&&!!link;
  if(!t||t.length>120){status('mediaStatus','Enter a title up to 120 characters.');return}
  let href=null;
  if(link){try{const u=new URL(link);if(u.protocol!=='https:')throw Error();href=u.href}
   catch{status('mediaStatus','Use a complete HTTPS share link.');return}}
  if(item.source_type==='link'&&!href){status('mediaStatus','The shared media link cannot be empty.');return}
  if(replacing&&!confirm('Replace this hosted upload with your external link and remove its hosted file? This does not remove the separate 60-second preview.'))return;
  busy=true;save.disabled=true;
  try{
   const changes={title:t};
   if(item.source_type==='link')changes.external_url=href;
   if(replacing)Object.assign(changes,{source_type:'link',external_url:href,storage_path:null,mime_type:null,file_size:null});
   const {data,error}=await db.from('artist_media_submissions').update(changes)
    .eq('id',item.id).eq('user_id',user.id).eq('status','approved').select('id');
   if(error)throw error;if(!data?.length)throw Error('This item was not updated. Please refresh.');
   let cleanupError=null;
   if(replacing&&item.storage_path){const cleanup=await db.storage.from('artist-review').remove([item.storage_path]);cleanupError=cleanup.error}
   status('mediaStatus',cleanupError?'Changes saved, but the old hosted file could not be removed: '+cleanupError.message:'Media changes saved.');
   await loadSubmissions();
  }catch(error){status('mediaStatus','Could not save changes: '+(error.message||error));save.disabled=false}
  finally{busy=false}
 });
}
async function removeSubmission(item,button){
 if(busy||!user)return;
 if(!confirm('Remove "'+item.title+'" from your artist page?'+(item.source_type==='upload'?' Its hosted file will also be deleted.':'')))return;
 busy=true;button.disabled=true;status('mediaStatus','Removing your media…');
 const {error}=await db.from('artist_media_submissions').delete().eq('id',item.id).eq('user_id',user.id);
 if(error){status('mediaStatus','Could not remove: '+error.message);button.disabled=false;busy=false;return}
 let cleanup=null;
 if(item.source_type==='upload'&&item.storage_path){const result=await db.storage.from('artist-review').remove([item.storage_path]);cleanup=result.error}
 busy=false;status('mediaStatus',cleanup?'Media listing removed; hosted file cleanup failed: '+cleanup.message:'Media removed.');await loadSubmissions();
}
function setMethod(){
 const upload=$('mediaMethod').value==='upload';
 show('uploadArea',upload);show('linkArea',!upload);
 updateFileAccept();preview();
}
function inferKind(file){
 if(!file)return null;
 const type=(file.type||'').toLowerCase(),name=(file.name||'').toLowerCase();
 if(type.startsWith('video/')||/\.(mp4|mov|webm)$/.test(name))return 'reel';
 if(type.startsWith('audio/')||/\.(mp3|m4a|wav)$/.test(name))return 'track';
 if(type.startsWith('image/')||/\.(png|jpe?g|webp)$/.test(name))return $('mediaKind').value==='logo'?'logo':'artwork';
 return null;
}
function updateFileAccept(){
 $('mediaFile').accept='.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.mp4,.mov,.webm,image/*,audio/*,video/*';
 $('fileLabel').textContent='Drop artwork, music or a video Reel here, or click to select';
 const file=$('mediaFile').files?.[0];
 if(file)updatePreviewContent(file);
}
function autoSelectKind(file){
 const kind=inferKind(file);
 if(kind){$('mediaKind').value=kind;$('fileLabel').textContent='Detected '+readableKind[kind]+': drop another file or click to change';}
 else {$('fileLabel').textContent='Unrecognized file format: choose an image, audio file or video.';}
 return kind;
}
function updatePreviewContent(file){
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
 const area=$('preview');area.replaceChildren();
 if(!file){status('fileName','No file selected');return}
 const kind=autoSelectKind(file);
 status('fileName',file.name+' · '+(file.size/1024/1024).toFixed(1)+' MB'+(kind?' · '+readableKind[kind]+' detected':' · Unsupported type'));
 if(!kind)return;
 previewUrl=URL.createObjectURL(file);
 const elem=kind==='logo'||kind==='artwork'?document.createElement('img'):kind==='reel'?document.createElement('video'):document.createElement('audio');
 elem.src=previewUrl;elem.className='media-preview';
 if(kind==='reel'||kind==='track'){elem.controls=true;elem.preload='metadata'}
 elem.setAttribute('aria-label','Local preview; not publicly uploaded');
 area.append(elem);
 if(!$('mediaTitle').value.trim())$('mediaTitle').value=file.name.replace(/\.[^.]+$/,'').slice(0,120);
}
function preview(){
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
 $('preview').replaceChildren();
 const file=$('mediaFile').files?.[0];
 if($('mediaMethod').value==='upload'){updatePreviewContent(file);return}
 const link=$('mediaUrl').value.trim();
 if(link){const p=document.createElement('p');p.textContent='Link ready to share: '+link.slice(0,180);$('preview').append(p)}
}
function chooseFiles(files){const file=files?.[0];if(!file)return;const dt=new DataTransfer();dt.items.add(file);$('mediaFile').files=dt.files;updatePreviewContent(file)}
function validMime(file,kind){return !!file&&categories[kind].includes(file.type)}
function reelDuration(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const video=document.createElement('video');video.preload='metadata';video.onloadedmetadata=()=>{const d=video.duration;URL.revokeObjectURL(url);resolve(d)};video.onerror=()=>{URL.revokeObjectURL(url);reject(Error('This video cannot be checked. Use an MP4, MOV or WebM Reel.'))};video.src=url;});}
function extension(file){const s=file.name.toLowerCase();const match=s.match(/\.[a-z0-9]{2,5}$/);return match?match[0]:'.bin'}
const normalizedTitle=v=>String(v||'').toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
async function duplicatePostingMatches(title,externalUrl){
 const [artist,previews]=await Promise.all([
  db.from('artist_media_submissions').select('title,external_url,status').eq('user_id',user.id).neq('status','rejected').limit(100),
  db.from('connect_work_previews').select('title,status').eq('user_id',user.id).neq('status','rejected').limit(10)
 ]);
 if(artist.error||previews.error)throw artist.error||previews.error;
 const sameTitle=normalizedTitle(title), matches=[];
 for(const item of artist.data||[])if(normalizedTitle(item.title)===sameTitle||(externalUrl&&item.external_url===externalUrl))matches.push('artist-page media: '+item.title);
 for(const item of previews.data||[])if(normalizedTitle(item.title)===sameTitle)matches.push('60-second preview: '+item.title);
 return matches;
}
async function submitMedia(event){
 event.preventDefault();
 if(busy||!user||!page)return;
 const kind=$('mediaKind').value,method=$('mediaMethod').value,title=$('mediaTitle').value.trim();
 const file=$('mediaFile').files?.[0],link=$('mediaUrl').value.trim();
 if(!title||title.length>120){status('mediaStatus','Enter a title (up to 120 characters).');return}
 if(!$('mediaRules').checked){status('mediaStatus','Confirm your rights and the content rules before sharing.');return}
 let urlObj=null;
 if(method==='link'){try{urlObj=new URL(link);if(urlObj.protocol!=='https:')throw Error('HTTPS required')}catch{status('mediaStatus','Paste a complete secure link beginning with https://');return}}
 else{
  if(!validMime(file,kind)){status('mediaStatus','This file type is not allowed for '+readableKind[kind]+'.');return}
  if(file.size>50*1024*1024||file.size===0){status('mediaStatus','Upload a nonempty file smaller than 50 MB.');return}
  if(kind==='reel'){try{const duration=await reelDuration(file);if(!Number.isFinite(duration)||duration>60||duration<=0){status('mediaStatus','Reels must be 60 seconds or shorter.');return}}catch(e){status('mediaStatus',e.message);return}}
 }
 let intentionalDuplicate=false;
 try{
  const existing=await duplicatePostingMatches(title,method==='link'?urlObj.href:null);
  if(existing.length){
   if(!confirm('POSSIBLE DUPLICATE POSTING\\n\\nThis work may already be posted as:\\n'+existing.slice(0,8).join('\\n')+'\\n\\nDo you INTEND to post another copy? Select Cancel to review your existing media.')){status('mediaStatus','Duplicate posting cancelled. Edit or remove the existing version below if needed.');return}
   intentionalDuplicate=true;
  }
 }catch(error){status('mediaStatus','Could not check for duplicate posts: '+(error.message||error)+'. Please try again.');return}
 busy=true;$('submitMedia').disabled=true;status('mediaStatus',method==='upload'?'Saving your media…':'Saving your link…');
 let path=null;
 try{
  if(method==='upload'){
   path=user.id+'/'+crypto.randomUUID()+extension(file);
   const {error}=await db.storage.from('artist-review').upload(path,file,{contentType:file.type,upsert:false});
   if(error)throw error;
  }
  const row={user_id:user.id,kind,source_type:method,storage_path:path,external_url:method==='link'?urlObj.href:null,title, mime_type:method==='upload'?file.type:null,file_size:method==='upload'?file.size:null,status:'approved',rights_confirmed:true,rules_accepted:true,intentional_duplicate:intentionalDuplicate};
  const {error}=await db.from('artist_media_submissions').insert(row);
  if(error)throw error;
  $('mediaForm').reset();setMethod();status('mediaStatus','Saved! Your '+readableKind[kind].toLowerCase()+' is ready for your public artist page. If your page is already public, it can appear there now.');await loadSubmissions();
 }catch(e){if(path)await db.storage.from('artist-review').remove([path]);status('mediaStatus','Could not save: '+(e.message||'Please try again.'))}
 finally{busy=false;$('submitMedia').disabled=false}
}
async function saveSlug(){
 if(busy||!page||page.published)return;
 const slug=$('urlSlug').value.trim().toLowerCase();
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length<3||slug.length>90){status('publishMessage','Use 3–90 letters, numbers and hyphens.');return}
 busy=true;$('saveSlug').disabled=true;
 const {error}=await db.from('artist_pages').update({slug}).eq('user_id',user.id);
 busy=false;status('publishMessage',error?'Address unavailable: '+error.message:'Your page link was saved.');
 await refresh();
}
async function publish(visible){
 if(busy||!page)return;
 if(visible&&!$('publishRules').checked){status('publishMessage','Accept the public profile rules to publish.');return}
 busy=true;$('publish').disabled=true;$('unpublish').disabled=true;
 status('publishMessage',visible?'Publishing your artist page…':'Making your profile private…');
 const {error}=await db.rpc('set_my_artist_page_publication',{p_publish:visible,p_accept_rules:visible&&$('publishRules').checked});
 busy=false;status('publishMessage',error?'Publication failed: '+error.message:visible?'Your artist profile is now public.':'Your page is now private.');
 await refresh();
}
$('choosePortraitUpload').addEventListener('click',()=>jumpToPortraitMedia('upload'));
$('choosePortraitLink').addEventListener('click',()=>jumpToPortraitMedia('link'));
$('mediaMethod').addEventListener('change',setMethod);
$('mediaKind').addEventListener('change',()=>{const file=$('mediaFile').files?.[0];if(file){autoSelectKind(file);updatePreviewContent(file)}else updateFileAccept();});
$('mediaFile').addEventListener('change',()=>updatePreviewContent($('mediaFile').files?.[0]));
$('mediaUrl').addEventListener('change',preview);
$('dropZone').addEventListener('dragover',e=>{e.preventDefault();$('dropZone').classList.add('dragging')});
$('dropZone').addEventListener('dragleave',()=>{$('dropZone').classList.remove('dragging')});
$('dropZone').addEventListener('drop',e=>{e.preventDefault();$('dropZone').classList.remove('dragging');chooseFiles(e.dataTransfer.files)});
$('mediaForm').addEventListener('submit',submitMedia);
$('saveSlug').addEventListener('click',saveSlug);
$('publish').addEventListener('click',()=>publish(true));
$('unpublish').addEventListener('click',()=>publish(false));
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(refresh,0)});
if(new URLSearchParams(location.search).get('source')==='link')$('mediaMethod').value='link';
setMethod();await refresh();