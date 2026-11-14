import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const SITE = "https://connect.intentionalnoise.info";
const cors = {"Access-Control-Allow-Origin":SITE,"Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Vary":"Origin"};
const result = (status:number, data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status,headers:cors});
Deno.serve(async req=>{
  if(req.headers.get("origin") && req.headers.get("origin")!==SITE)return result(403,{error:"Origin not allowed"});
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return result(405,{error:"POST required"});
  try{
    const body=await req.text();
    if(body.length>512||JSON.parse(body)?.purpose!=="one_time_verified_artist")return result(400,{error:"Invalid request"});
    const token=(req.headers.get("authorization")||"").replace(/^Bearer /,"");
    if(!token)return result(401,{error:"Sign in required"});
    const url=Deno.env.get("SUPABASE_URL"),adminKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!adminKey)return result(503,{error:"Verification service unavailable"});
    const db=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const who=await db.auth.getUser(token),user=who.data?.user;
    if(who.error||!user)return result(401,{error:"Sign in required"});
    const [lock,verified,proof,pay]=await Promise.all([
      db.from("connect_account_price_locks").select("user_id").eq("user_id",user.id).maybeSingle(),
      db.from("verified_artist_accounts").select("user_id").eq("user_id",user.id).maybeSingle(),
      db.from("artist_verification_requests").select("id,status").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      db.from("artist_verification_payments").select("*").eq("user_id",user.id).maybeSingle()
    ]);
    if(lock.error||verified.error||proof.error||pay.error)return result(503,{error:"Verification review unavailable"});
    if(lock.data||verified.data||pay.data?.status==="paid")return result(200,{paid:true});
    if(proof.data?.status!=="approved")return result(403,{error:"Distribution proof must be approved first"});
    const stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||"";
    if(!stripeKey.startsWith("sk_live_"))return result(503,{error:"Live payments are not yet activated"});
    let payment=pay.data;
    if(payment&&payment.status!=="pending")return result(409,{error:"A prior payment needs review"});
    if(payment&&payment.verification_request_id!==proof.data.id)return result(409,{error:"Previous verification request requires reconciliation"});
    if(payment?.checkout_url&&payment.checkout_expires_at&&Date.parse(payment.checkout_expires_at)>Date.now()+60000&&/^https:\/\/checkout\.stripe\.com\//.test(payment.checkout_url))
      return result(200,{checkout_url:payment.checkout_url});
    if(!payment){
      const inserted=await db.from("artist_verification_payments").insert({user_id:user.id,verification_request_id:proof.data.id,amount_cents:1200,currency:"usd",status:"pending"}).select("*").single();
      if(inserted.error||!inserted.data)return result(503,{error:"Unable to create verification payment record"});
      payment=inserted.data;
    }
    const attempt=Number(payment.session_attempt)+1;
    if(attempt>100)return result(409,{error:"Checkout attempt limit reached"});
    const form=new URLSearchParams({
      mode:"payment",
      "payment_method_types[0]":"card",
      "line_items[0][quantity]":"1",
      "line_items[0][price_data][currency]":"usd",
      "line_items[0][price_data][unit_amount]":"1200",
      "line_items[0][price_data][product_data][name]":"Intentional Noise — one-time artist verification guarantee",
      "metadata[user_id]":user.id,
      "metadata[verification_request_id]":proof.data.id,
      "metadata[verification_payment_id]":payment.id,
      "client_reference_id":user.id,
      "payment_intent_data[metadata][verification_payment_id]":payment.id,
      success_url:SITE+"/payment-gateway.html?result=success",
      cancel_url:SITE+"/payment-gateway.html?result=cancelled"
    });
    const authHeader={Authorization:"Bearer "+stripeKey};
    const resp=await fetch("https://api.stripe.com/v1/checkout/sessions",{
      method:"POST",headers:{...authHeader,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":"verify-"+payment.id+"-"+attempt},body:form
    });
    const session=await resp.json();
    if(!resp.ok||session.livemode!==true||!/^cs_live_/.test(session.id||"")||!/^https:\/\/checkout\.stripe\.com\//.test(session.url||"")){
      console.error("Could not create live checkout",resp.status,session.error?.type||"");
      return result(503,{error:"Stripe live checkout not available"});
    }
    const saved=await db.from("artist_verification_payments").update({
      session_attempt:attempt,stripe_session_id:session.id,checkout_url:session.url,
      checkout_expires_at:new Date(session.expires_at*1000).toISOString()
    }).eq("id",payment.id).eq("status","pending").eq("session_attempt",payment.session_attempt).select("id").maybeSingle();
    if(saved.error||!saved.data){
      await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(session.id)+"/expire",{method:"POST",headers:authHeader}).catch(()=>{});
      return result(503,{error:"Unable to save checkout securely"});
    }
    return result(200,{checkout_url:session.url});
  }catch(e){console.error("Checkout exception",String(e));return result(503,{error:"Secure checkout unavailable"});}
});
