import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://xyudcdgjyormlokwhfoi.supabase.co','sb_publishable_-gMviWXPBzov-2D-htf9iA_y6ZVV-q0');
const $=id=>document.getElementById(id);
const tell=(id,message)=>$(id).textContent=message;
let me=null,myPage=null,myReleases=[],myPromo=null,sharedArt=[],editingRelease=null,busy=false;
const artistPage=p=>'https://intentionalnoise.band/'+encodeURIComponent(p.slug);
const https=v=>{
 if(!v)return null;
 try{const u=new URL(v);if(u.protocol!=='https:'||u.username||u.password)throw Error();return u.href}
 catch{throw Error('Use a complete HTTPS link without embedded credentials.')}
};
function elm(tag,text,cls){
 const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;
 if(cls)e.className=cls;return e;
}
function link(text,url,cls='btn secondary'){
 const a=elm('a',text,cls);a.href=https(url);a.target='_blank';a.rel='noopener noreferrer';return a;
}
const trim=(id,max)=>$(id).value.trim().slice(0,max);
const imageLabel=(row)=>row.artwork_media_id?'Previously shared artwork':row.image_url?'External image link':'Default illustration';
function imageField(prefix){
 const mode=$(prefix+'ImageMode').value;
 if(mode==='saved'){
  const id=$(prefix+'Artwork').value;
  if(!id||!sharedArt.some(v=>v.id===id))throw Error('Choose an existing shared artwork image.');
  return {artwork_media_id:id,image_url:null};
 }
 if(mode==='link'){
  const url=https(trim(prefix+'ImageUrl',2048));
  if(!url)throw Error('Paste a direct HTTPS image URL.');
  return {artwork_media_id:null,image_url:url};
 }
 return {artwork_media_id:null,image_url:null};
}
function setImageMode(prefix){
 const mode=$(prefix+'ImageMode').value;
 $(prefix+'SavedArea').hidden=mode!=='saved';
 $(prefix+'LinkArea').hidden=mode!=='link';
 $(prefix+'Artwork').required=mode==='saved';
 $(prefix+'ImageUrl').required=mode==='link';
}
function populateArtworkLists(){
 for(const prefix of ['r','p']){
  const select=$(prefix+'Artwork');
  select.replaceChildren();
  for(const art of sharedArt){
   const o=elm('option',art.title+' · '+(art.kind==='logo'?'Logo':'Artwork'));
   o.value=art.id;select.append(o);
  }
  const mode=$(prefix+'ImageMode');
  for(const option of mode.options)
   if(option.value==='saved')option.disabled=!sharedArt.length;
  if(!sharedArt.length&&mode.value==='saved')mode.value='none';
  setImageMode(prefix);
 }
}
async function imagesFor(rows){
 const ids=[...new Set(rows.map(v=>v.artwork_media_id).filter(Boolean))];
 const map=new Map();
 if(!ids.length)return map;
 const {data,error}=await db.from('artist_media_submissions')
 .select('id,source_type,external_url,storage_path').in('id',ids);
 if(error)return map;
 await Promise.all((data||[]).map(async item=>{
  if(item.source_type==='link'&&item.external_url){
   try{map.set(item.id,https(item.external_url))}catch{};return;
  }
  if(item.source_type==='upload'&&item.storage_path){
   const {data:uri,error:e}=await db.storage.from('artist-review').createSignedUrl(item.storage_path,600);
   if(!e&&uri?.signedUrl)map.set(item.id,uri.signedUrl);
  }
 }));
 return map;
}
function artworkSlot(src,kind='release'){
 const box=elm('div',null,'art-slot');
 box.setAttribute('aria-label',kind==='release'?'Release artwork':'Gig or presale promotion image');
 const fallback=()=>{box.replaceChildren(elm('span',kind==='release'?'♫':'♬'));};
 if(src){
  const img=document.createElement('img');img.loading='lazy';img.alt=kind==='release'?'Release cover':'Gig or presale promo';
  img.referrerPolicy='no-referrer';img.onerror=fallback;img.src=src;box.append(img);
 }else fallback();
 return box;
}
function postedCard(row,names,imgs,type){
 const card=elm('article',null,'tile media-card');
 let uri=null;
 try{uri=row.image_url?https(row.image_url):imgs.get(row.artwork_media_id)||null}catch{}
 card.append(artworkSlot(uri,type==='release'?'release':'promo'));
 const content=elm('div');
 content.append(elm('h4',row.title));
 const owner=names.get(row.owner_id);
 const subtitle=type==='release'?
  [owner?.display_name||'Connect artist',row.release_date||''].filter(Boolean).join(' · '):
  [owner?.display_name||'Connect artist',row.promo_type==='presale'?'Presale':'Gig / performance'].join(' · ');
 content.append(elm('p',subtitle,'meta'));
 if(row.description)content.append(elm('p',row.description));
 const destinations=elm('div',null,'actions');
 try{destinations.append(link(type==='release'?'Listen / details':'View '+(row.promo_type==='presale'?'presale':'gig'),type==='release'?row.listening_url:row.destination_url));}catch{}
 if(owner?.slug)try{destinations.append(link('Artist page',artistPage(owner)))}catch{}
 content.append(destinations);
 card.append(content);return card;
}
async function loadPublic(){
 const [a,b]=await Promise.all([
  db.from('frog_releases').select('id,owner_id,title,release_date,description,listening_url,image_url,artwork_media_id,is_published,created_at').eq('is_published',true).order('created_at',{ascending:false}).limit(60),
  db.from('frog_promos').select('owner_id,promo_type,title,description,destination_url,image_url,artwork_media_id,is_published,updated_at').eq('is_published',true).order('updated_at',{ascending:false}).limit(30)
 ]);
 const releaseRoot=$('releaseFeed'),promoRoot=$('promoFeed');
 releaseRoot.replaceChildren();promoRoot.replaceChildren();
 if(a.error){tell('releaseStatus','Release cards unavailable: '+a.error.message)}
 if(b.error){tell('promoStatus','Promotions unavailable: '+b.error.message)}
 const releases=a.data||[],promos=b.data||[];
 const ids=[...new Set([...releases,...promos].map(item=>item.owner_id))];
 let names=new Map();
 if(ids.length){
  const {data:pages,error}=await db.from('artist_pages').select('user_id,slug,display_name').in('user_id',ids).eq('published',true);
  if(!error)names=new Map((pages||[]).map(p=>[p.user_id,p]));
 }
 const imageMap=await imagesFor([...releases,...promos]);
 for(const item of releases)releaseRoot.append(postedCard(item,names,imageMap,'release'));
 for(const item of promos)promoRoot.append(postedCard(item,names,imageMap,'promo'));
 if(!a.error){tell('releaseStatus',releases.length?'Showing '+releases.length+' published release listing'+(releases.length===1?'':'s')+'.':'No member releases published yet. Be the first to share your Ribbits!');}
 if(!b.error){tell('promoStatus',promos.length?'Showing '+promos.length+' gig or presale card'+(promos.length===1?'':'s')+'.':'No member gig/presale promotions published yet.');}
}
function displayPublicationNotice(){
 if(!myPage?.published||!myPage?.approved_at){
  $('publishNotice').replaceChildren();
  $('publishNotice').append(elm('strong','Your public artist page is not published yet.'));
  const p=elm('p','You can prepare and save private FROG drafts now. Publish your public .band page before activating FROG cards.');
  p.append(document.createTextNode(' '));
  const a=elm('a','Edit my public band page');a.href='/band-page.html';p.append(a);
  $('publishNotice').append(p);
  return;
 }
 $('publishNotice').replaceChildren(elm('strong','Your artist page is public. FROG cards will appear only when you select Publish for each card.'));
}
const canPublish=()=>!!myPage?.published&&!!myPage?.approved_at;
function resetReleaseForm(){
 editingRelease=null;$('releaseForm').reset();
 $('releaseFormHeading').textContent='Add a release';
 $('saveRelease').textContent='Save release';
 $('cancelRelease').hidden=true;
 setImageMode('r');
}
function setArtFields(prefix,row){
 $(prefix+'ImageMode').value=row.artwork_media_id?'saved':row.image_url?'link':'none';
 $(prefix+'ImageUrl').value=row.image_url||'';
 if(row.artwork_media_id&&sharedArt.some(a=>a.id===row.artwork_media_id))$(prefix+'Artwork').value=row.artwork_media_id;
 setImageMode(prefix);
}
function editRelease(row){
 editingRelease=row.id;$('releaseFormHeading').textContent='Edit release';
 $('rTitle').value=row.title;$('rDate').value=row.release_date||'';
 $('rDescription').value=row.description||'';$('rUrl').value=row.listening_url;
 $('rPublished').checked=row.is_published;setArtFields('r',row);
 $('saveRelease').textContent='Save changes';$('cancelRelease').hidden=false;
 $('releaseFormHeading').scrollIntoView({behavior:'smooth',block:'start'});
 tell('releaseEditStatus','Editing '+row.title+'.');
}
function renderMyReleases(){
 const root=$('myReleases');root.replaceChildren();
 tell('releaseCount','('+myReleases.length+' of 5)');
 if(!myReleases.length)root.append(elm('p','No releases saved yet.','muted'));
 for(const row of myReleases){
  const card=elm('div',null,'tile');
  card.append(elm('strong',row.title));
  card.append(elm('p',(row.is_published?'Published':'Private draft')+' · '+imageLabel(row),'meta'));
  const actions=elm('div',null,'actions');
  const edit=elm('button','Edit','secondary');edit.type='button';edit.addEventListener('click',()=>editRelease(row));actions.append(edit);
  const pub=elm('button',row.is_published?'Hide':'Publish','secondary');pub.type='button';
  pub.addEventListener('click',async()=>{
   if(!row.is_published&&!canPublish()){tell('releaseEditStatus','Publish your .band artist page first.');return}
   pub.disabled=true;
   try{
    const {error}=await db.from('frog_releases').update({is_published:!row.is_published,updated_at:new Date().toISOString()}).eq('id',row.id).eq('owner_id',me.id);
    if(error)throw error;await refreshAll();tell('releaseEditStatus',row.is_published?'Release hidden.':'Release published.');
   }catch(e){tell('releaseEditStatus',e.message);pub.disabled=false}
  });actions.append(pub);
  const remove=elm('button','Remove','secondary');remove.type='button';
  remove.addEventListener('click',async()=>{
   if(!confirm('Remove '+row.title+' from FROG? This removes the listing only. It does not delete your artwork, music or media files.'))return;
   remove.disabled=true;
   const {error}=await db.from('frog_releases').delete().eq('id',row.id).eq('owner_id',me.id);
   if(error){tell('releaseEditStatus',error.message);remove.disabled=false;return}
   resetReleaseForm();await refreshAll();tell('releaseEditStatus','Release listing removed; original media is unchanged.');
  });actions.append(remove);card.append(actions);root.append(card);
 }
 $('saveRelease').disabled=!editingRelease&&myReleases.length>=5;
 if(!editingRelease&&myReleases.length>=5)tell('releaseEditStatus','Five releases saved. Edit or remove a listing to add another.');
}
function fillPromoForm(){
 if(!myPromo){$('promoForm').reset();$('deletePromo').hidden=true;setImageMode('p');return}
 $('pType').value=myPromo.promo_type;$('pTitle').value=myPromo.title;
 $('pDescription').value=myPromo.description||'';$('pUrl').value=myPromo.destination_url;
 $('pPublished').checked=myPromo.is_published;
 setArtFields('p',myPromo);$('deletePromo').hidden=false;
}
async function loadOwner(){
 if(!me)return;
 const [profile,page,releases,promo,art]=await Promise.all([
  db.from('musician_profiles').select('display_name').eq('user_id',me.id).maybeSingle(),
  db.from('artist_pages').select('slug,published,approved_at').eq('user_id',me.id).maybeSingle(),
  db.from('frog_releases').select('*').eq('owner_id',me.id).order('created_at',{ascending:false}),
  db.from('frog_promos').select('*').eq('owner_id',me.id).maybeSingle(),
  db.from('artist_media_submissions').select('id,title,kind').eq('user_id',me.id).eq('status','approved').in('kind',['artwork','logo']).order('created_at',{ascending:false}).limit(100)
 ]);
 for(const x of [profile,page,releases,promo,art])if(x.error)throw x.error;
 $('memberName').textContent='Signed in as '+(profile.data?.display_name||'Connect member')+'.';
 myPage=page.data||null;myReleases=releases.data||[];myPromo=promo.data||null;sharedArt=art.data||[];
 displayPublicationNotice();
 populateArtworkLists();
 renderMyReleases();
 fillPromoForm();
}
async function refreshAll(){await Promise.all([loadPublic(),loadOwner()])}
async function start(){
 tell('releaseStatus','');tell('promoStatus','');
 try{await loadPublic()}catch(e){tell('releaseStatus','Could not display releases: '+(e.message||e))}
 const {data,error}=await db.auth.getUser();
 me=error?null:data.user;
 $('loginGate').hidden=!!me;
 $('management').hidden=!me;
 if(!me){
  $('loginLink').href='/auth.html?next='+encodeURIComponent('/releases-and-gigs.html');
  return;
 }
 try{await loadOwner()}catch(e){tell('releaseEditStatus','Could not load your FROG cards: '+(e.message||e))}
}
for(const p of ['r','p'])$(p+'ImageMode').addEventListener('change',()=>setImageMode(p));
$('releaseForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!me||busy)return;
 const title=trim('rTitle',120),description=trim('rDescription',650),date=$('rDate').value||null;
 if(title.length<2){tell('releaseEditStatus','Enter at least two characters for the release title.');return}
 if(!editingRelease&&myReleases.length>=5){tell('releaseEditStatus','Five release listings maximum. Edit or remove one.');return}
 const published=$('rPublished').checked;
 if(published&&!canPublish()){tell('releaseEditStatus','Publish your .band artist page first, or save this as a private draft.');return}
 let payload;
 try{payload={owner_id:me.id,title,description,release_date:date,listening_url:https(trim('rUrl',2048)),...imageField('r'),is_published:published,updated_at:new Date().toISOString()};if(!payload.listening_url)throw Error('Enter your listening link.')}
 catch(e){tell('releaseEditStatus',e.message);return}
 busy=true;$('saveRelease').disabled=true;tell('releaseEditStatus','Saving release…');
 try{
  const query=editingRelease?
   db.from('frog_releases').update(payload).eq('id',editingRelease).eq('owner_id',me.id):
   db.from('frog_releases').insert(payload);
  const {error}=await query;
  if(error)throw error;
  resetReleaseForm();await refreshAll();
  tell('releaseEditStatus',published?'Release saved and published.':'Release saved as a private draft.');
 }catch(e){tell('releaseEditStatus','Could not save: '+(e.message||e))}
 finally{busy=false;$('saveRelease').disabled=(!editingRelease&&myReleases.length>=5)}
});
$('cancelRelease').addEventListener('click',()=>{resetReleaseForm();tell('releaseEditStatus','Editing cancelled.')});
$('promoForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!me||busy)return;
 if(trim('pTitle',120).length<2){tell('promoEditStatus','Enter at least two characters for the card title.');return}
 const published=$('pPublished').checked;
 if(published&&!canPublish()){tell('promoEditStatus','Publish your .band artist page first, or keep this a private draft.');return}
 let payload;
 try{payload={owner_id:me.id,promo_type:$('pType').value,title:trim('pTitle',120),description:trim('pDescription',650),destination_url:https(trim('pUrl',2048)),...imageField('p'),is_published:published,updated_at:new Date().toISOString()};if(!payload.destination_url)throw Error('Enter a gig or presale link.')}
 catch(e){tell('promoEditStatus',e.message);return}
 busy=true;$('savePromo').disabled=true;tell('promoEditStatus','Saving card…');
 try{
  const {error}=await db.from('frog_promos').upsert(payload,{onConflict:'owner_id'});
  if(error)throw error;await refreshAll();
  tell('promoEditStatus',published?'Gig or presale promo published.':'Promo saved as a private draft.');
 }catch(e){tell('promoEditStatus','Could not save: '+(e.message||e))}
 finally{busy=false;$('savePromo').disabled=false}
});
$('deletePromo').addEventListener('click',async()=>{
 if(!me||busy||!myPromo)return;
 if(!confirm('Remove this FROG promo card? Your linked media and gig requests are not deleted.'))return;
 busy=true;$('deletePromo').disabled=true;
 try{
  const {error}=await db.from('frog_promos').delete().eq('owner_id',me.id);
  if(error)throw error;await refreshAll();tell('promoEditStatus','Promo card removed. No other media was deleted.');
 }catch(e){tell('promoEditStatus',e.message)}
 finally{busy=false;$('deletePromo').disabled=false}
});
db.auth.onAuthStateChange(e=>{
 if(e==='SIGNED_OUT'){me=null;myPage=null;myReleases=[];myPromo=null;sharedArt=[];$('management').hidden=true;$('loginGate').hidden=false;}
});
await start();
