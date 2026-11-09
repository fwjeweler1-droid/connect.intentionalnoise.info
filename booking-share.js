// Read-only social sharing helpers for public venue booking offers.
// They generate ready-to-review social composer links, NEVER post to accounts automatically.
const $=id=>document.getElementById(id);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const fmtDate=value=>{const d=new Date(value+'T12:00:00');return isNaN(d)?value:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})};
const usd=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(value));
const offer=row=>row.budget_kind==='quotes'?'Quotes welcome':row.budget_kind==='fixed'?usd(row.budget_min)+' offer':usd(row.budget_min)+'–'+usd(row.budget_max)+' budget';
const acts={band:'a band',solo:'a solo musician',duo:'a duo',trio:'a trio',any:'live music'};
let currentShare=null;
export function bookingLink(id){
 return 'https://ineedagig.net/?booking='+encodeURIComponent(id)+'#opportunities';
}
export function hideBookingShare(){
 currentShare=null;
 const section=$('shareAfterPost');if(section)section.hidden=true;
}
export function showBookingShare(row){
 const section=$('shareAfterPost');
 if(!section||!row||row.status!=='open'||row.event_date<today()||!row.id)return;
 const url=bookingLink(row.id);
 const caption='Booking opportunity: '+row.venue_name+' needs '+(acts[row.act_type]||'live music')+' in '+[row.city,row.region].filter(Boolean).join(', ')+' on '+fmtDate(row.event_date)+'. '+offer(row)+'.';
 currentShare={url,caption};
 $('shareCaption').textContent=caption+'\n'+url;
 const e=encodeURIComponent;
 const platforms={
  shareFb:'https://www.facebook.com/sharer/sharer.php?u='+e(url),
  shareX:'https://twitter.com/intent/tweet?text='+e(caption)+'&url='+e(url),
  shareThreads:'https://www.threads.com/intent/post?text='+e(caption+' '+url),
  shareLinkedIn:'https://www.linkedin.com/sharing/share-offsite/?url='+e(url)
 };
 for(const [id,href] of Object.entries(platforms))$(id).href=href;
 section.hidden=false;
 $('shareResult').textContent='Share links ready. No posts have been sent to social accounts.';
 section.scrollIntoView({behavior:'smooth',block:'start'});
}
async function copy(text){
 if(!text)return;
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
  else{
   const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.opacity='0';
   document.body.append(input);input.select();
   const copied=document.execCommand('copy');input.remove();if(!copied)throw Error('Clipboard unavailable.');
  }
  $('shareResult').textContent='Copied. Review your social post before sending.';
 }catch(e){$('shareResult').textContent='Could not copy: '+e.message}
}
$('shareCopyLink').addEventListener('click',()=>copy(currentShare?.url||''));
$('shareCopyText').addEventListener('click',()=>copy(currentShare?currentShare.caption+'\n'+currentShare.url:''));
