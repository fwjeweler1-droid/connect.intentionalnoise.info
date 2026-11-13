// Private, voluntary one-time product feedback for the existing Connect and IneedaGig workflows.
// The client never sends email or awards verification. RLS and unique indexes enforce ownership and deduplication.
const MS_DAY=86400000;
const LAUNCH_TIME=Date.parse('2026-11-13T00:00:00-05:00');
const el=(tag,txt)=>{const node=document.createElement(tag);if(txt!==undefined)node.textContent=txt;return node};
const dueAfter=(date,days)=>{const time=Date.parse(date||'');return Number.isFinite(time)&&Date.now()>=time+days*MS_DAY};
const addQuestion=(form,id,labelText,maxLength)=>{
 const label=el('label',labelText),area=el('textarea');
 label.htmlFor=id;area.id=id;area.rows=2;area.maxLength=maxLength;area.style.width='100%';area.style.margin='5px 0 12px';area.style.padding='10px';
 form.append(label,area);return area;
};

export function feedbackWidget(db,userId,{context,bookingId=null,bookingSource='venue',bookingOutcome=null}={}){
 const box=el('section');box.dataset.feedbackContext=context;box.setAttribute('aria-label','Experience feedback');
 box.style.cssText='border:1px solid #496675;border-radius:12px;padding:16px;margin:18px 0;background:rgba(20,45,54,.7)';
 const heading=el('h3',context==='new_member'?'How is Connect working for you?':'How did this booking request go?');
 heading.style.margin='0 0 8px';
 const description=el('p',context==='new_member'
 ? 'You have had a few days to explore. What should we make easier? Your feedback is private and optional.'
 : 'Your request has been marked resolved. Tell us what worked or did not work. This does not confirm a show took place.');
 description.style.margin='0 0 12px';
 const form=el('form');
 const idPrefix='experience_'+context+'_'+(bookingId?bookingId.replace(/-/g,''):'account');
 const ratingLabel=el('label','How easy was the experience?');ratingLabel.htmlFor=idPrefix+'_ease';
 const rating=el('select');rating.id=idPrefix+'_ease';rating.style.cssText='width:100%;padding:10px;margin:6px 0 12px';
 for(const [value,text] of [['','Optional rating'],['5','Very easy (5)'],['4','Easy (4)'],['3','Okay (3)'],['2','Difficult (2)'],['1','Very difficult (1)']]){
  const option=el('option',text);option.value=value;rating.append(option);
 }
 form.append(ratingLabel,rating);
 const worked=addQuestion(form,idPrefix+'_worked','What worked well?',1000);
 const difficult=addQuestion(form,idPrefix+'_difficult','What was confusing or hard to use?',1000);
 const features=addQuestion(form,idPrefix+'_features','What feature or improvement would make this easier?',1500);
 const submit=el('button','Send feedback');submit.type='submit';submit.style.marginRight='10px';
 const skip=el('button','Skip this follow-up');skip.type='button';skip.className='secondary';
 const state=el('p','');state.setAttribute('role','status');state.style.minHeight='1.5em';
 form.append(submit,skip,state);
 const save=async skipped=>{
  const score=rating.value?Number(rating.value):null;
  const answers={what_worked:worked.value.trim(),what_was_difficult:difficult.value.trim(),feature_requests:features.value.trim()};
  if(!skipped&&!score&&!Object.values(answers).some(v=>v.length>=3)){
   state.textContent='Add a rating or a short suggestion before submitting.';return;
  }
  submit.disabled=true;skip.disabled=true;state.textContent='Saving your response…';
  const row={user_id:userId,context,response_status:skipped?'skipped':'submitted',booking_source:bookingSource,
   booking_id:context==='booking_resolved'?bookingId:null,
   booking_outcome:context==='booking_resolved'?bookingOutcome:null,
   ease_score:skipped?null:score,
   what_worked:skipped?'':answers.what_worked,
   what_was_difficult:skipped?'':answers.what_was_difficult,
   feature_requests:skipped?'':answers.feature_requests};
  const {error}=await db.from('member_experience_feedback').insert(row);
  if(error){state.textContent='Could not save your response: '+(error.code==='23505'?'Already answered.':error.message);submit.disabled=false;skip.disabled=false;return;}
  form.remove();description.textContent=skipped?'Understood. We will not repeat this request.':'Thanks! Your suggestions were saved privately.';
 };
 form.addEventListener('submit',e=>{e.preventDefault();save(false).catch(err=>{state.textContent='Feedback unavailable: '+err.message;submit.disabled=false;skip.disabled=false;});});
 skip.addEventListener('click',()=>{save(true).catch(err=>{state.textContent='Feedback unavailable: '+err.message;submit.disabled=false;skip.disabled=false;});});
 box.append(heading,description,form);
 return box;
}

export async function showNewMemberFollowUp(db,user,host){
 if(!host)return;
 if(!user){host.querySelector('[data-feedback-context="new_member"]')?.remove();return;}
 if(host.querySelector('[data-feedback-context="new_member"]'))return;
 if(!dueAfter(user.created_at,3)||Date.parse(user.created_at)<LAUNCH_TIME)return;
 const {data,error}=await db.from('member_experience_feedback').select('id').eq('user_id',user.id).eq('context','new_member').limit(1);
 if(error||data?.length)return;
 host.append(feedbackWidget(db,user.id,{context:'new_member'}));
}

export async function fetchAnsweredBookingFeedback(db,userId){
 const {data,error}=await db.from('member_experience_feedback').select('booking_source,booking_id').eq('user_id',userId).eq('context','booking_resolved').limit(250);
 if(error)throw error;
 return new Set((data||[]).map(x=>x.booking_source+':'+x.booking_id));
}

export function resolvedBookingDue(row,source='venue'){
 if(source==='venue'&&!['filled','cancelled'].includes(row.status))return false;
 if(source==='member_gig'&&row.status!=='filled')return false;
 if(row.status==='cancelled')return dueAfter(row.updated_at,2);
 // A filled request is not proof of a completed show. Ask about the request only after the event.
 return dueAfter(row.event_date+'T12:00:00',2);
}

export async function showResolvedFollowUp(db,user,host){
 if(!host)return;
 if(!user){host.querySelector('[data-feedback-context="booking_resolved"]')?.remove();return;}
 if(host.querySelector('[data-feedback-context="booking_resolved"]'))return;
 const [venue,gigs,answered]=await Promise.all([
  db.from('venue_booking_requests').select('id,status,event_date,updated_at').eq('owner_id',user.id).in('status',['filled','cancelled']).order('updated_at',{ascending:false}).limit(40),
  db.from('gig_requests').select('id,status,event_date,created_at').eq('owner_id',user.id).eq('status','filled').order('created_at',{ascending:false}).limit(40),
  fetchAnsweredBookingFeedback(db,user.id)
 ]);
 const choices=[
  ...(!venue.error?(venue.data||[]).map(b=>({...b,source:'venue'})):[]),
  ...(!gigs.error?(gigs.data||[]).map(b=>({...b,source:'member_gig'})):[])
 ].filter(b=>resolvedBookingDue(b,b.source)&&!answered.has(b.source+':'+b.id))
 .sort((a,b)=>String(b.updated_at||b.event_date).localeCompare(String(a.updated_at||a.event_date)));
 const next=choices[0];if(!next)return;
 host.append(feedbackWidget(db,user.id,{context:'booking_resolved',bookingId:next.id,bookingSource:next.source,bookingOutcome:next.status}));
}
