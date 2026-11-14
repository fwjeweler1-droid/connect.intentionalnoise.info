import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const respond=(status:number,text:string)=>new Response(text,{status,headers:{"Content-Type":"text/plain"}});
const enc=new TextEncoder();
async function verify(raw:string,header:string,secret:string):Promise<boolean>{
  const fields=header.split(",").map(v=>v.trim());
  const value=fields.find(v=>v.startsWith("t="))?.slice(2)||"";
  if(!/^\d+$/.test(value)||Math.abs(Date.now()/1000-Number(value))>300)return false;
  const sigs=fields.filter(v=>v.startsWith("v1=")).map(v=>v.slice(3).toLowerCase()).filter(v=>/^[a-f0-9]{64}$/.test(v));
  if(!sigs.length)return false;
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const digest=new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(value+"."+raw)));
  const expected=Array.from(digest).map(v=>v.toString(16).padStart(2,"0")).join("");
  return sigs.some(s=>{let difference=0;for(let i=0;i<64;i++)difference|=s.charCodeAt(i)^expected.charCodeAt(i);return difference===0;});
}
Deno.serve(async req=>{
  if(req.method!=="POST")return respond(405,"POST only");
  const secret=Deno.env.get("STRIPE_WEBHOOK_SECRET")||"";
  const dbUrl=Deno.env.get("SUPABASE_URL"),dbKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!secret.startsWith("whsec_")||!dbUrl||!dbKey)return respond(503,"Payment verification not configured");
  try{
    const raw=await req.text();
    if(raw.length>150000)return respond(413,"Too large");
    if(!await verify(raw,req.headers.get("stripe-signature")||"",secret))return respond(400,"Invalid signature");
    const event=JSON.parse(raw);
    if(event.type!=="checkout.session.completed"||event.livemode!==true)return respond(200,"Skipped");
    const s=event.data?.object;
    if(s?.object!=="checkout.session"||s.livemode!==true||s.mode!=="payment"||
       s.payment_status!=="paid"||s.amount_total!==1200||s.currency!=="usd"||
       !/^cs_live_/.test(s.id||"")||typeof s.payment_intent!=="string")
       return respond(200,"Payment not eligible");
    const db=createClient(dbUrl,dbKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const done=await db.rpc("finalize_verified_artist_payment",{
      p_event_id:event.id,p_session_id:s.id,p_payment_intent_id:s.payment_intent,
      p_amount_cents:s.amount_total,p_currency:s.currency
    });
    if(done.error){console.error("Finalization failed",done.error.code||"");return respond(503,"Pending reconciliation");}
    return respond(200,String(done.data||"Processed"));
  }catch(e){console.error("Webhook processing failed",String(e));return respond(503,"Retry required");}
});
