import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://xyudcdgjyormlokwhfoi.supabase.co','sb_publishable_-gMviWXPBzov-2D-htf9iA_y6ZVV-q0',{auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
const $=id=>document.getElementById(id);
const status=t=>{$('status').textContent=t};
let moderator=false,busy=false;
function setVisible(id,yes){$(id).hidden=!yes}
async function load(){
  status('Checking moderator access…');
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){setVisible('login',true);setVisible('work',false);status('Please sign in through Connect using an authorized reviewer account.');return}
  const {data, error}=await db.rpc('is_connect_moderator');
  moderator=!error&&data===true;
  setVisible('login',false);setVisible('denied',!moderator);setVisible('work',moderator);
  if(!moderator){status('Only designated moderators can review uploaded work.');return}
  await loadQueue();
  await loadReports();
}
async function loadQueue(){
  if(!moderator)return;
  const {data,error}=await db.from('connect_work_previews')
   .select('id,user_id,title,media_type,duration_seconds,file_path,audience,status,created_at,review_note,reviewed_at')
   .in('status',['pending','approved']).order('created_at',{ascending:true}).limit(100);
  if(error){status('Review queue unavailable: '+error.message);return}
  const pending=(data||[]).filter(x=>x.status==='pending'),approved=(data||[]).filter(x=>x.status==='approved');
  $('pendingList').replaceChildren();$('approvedList').replaceChildren();
  $('count').textContent=pending.length+' pending review'+(pending.length===1?'':'s');
  if(!pending.length){const p=document.createElement('p');p.textContent='No pending submissions.';$('pendingList').append(p)}
  for(const row of pending)render(row,$('pendingList'));
  if(!approved.length){const p=document.createElement('p');p.textContent='No approved previews yet.';$('approvedList').append(p)}
  for(const row of approved)render(row,$('approvedList'));
  status('Queue loaded. Shared works can be taken offline immediately if a complaint is substantiated.');
}
async function loadReports(){
 if(!moderator)return;
 const {data,error}=await db.from('connect_clip_reports').select('id,clip_id,reason,status,created_at').eq('status','open').order('created_at',{ascending:false}).limit(100);
 const root=$('reportList');if(!root)return;root.replaceChildren();
 if(error){status('Could not load reports: '+error.message);return}
 $('reportCount').textContent=(data||[]).length+' open complaints';
 if(!data?.length){const empty=document.createElement('p');empty.textContent='No complaints have been submitted.';root.append(empty);return}
 for(const report of data){
  const row=document.createElement('article');row.className='card';
  const heading=document.createElement('h3');heading.textContent='Reported recording';row.append(heading);
  const reason=document.createElement('p');reason.textContent=report.reason;row.append(reason);
  const when=document.createElement('p');when.className='small';when.textContent='Received '+new Date(report.created_at).toLocaleString();row.append(when);
  const clipButton=document.createElement('button');clipButton.className='subtle';clipButton.textContent='Find and review recording';clipButton.type='button';
  clipButton.addEventListener('click',()=>{const node=document.querySelector('[data-clip-id="'+report.clip_id+'"]');if(node){node.scrollIntoView({behavior:'smooth',block:'center'});node.style.outline='2px solid #ffe4a8'}else{status('Recording is already offline or has been removed.')}});
  row.append(clipButton);root.append(row);
 }
}
async function media(row,wrap){
 const {data,error}=await db.storage.from('connect-clips').createSignedUrl(row.file_path,600);
 if(error||!data?.signedUrl){const p=document.createElement('p');p.textContent='Cannot load this recording: '+(error?.message||'File unavailable');wrap.append(p);return}
 const el=document.createElement(row.media_type==='video'?'video':'audio');
 el.src=data.signedUrl;el.controls=true;el.preload='none';el.className='media';el.setAttribute('aria-label',row.title+' review');if(row.media_type==='video')el.playsInline=true;
 wrap.append(el);
}
function render(row,root){
 const card=document.createElement('article');card.className='card';card.dataset.clipId=row.id;
 const header=document.createElement('div');header.className='cardhead';
 const title=document.createElement('h3');title.textContent=row.title;
 const tag=document.createElement('span');tag.className='tag';tag.textContent=row.status==='pending'?'Awaiting review':'Approved';
 header.append(title,tag);card.append(header);
 const desc=document.createElement('p');desc.className='small';
 desc.textContent=(row.media_type==='video'?'Video':'Audio')+' · '+Number(row.duration_seconds).toFixed(1)+' seconds · '+(row.audience==='public'?'Public audience':'Connect members only')+' · Submitted '+new Date(row.created_at).toLocaleDateString();
 card.append(desc);
 const player=document.createElement('div');player.className='player';card.append(player);
 const loadMedia=document.createElement('button');loadMedia.type='button';loadMedia.className='subtle';loadMedia.textContent='Play submitted work';loadMedia.addEventListener('click',()=>{loadMedia.disabled=true;media(row,player)});card.append(loadMedia);
 const label=document.createElement('label');label.textContent='Review note';const note=document.createElement('textarea');note.rows=2;note.placeholder='Optional for approval; required for rejection (5+ characters)';note.maxLength=500;label.append(note);card.append(label);
 const actions=document.createElement('div');actions.className='actions';card.append(actions);
 if(row.status==='pending'){
  const approve=document.createElement('button');approve.type='button';approve.textContent='Approve';
  approve.addEventListener('click',()=>review(row.id,'approved',note.value,approve));
  actions.append(approve);
 }else{
  const p=document.createElement('p');p.textContent='Currently shared to the artist\'s chosen audience. Use Take Offline if it violates the rules.';card.append(p);
 }
 const reject=document.createElement('button');reject.className='danger';reject.type='button';reject.textContent=row.status==='approved'?'Take Offline':'Reject';
 reject.addEventListener('click',()=>review(row.id,'rejected',note.value,reject));actions.append(reject);
 root.append(card);
}
async function review(id,decision,note,button){
 if(busy||!moderator)return;
 if(decision==='rejected'&&note.trim().length<5){status('Please enter a reason (at least 5 characters) before rejecting or revoking approval.');return}
 busy=true;button.disabled=true;status(decision==='approved'?'Approving recording…':'Rejecting recording…');
 const {data,error}=await db.rpc('review_connect_work',{p_clip_id:id,p_decision:decision,p_note:note.trim()||null});
 busy=false;
 if(error){status('Review failed: '+error.message);button.disabled=false;return}
 status('Review saved: '+data+'.');
 await loadQueue();
}
$('reload').addEventListener('click',async()=>{await loadQueue();await loadReports()});
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(load,0)});
await load();