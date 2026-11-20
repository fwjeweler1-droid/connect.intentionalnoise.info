// STAGED ONLY — NOT DEPLOYED. No service keys or sender credentials in GitHub.
// Database webhook: INSERT on public.connect_booking_alerts.
// A private webhook secret authenticates this service-to-service request.
// Requires verified FROM address, configured RESEND_API_KEY, and explicit rollout approval.
import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = { 'content-type':'application/json', 'cache-control':'no-store' };
const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers});
const message = (kind:string) => ({
 private_message:'You have a new private Connect message.',
 booking_interest:'A musician replied to your booking opportunity.',
 booking_reply:'You have a new private booking reply.',
 booking_shortlisted:'A venue shortlisted your booking response.',
}[kind] || 'You have a new Connect notification.');

Deno.serve(async req=>{
 if(req.method!=='POST') return json({error:'Method not allowed'},405);
 const expected=Deno.env.get('BOOKING_ALERT_WEBHOOK_SECRET');
 if(!expected || req.headers.get('x-booking-alert-secret')!==expected) return json({error:'Unauthorized'},401);
 if(Deno.env.get('BOOKING_ALERT_EMAIL_ENABLED')!=='true') return json({error:'Email alerts are not enabled'},503);
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const api=Deno.env.get('SUPABASE_URL');
 const sendKey=Deno.env.get('RESEND_API_KEY');
 const from=Deno.env.get('BOOKING_ALERT_FROM');
 if(!key||!api||!sendKey||!from) return json({error:'Email sender not configured'},503);
 let payload:{type?:string,table?:string,schema?:string,record?:{id?:string}};
 try{payload=await req.json()}catch{return json({error:'Invalid JSON'},400)}
 if(payload.type!=='INSERT'||payload.table!=='connect_booking_alerts'||payload.schema!=='public')return json({error:'Unsupported event'},400);
 const id=payload.record?.id;
 if(!id||!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))return json({error:'Invalid alert ID'},400);
 const db=createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:alert,error}=await db.from('connect_booking_alerts')
  .select('id,recipient_id,alert_type,email_sent_at')
  .eq('id',id).maybeSingle();
 if(error||!alert) return json({error:'Alert not found'},404);
 if(alert.email_sent_at) return json({ok:true,alreadySent:true});
 const {data:preference,error:prefError}=await db.from('connect_booking_alert_preferences')
  .select('email_enabled').eq('user_id',alert.recipient_id).maybeSingle();
 if(prefError)return json({error:'Alert preference unavailable'},500);
 if(preference?.email_enabled===false)return json({ok:true,skipped:'recipient-opted-out'});
 const {data:recipient,error:lookupError}=await db.auth.admin.getUserById(alert.recipient_id);
 if(lookupError||!recipient.user?.email) return json({error:'Recipient email unavailable'},422);
 const url='https://connect.intentionalnoise.info/notifications.html';
 const res=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:'Bearer '+sendKey,'Content-Type':'application/json','Idempotency-Key':'booking-'+alert.id},
  body:JSON.stringify({
   from,to:[recipient.user.email],
   subject:'Intentional Noise Connect — private booking update',
   text:message(alert.alert_type)+'\n\nSign in to view your private notification: '+url+
    '\n\nYour account email is kept private. Do not reply to this automated notice.'
  })
 });
 if(!res.ok) return json({error:'Email provider rejected notification',providerStatus:res.status},502);
 const {error:saveErr}=await db.from('connect_booking_alerts')
  .update({email_sent_at:new Date().toISOString()}).eq('id',id).is('email_sent_at',null);
 if(saveErr)return json({error:'Email sent; delivery state could not be recorded'},500);
 return json({ok:true});
});
