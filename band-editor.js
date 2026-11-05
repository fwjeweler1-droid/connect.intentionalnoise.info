import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://xyudcdgjyormlokwhfoi.supabase.co','sb_publishable_-gMviWXPBzov-2D-htf9iA_y6ZVV-q0',{auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
const $=id=>document.getElementById(id);
const setText=(id,value)=>{$(id).textContent=value};
const show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
let user=null,page=null,submissions=[],busy=false,previewUrl=null;
const categories={logo:['image/png','image/jpeg','image/webp'],artwork:['image/png','image/jpeg','image/webp'],track:['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav'],reel:['video/mp4','video/quicktime','video/webm']};
const extensions={logo:'.png,.jpg,.jpeg,.webp',artwork:'.png,.jpg,.jpeg,.webp',track:'.mp3,.m4a,.wav',reel:'.mp4,.mov,.webm'};
const readableKind={logo:'Artist logo',artwork:'Artwork',track:'Music track',reel:'Video Reel'};
const publicLink=slug=>'https://intentionalnoise.band/public-artist.html?slug='+encodeURIComponent(slug);
function status(id,msg){setText(id,msg)}
function escapeText(s){return String(s||'').slice(0,130)}
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
  setText('publicNote',page.published?'Your artist page is live. Visitors see approved material only.':'Your artist-page draft was created automatically from Connect. Publish when you are ready.');
  await loadSubmissions();
 }catch(e){status('pageMessage','Unable to load your artist page: '+(e.message||'Please refresh.'))}
}
async function loadSubmissions(){
 const {data,error}=await db.from('artist_media_submissions').select('id,title,kind,source_type,storage_path,external_url,status,review_note,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(75);
 if(error){status('submissionsStatus','Could not load your saved media: '+error.message);return}
 submissions=data||[];
 const list=$('submissionList');list.replaceChildren();
 if(submissions.length===0){const p=document.createElement('p');p.className='muted';p.textContent='Nothing submitted yet. Add your first image, track, or Reel above.';list.append(p);return}
 for(const item of submissions){
  const article=document.createElement('article');article.className='submission';
  const head=document.createElement('div');head.className='submission-head';
  const label=document.createElement('strong');label.textContent=item.title;
  const state=document.createElement('span');state.className='state '+(item.status==='approved'?'live':item.status==='rejected'?'rejected':'');state.textContent=item.status==='pending'?'Awaiting review':item.status==='approved'?'Approved':'Needs changes';
  head.append(label,state);
  const desc=document.createElement('p');desc.className='muted';desc.textContent=(readableKind[item.kind]||item.kind)+' · '+(item.source_type==='upload'?'Uploaded file':'Storage/website link');
  article.append(head,desc);
  if(item.review_note){const p=document.createElement('p');p.textContent='Review note: '+item.review_note;article.append(p)}
  if(item.status==='pending'){
   const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary compact';cancel.textContent='Remove submission';cancel.addEventListener('click',()=>removeSubmission(item,cancel));article.append(cancel);
  }
  list.append(article);
 }
 status('submissionsStatus',submissions.length+' media submission'+(submissions.length===1?'':'s')+' saved.');
}
async function removeSubmission(item,button){
 if(busy||!user)return;
 busy=true;button.disabled=true;status('mediaStatus','Removing your pending submission…');
 const {error}=await db.from('artist_media_submissions').delete().eq('id',item.id).eq('user_id',user.id).eq('status','pending');
 if(error){status('mediaStatus','Could not remove: '+error.message);button.disabled=false;busy=false;return}
 if(item.source_type==='upload'&&item.storage_path){await db.storage.from('artist-review').remove([item.storage_path])}
 busy=false;status('mediaStatus','Pending submission removed.');await loadSubmissions();
}
function setMethod(){
 const upload=$('mediaMethod').value==='upload';
 show('uploadArea',upload);show('linkArea',!upload);
 updateFileAccept();preview();
}
function updateFileAccept(){$('mediaFile').accept=extensions[$('mediaKind').value];$('fileLabel').textContent='Drag a '+readableKind[$('mediaKind').value].toLowerCase()+' here, or click to select';$('mediaFile').value='';preview()}
function updatePreviewContent(file){
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
 const area=$('preview');area.replaceChildren();
 if(!file){status('fileName','No file selected');return}
 status('fileName',file.name+' · '+(file.size/1024/1024).toFixed(1)+' MB');
 previewUrl=URL.createObjectURL(file);
 const kind=$('mediaKind').value;
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
 if(link){const p=document.createElement('p');p.textContent='Link submitted for review: '+link.slice(0,180);$('preview').append(p)}
}
function chooseFiles(files){const file=files?.[0];if(!file)return;const dt=new DataTransfer();dt.items.add(file);$('mediaFile').files=dt.files;updatePreviewContent(file)}
function validMime(file,kind){return !!file&&categories[kind].includes(file.type)}
function reelDuration(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const video=document.createElement('video');video.preload='metadata';video.onloadedmetadata=()=>{const d=video.duration;URL.revokeObjectURL(url);resolve(d)};video.onerror=()=>{URL.revokeObjectURL(url);reject(Error('This video cannot be checked. Use an MP4, MOV or WebM Reel.'))};video.src=url;});}
function extension(file){const s=file.name.toLowerCase();const match=s.match(/\.[a-z0-9]{2,5}$/);return match?match[0]:'.bin'}
async function submitMedia(event){
 event.preventDefault();
 if(busy||!user||!page)return;
 const kind=$('mediaKind').value,method=$('mediaMethod').value,title=$('mediaTitle').value.trim();
 const file=$('mediaFile').files?.[0],link=$('mediaUrl').value.trim();
 if(!title||title.length>120){status('mediaStatus','Enter a title (up to 120 characters).');return}
 if(!$('mediaRules').checked){status('mediaStatus','Confirm your rights and the content rules before submitting.');return}
 let urlObj=null;
 if(method==='link'){try{urlObj=new URL(link);if(urlObj.protocol!=='https:')throw Error('HTTPS required')}catch{status('mediaStatus','Paste a complete secure link beginning with https://');return}}
 else{
  if(!validMime(file,kind)){status('mediaStatus','This file type is not allowed for '+readableKind[kind]+'.');return}
  if(file.size>50*1024*1024||file.size===0){status('mediaStatus','Upload a nonempty file smaller than 50 MB.');return}
  if(kind==='reel'){try{const duration=await reelDuration(file);if(!Number.isFinite(duration)||duration>60||duration<=0){status('mediaStatus','Reels must be 60 seconds or shorter.');return}}catch(e){status('mediaStatus',e.message);return}}
 }
 busy=true;$('submitMedia').disabled=true;status('mediaStatus',method==='upload'?'Uploading privately for review…':'Saving link for review…');
 let path=null;
 try{
  if(method==='upload'){
   path=user.id+'/'+crypto.randomUUID()+extension(file);
   const {error}=await db.storage.from('artist-review').upload(path,file,{contentType:file.type,upsert:false});
   if(error)throw error;
  }
  const row={user_id:user.id,kind,source_type:method,storage_path:path,external_url:method==='link'?urlObj.href:null,title, mime_type:method==='upload'?file.type:null,file_size:method==='upload'?file.size:null,status:'pending',rights_confirmed:true,rules_accepted:true};
  const {error}=await db.from('artist_media_submissions').insert(row);
  if(error)throw error;
  $('mediaForm').reset();setMethod();status('mediaStatus','Saved privately. Your '+readableKind[kind].toLowerCase()+' is awaiting review—not public yet.');await loadSubmissions();
 }catch(e){if(path)await db.storage.from('artist-review').remove([path]);status('mediaStatus','Could not submit: '+(e.message||'Please try again.'))}
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
 status('publishMessage',visible?'Making your text profile public…':'Making your profile private…');
 const {error}=await db.rpc('set_my_artist_page_publication',{p_publish:visible,p_accept_rules:visible&&$('publishRules').checked});
 busy=false;status('publishMessage',error?'Publication failed: '+error.message:visible?'Your artist profile is now public.':'Your page is now private.');
 await refresh();
}
$('mediaMethod').addEventListener('change',setMethod);
$('mediaKind').addEventListener('change',updateFileAccept);
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
setMethod();await refresh();