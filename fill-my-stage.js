import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://xyudcdgjyormlokwhfoi.supabase.co','sb_publishable_-gMviWXPBzov-2D-htf9iA_y6ZVV-q0');
const $=id=>document.getElementById(id);
const TAG='ineeda-gig-venue-form-v1';
let me=null,listed=false,myRequests=[],ownInterests=[],memberInterests=[],openRequests=[],editingId=null,step=0,busy=false;
const state=id=>{const node=$(id);return node?node.value.trim():''};
const label=(node,tag,value,cls)=>{const x=document.createElement(tag);x.textContent=value||'';if(cls)x.className=cls;node.append(x);return x};
const setStatus=(id,value)=>{$(id).textContent=value};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateText=x=>{try{return new Date(x+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}catch{return x}};
const money=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(x));
const offer=row=>row.budget_kind==='quotes'?'Quotes welcome':row.budget_kind==='fixed'?money(row.budget_min)+' guaranteed offer':money(row.budget_min)+'–'+money(row.budget_max)+' budget';
const words={band:'Band',solo:'Solo musician or vocalist',duo:'Duo',trio:'Trio',any:'Flexible act'};
const safe=(s,max)=>String(s||'').trim().slice(0,max);
function savedForm(){
 const obj={};
 for(const id of ['venueName','venueType','actType','genre','sound','eventDate','eventTime','setLength','city','region','country','budgetKind','budgetMin','budgetMax','details','publishChoice'])obj[id]=state(id);
 obj.confirmTerms=$('confirmTerms').checked;
 return obj;
}
function restoreForm(){
 try{const obj=JSON.parse(sessionStorage.getItem(TAG)||'null');if(!obj)return;
  for(const [id,v] of Object.entries(obj)){
   if(id==='confirmTerms')$('confirmTerms').checked=!!v;
   else if($(id)&&v!==null)$(id).value=String(v);
  }
  sessionStorage.removeItem(TAG);
 }catch{}
 changeBudget();
}
function rememberForm(){try{sessionStorage.setItem(TAG,JSON.stringify(savedForm()))}catch{}}
function changeBudget(){
 const kind=state('budgetKind');
 $('budgetMinWrap').hidden=kind==='quotes';$('budgetMaxWrap').hidden=kind!=='range';
 $('budgetMin').required=kind!=='quotes';$('budgetMax').required=kind==='range';
}
$('budgetKind').addEventListener('change',changeBudget);
$('loginFromWizard').href='/auth.html?next='+encodeURIComponent('/fill-my-stage.html');
function requestedData(){
 const kind=state('budgetKind');
 let min=kind==='quotes'?null:Number(state('budgetMin'));
 let max=kind==='range'?Number(state('budgetMax')):null;
 if(kind!=='quotes'&&(!Number.isFinite(min)||min<=0))throw Error('Enter a positive booking fee.');
 if(kind==='range'&&(!Number.isFinite(max)||max<min))throw Error('The maximum fee must be at least the minimum.');
 if(state('eventDate')<today())throw Error('Choose today or a future performance date.');
 return {
  venue_name:safe(state('venueName'),90),venue_type:state('venueType'),act_type:state('actType'),
  genre:safe(state('genre'),150),event_date:state('eventDate'),start_time:state('eventTime')||null,
  set_length_minutes:Number(state('setLength')),city:safe(state('city'),100),
  region:safe(state('region'),100),country:safe(state('country'),100),
  budget_kind:kind,budget_min:min,budget_max:max,sound_system:state('sound'),
  details:safe(state('details'),1400),status:state('publishChoice')==='open'?'open':'draft',
  updated_at:new Date().toISOString()
 };
}
function summary(){
 try{
 const d=requestedData();
 $('summary').textContent=[
  d.venue_name+' · '+d.venue_type.replaceAll('_',' '),
  'Looking for: '+(words[d.act_type]||d.act_type)+(d.genre?' · '+d.genre:''),
  'When: '+dateText(d.event_date)+(d.start_time?' at '+d.start_time:'')+' · '+d.set_length_minutes+' min',
  'Where: '+[d.city,d.region,d.country].filter(Boolean).join(', '),
  'Offer: '+offer(d),'Equipment: '+d.sound_system.replaceAll('_',' '),
  'Details: '+d.details,'Posting: '+(d.status==='open'?'Public booking request':'Private draft')
 ].join('\n');
 }catch(e){$('summary').textContent=e.message}
}
function goToStep(index){
 step=Math.min(2,Math.max(0,index));
 for(let i=0;i<3;i++)$('step'+i).hidden=i!==step;
 document.querySelectorAll('.step-indicator').forEach((x,i)=>{
  x.className='step-indicator'+(i===step?' current':i<step?' done':'')
 });
 $('previous').hidden=step===0;
 $('next').hidden=step===2;
 $('submitRequest').hidden=step!==2;
 if(step===2){
  summary();
  $('loginPrompt').hidden=!!me;
  $('submitRequest').textContent=editingId?'Save booking changes':state('publishChoice')==='draft'?'Save private draft':'Post booking request';
 }
}
function validateStep(index){
 let fields=[...$('step'+index).querySelectorAll('input,textarea,select')].filter(x=>x.willValidate);
 for(const x of fields)if(!x.checkValidity()){x.reportValidity();return false}
 if(index===1){
  if(state('eventDate')<today()){setStatus('formStatus','Choose a date today or later.');return false}
  try{requestedData()}catch(e){setStatus('formStatus',e.message);return false}
 }
 setStatus('formStatus','');return true;
}
$('previous').addEventListener('click',()=>goToStep(step-1));
$('next').addEventListener('click',()=>{if(validateStep(step))goToStep(step+1)});
$('publishChoice').addEventListener('change',()=>{summary();goToStep(step)});
$('requestForm').addEventListener('input',()=>{if(step===2)summary()});
function fillForm(row){
 $('venueName').value=row.venue_name;$('venueType').value=row.venue_type;
 $('actType').value=row.act_type;$('genre').value=row.genre||'';
 $('sound').value=row.sound_system;$('eventDate').value=row.event_date;
 $('eventTime').value=row.start_time?.slice(0,5)||'';
 $('setLength').value=String(row.set_length_minutes);
 $('city').value=row.city;$('region').value=row.region||'';$('country').value=row.country;
 $('budgetKind').value=row.budget_kind;
 $('budgetMin').value=row.budget_min??'';$('budgetMax').value=row.budget_max??'';
 $('details').value=row.details;$('publishChoice').value=row.status==='draft'?'draft':'open';
 $('confirmTerms').checked=false;changeBudget();
 editingId=row.id;$('cancelEdit').hidden=false;goToStep(0);
 $('wizard').scrollIntoView({behavior:'smooth',block:'start'});
 setStatus('formStatus','Editing this request. Your changes are not public until you save.');
}
function resetEditor(){
 editingId=null;$('requestForm').reset();
 $('cancelEdit').hidden=true;$('eventDate').min=today();changeBudget();goToStep(0)
}
$('cancelEdit').addEventListener('click',()=>{resetEditor();setStatus('formStatus','Editing cancelled.')});
$('requestForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(busy||!validateStep(2))return;
 if(!$('confirmTerms').checked){$('confirmTerms').reportValidity();return}
 if(!me){
  rememberForm();$('loginPrompt').hidden=false;
  setStatus('formStatus','Please sign in free, then return to this page to complete your offer.');
  $('loginFromWizard').focus();return;
 }
 let d;try{d=requestedData()}catch(error){setStatus('formStatus',error.message);return}
 busy=true;$('submitRequest').disabled=true;
 try{
  const query=editingId?
   db.from('venue_booking_requests').update(d).eq('id',editingId).eq('owner_id',me.id).select('id'):
   db.from('venue_booking_requests').insert({...d,owner_id:me.id}).select('id');
  const {data,error}=await query;if(error)throw error;if(!data?.length)throw Error('No request was saved. Refresh and try again.');
  resetEditor();await Promise.all([loadOwned(),loadPublic()]);
  setStatus('formStatus',d.status==='draft'?'Private draft saved.':'Booking offer posted. Musicians can now express interest.');
  $('myBookings').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){setStatus('formStatus','Could not save booking: '+(error.message||error))}
 finally{busy=false;$('submitRequest').disabled=false}
});
function bookingCard(b,owner=false){
 const card=label(document.createDocumentFragment(),'article',null,'tile');
 label(card,'h3',b.venue_name+' — '+(words[b.act_type]||b.act_type));
 label(card,'p',[dateText(b.event_date),b.start_time?.slice(0,5)||'',b.city,b.region].filter(Boolean).join(' · '),'meta');
 label(card,'p',offer(b)+' · '+b.set_length_minutes+' minute set');
 if(b.genre)label(card,'p','Style: '+b.genre);
 if(b.sound_system!=='discuss')label(card,'p','PA: '+(b.sound_system==='provided'?'Venue provides equipment':'Artist brings equipment'));
 label(card,'p',b.details);
 if(owner)label(card,'span',b.status.toUpperCase(),'tag');
 return card;
}
async function loadPublic(){
 const {data,error}=await db.from('venue_booking_requests')
  .select('id,owner_id,venue_name,venue_type,act_type,genre,event_date,start_time,set_length_minutes,city,region,country,budget_kind,budget_min,budget_max,sound_system,details,status')
  .eq('status','open').gte('event_date',today()).order('event_date',{ascending:true}).limit(100);
 const root=$('publicList');root.replaceChildren();
 if(error){setStatus('publicStatus','Unable to list gigs: '+error.message);return}
 openRequests=data||[];
 const applied=new Set((memberInterests||[]).map(v=>v.booking_id));
 for(const b of openRequests){
  const card=bookingCard(b);
  if(me&&b.owner_id===me.id){label(card,'p','This is your own offer. Manage replies below.','hint')}
  else if(me&&listed){
   if(applied.has(b.id)){label(card,'p','You already expressed interest. See My booking conversations below.','hint')}
   else{
    const form=label(card,'form',null);
    const lbl=label(form,'label','Introduce yourself to the venue');
    const textarea=label(lbl,'textarea');
    textarea.required=true;textarea.maxLength=1200;textarea.minLength=10;
    textarea.placeholder='Your act, availability, typical set, and any booking questions. Contact details stay private until you choose to share.';
    const send=label(form,'button','I’m interested');send.type='submit';
    form.addEventListener('submit',async event=>{
     event.preventDefault();const pitch=textarea.value.trim();
     if(pitch.length<10){textarea.reportValidity();return}
     send.disabled=true;
     try{
      const {error}=await db.from('venue_booking_interests')
       .insert({booking_id:b.id,musician_id:me.id,pitch,status:'interested'});
      if(error)throw error;
      await loadMyInterests();await loadPublic();
      setStatus('interestStatus','Your private introduction was sent to the requester.');
     }catch(e){setStatus('publicStatus','Could not express interest: '+e.message);send.disabled=false}
    });
   }
  }else if(!me){
    const a=label(card,'a','Sign in free to respond','btn secondary');
    a.href='/auth.html?next='+encodeURIComponent('/fill-my-stage.html');
  }else label(card,'p','Only listed Connect musicians can respond. Publish your musician profile if you want to apply.','hint');
  root.append(card);
 }
 setStatus('publicStatus',openRequests.length+' current stage opening'+(openRequests.length===1?'':'s')+'.');
 if(!openRequests.length)label(root,'p','No venues have posted a booking offer yet.','hint');
}
async function loadOwned(){
 if(!me){$('myBookings').hidden=true;return}
 $('myBookings').hidden=false;
 const {data,error}=await db.from('venue_booking_requests')
  .select('*').eq('owner_id',me.id).order('created_at',{ascending:false}).limit(100);
 if(error){setStatus('ownerStatus','Could not read your bookings: '+error.message);return}
 myRequests=data||[];
 const root=$('ownerList');root.replaceChildren();
 const ids=myRequests.map(x=>x.id);
 let replies=[];
 if(ids.length){
  const q=await db.from('venue_booking_interests').select('id,booking_id,musician_id,pitch,status,created_at')
   .in('booking_id',ids).order('created_at',{ascending:true});
  if(q.error){setStatus('ownerStatus','Could not read private replies: '+q.error.message)}
  else replies=q.data||[];
 }
 const people=new Map();
 const members=[...new Set(replies.map(x=>x.musician_id))];
 if(members.length){
  const q=await db.from('musician_profiles').select('user_id,display_name').in('user_id',members);
  if(!q.error)for(const p of q.data||[])people.set(p.user_id,p.display_name);
 }
 for(const b of myRequests){
  const card=bookingCard(b,true),acts=label(card,'div',null,'actions');
  const edit=label(acts,'button','Edit','secondary');edit.type='button';
  edit.addEventListener('click',()=>fillForm(b));
  for(const [act,text] of [['draft','Hide'],['open','Reopen'],['filled','Mark filled'],['cancelled','Cancel']]){
   if(act===b.status||(act==='open'&&b.event_date<today()))continue;
   const btn=label(acts,'button',text,'secondary');btn.type='button';
   btn.addEventListener('click',async()=>{
    if(act==='cancelled'&&!confirm('Cancel this request? Musicians will no longer see it in open bookings.'))return;
    btn.disabled=true;
    const {error}=await db.from('venue_booking_requests').update({status:act,updated_at:new Date().toISOString()})
     .eq('owner_id',me.id).eq('id',b.id);
    if(error){setStatus('ownerStatus',error.message);btn.disabled=false;return}
    await Promise.all([loadOwned(),loadPublic()]);
   });
  }
  const remove=label(acts,'button','Delete','secondary');remove.type='button';
  remove.addEventListener('click',async()=>{
   if(!confirm('Permanently remove this booking request and its conversations?'))return;
   remove.disabled=true;
   const {error}=await db.from('venue_booking_requests').delete().eq('owner_id',me.id).eq('id',b.id);
   if(error){setStatus('ownerStatus',error.message);remove.disabled=false;return}
   await Promise.all([loadOwned(),loadPublic()]);
  });
  const applicants=replies.filter(x=>x.booking_id===b.id);
  if(applicants.length){
   label(card,'h4',applicants.length+' private response'+(applicants.length===1?'':'s'));
   for(const interest of applicants){
    const area=label(card,'div',null,'answer-card');
    const display=people.get(interest.musician_id)||'Connect musician';
    label(area,'strong',display+' · '+interest.status);
    label(area,'p',interest.pitch);
    const v=label(area,'a','View musician’s previews','btn secondary');
    v.href='/show-your-work.html?member='+encodeURIComponent(interest.musician_id);
    const options=label(area,'div',null,'actions');
    if(interest.status!=='declined'){
     const short=label(options,'button','Shortlist','secondary');short.type='button';
     short.disabled=interest.status==='shortlisted';
     short.addEventListener('click',()=>updateInterest(interest,'shortlisted',short));
     const dec=label(options,'button','Decline','secondary');dec.type='button';
     dec.addEventListener('click',()=>updateInterest(interest,'declined',dec));
     appendThread(area,interest.id);
    }else label(area,'p','This conversation has been closed.','hint');
   }
  }else label(card,'p','No musicians have responded yet.','hint');
  root.append(card);
 }
 if(!myRequests.length)label(root,'p','You haven’t posted a request. Use the form above to get started.','hint');
 setStatus('ownerStatus',myRequests.length+' booking request'+(myRequests.length===1?'':'s')+' on your account.');
}
async function updateInterest(interest,to,button){
 button.disabled=true;
 const {data,error}=await db.from('venue_booking_interests')
  .update({status:to,updated_at:new Date().toISOString()}).eq('id',interest.id).select('id');
 if(error||!data?.length){setStatus('ownerStatus',error?.message||'Could not change response status.');button.disabled=false;return}
 await loadOwned();await loadMyInterests();
}
function appendThread(element,id){
 const wrap=label(element,'div',null),messages=label(wrap,'div','Loading private conversation…','thread');
 const form=label(wrap,'form');
 const l=label(form,'label','Send a private reply');
 const t=label(l,'textarea');t.required=true;t.maxLength=1800;
 t.placeholder='Write your message to the other party. Avoid sensitive information.';
 const submit=label(form,'button','Send private reply');submit.type='submit';
 const status=label(wrap,'p',null,'status');
 async function reload(){
  const {data,error}=await db.from('venue_booking_thread_messages')
   .select('id,interest_id,author_id,body,created_at')
   .eq('interest_id',id).order('created_at',{ascending:true}).limit(150);
  messages.replaceChildren();
  if(error){label(messages,'p','Conversation unavailable: '+error.message);return}
  if(!data?.length)label(messages,'p','No messages yet.','hint');
  for(const row of data||[]){
   const bubble=label(messages,'div',null,'message'+(row.author_id===me?.id?' mine':''));
   label(bubble,'small',(row.author_id===me?.id?'You':'Other participant')+' · '+new Date(row.created_at).toLocaleString());
   label(bubble,'span',row.body);
  }
  messages.scrollTop=messages.scrollHeight;
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!me)return;
  submit.disabled=true;
  const {error}=await db.from('venue_booking_thread_messages')
   .insert({interest_id:id,author_id:me.id,body:t.value.trim()});
  if(error){status.textContent='Could not send: '+error.message;submit.disabled=false;return}
  t.value='';await reload();status.textContent='Message sent.';submit.disabled=false;
 });
 reload().catch(e=>{status.textContent=e.message});
}
async function loadMyInterests(){
 if(!me){$('myInterestArea').hidden=true;memberInterests=[];return}
 const {data,error}=await db.from('venue_booking_interests')
  .select('id,booking_id,pitch,status,created_at').eq('musician_id',me.id)
  .order('created_at',{ascending:false}).limit(100);
 if(error){setStatus('interestStatus','Could not load your responses: '+error.message);return}
 memberInterests=data||[];
 $('myInterestArea').hidden=!(listed||memberInterests.length);
 const root=$('myInterestList');root.replaceChildren();
 for(const interest of memberInterests){
  const card=label(root,'div',null,'tile');
  const booking=openRequests.find(x=>x.id===interest.booking_id);
  label(card,'h3',booking?booking.venue_name:'Previously listed booking');
  label(card,'p',interest.pitch);
  label(card,'span','Response: '+interest.status,'tag');
  if(interest.status!=='declined')appendThread(card,interest.id);
  const btn=label(card,'button','Withdraw interest','secondary');
  btn.type='button';btn.addEventListener('click',async()=>{
   if(!confirm('Withdraw your response and remove its conversation?'))return;
   btn.disabled=true;
   const {error}=await db.from('venue_booking_interests').delete().eq('id',interest.id).eq('musician_id',me.id);
   if(error){setStatus('interestStatus',error.message);btn.disabled=false;return}
   await loadMyInterests();await loadPublic();
  });
 }
 setStatus('interestStatus',memberInterests.length+' private booking response'+(memberInterests.length===1?'':'s')+'.');
}
async function login(){
 const {data,error}=await db.auth.getUser();
 me=error?null:data.user;
 $('loginPrompt').hidden=!!me;
 if(!me){
  $('myBookings').hidden=true;$('myInterestArea').hidden=true;listed=false;return
 }
 const q=await db.from('musician_profiles').select('is_public').eq('user_id',me.id).maybeSingle();
 listed=!q.error&&!!q.data?.is_public;
}
async function init(){
 $('eventDate').min=today();
 restoreForm();goToStep(0);
 await login();
 await loadPublic();
 if(me){await loadOwned();await loadMyInterests();await loadPublic()}
}
db.auth.onAuthStateChange(event=>{
 if(event==='SIGNED_OUT'){me=null;listed=false;myRequests=[];memberInterests=[];$('myBookings').hidden=true;$('myInterestArea').hidden=true;loadPublic().catch(()=>{})}
});
try{await init()}catch(e){setStatus('formStatus','Could not initialize the booking page: '+(e.message||e))}
