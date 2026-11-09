// Supabase Edge Function: authenticated, participant-scoped, on-demand chat translation.
// No user-supplied arbitrary text: only existing messages visible under RLS may be translated.
// LIBRETRANSLATE_URL (HTTPS endpoint) must be configured in Supabase secrets to enable requests.
// LIBRETRANSLATE_API_KEY is optional for a protected/self-hosted instance.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const SITE = "https://connect.intentionalnoise.info";
const HEADERS = {
  "Access-Control-Allow-Origin": SITE,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8"
};
const LANGUAGES = new Set([
  "en","es","fr","de","pa","hi","ur","ar","pt","bn","ta","te",
  "zh-CN","ja","ko","sw","it","tr","ru","id","vi","nl"
]);
const REQ_LIMIT_USER = 20, REQ_LIMIT_GLOBAL = 150;
const reply=(status:number, value:Record<string,unknown>)=>
  new Response(JSON.stringify(value),{status,headers:HEADERS});
// HTTPS endpoint is configured server-side only, never supplied by a browser user.
function libreBase(): URL|null {
  try {
    const raw=Deno.env.get("LIBRETRANSLATE_URL")?.trim();
    if(!raw) return null;
    const url=new URL(raw.endsWith("/")?raw:raw+"/");
    if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash) return null;
    return url;
  }catch{return null;}
}
const providerTarget=(target:string)=>target==="zh-CN"?"zh":target;

Deno.serve(async (req:Request)=>{
  const origin=req.headers.get("origin");
  if(origin && origin!==SITE) return reply(403,{error:"Disallowed origin"});
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:HEADERS});
  if(req.method!=="GET" && req.method!=="POST") return reply(405,{error:"Method not allowed"});
  const provider=libreBase();
  if(req.method==="GET") {
    if(!provider) return reply(200,{available:false,languages:[]});
    try {
      const response=await fetch(new URL("languages",provider),{signal:AbortSignal.timeout(6500)});
      if(!response.ok) return reply(200,{available:false,languages:[]});
      const listed=await response.json();
      if(!Array.isArray(listed)) return reply(200,{available:false,languages:[]});
      const codes=new Set(listed.map(item=>item?.code).filter(code=>typeof code==="string"));
      const languages=[...LANGUAGES].filter(code=>codes.has(providerTarget(code)));
      return reply(200,{available:languages.length>0,languages});
    }catch{return reply(200,{available:false,languages:[]});}
  }
  if(!provider) return reply(503,{error:"Translation service is not configured"});
  const jwt=(req.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!jwt) return reply(401,{error:"Sign in required"});
  const projectUrl=Deno.env.get("SUPABASE_URL");
  const publishable=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default
    ||Deno.env.get("SUPABASE_ANON_KEY");
  const secret=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default
    ||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!projectUrl||!publishable||!secret) return reply(503,{error:"Translation security configuration unavailable"});
  let body:unknown;
  try { body=await req.json(); }catch{return reply(400,{error:"Invalid request"});}
  if(!body||typeof body!=="object") return reply(400,{error:"Invalid request"});
  const data=body as Record<string,unknown>;
  if(!Number.isSafeInteger(data.messageId)||Number(data.messageId)<=0||typeof data.targetLanguage!=="string"||!LANGUAGES.has(data.targetLanguage))
    return reply(400,{error:"Invalid message or language"});
  const client=createClient(projectUrl,publishable,{
    global:{headers:{Authorization:"Bearer "+jwt}},
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data:auth,error:authErr}=await client.auth.getUser(jwt);
  if(authErr||!auth.user) return reply(401,{error:"Sign in required"});
  const {data:message,error:readErr}=await client.from("connect_direct_messages")
    .select("id,sender_id,recipient_id,body").eq("id",data.messageId).maybeSingle();
  if(readErr) return reply(503,{error:"Message lookup unavailable"});
  if(!message||!([message.sender_id,message.recipient_id].includes(auth.user.id)))
    return reply(404,{error:"Message not found"});
  if(message.body.length>2000) return reply(400,{error:"Message exceeds translation limit"});

  // Server-only audit table with no direct authenticated/public policies.
  const admin=createClient(projectUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const since=new Date(Date.now()-24*60*60*1000).toISOString();
  const [{count:mine,error:mineErr},{count:total,error:totalErr}]=await Promise.all([
    admin.from("connect_translation_requests").select("id",{count:"exact",head:true})
      .eq("requester_id",auth.user.id).gte("requested_at",since),
    admin.from("connect_translation_requests").select("id",{count:"exact",head:true})
      .gte("requested_at",since)
  ]);
  if(mineErr||totalErr) return reply(503,{error:"Translation quota unavailable"});
  if((mine||0)>=REQ_LIMIT_USER||(total||0)>=REQ_LIMIT_GLOBAL)
    return reply(429,{error:"Daily translation allowance reached"});
  const {error:writeErr}=await admin.from("connect_translation_requests")
    .insert({requester_id:auth.user.id,message_id:message.id});
  if(writeErr) return reply(503,{error:"Translation quota unavailable"});

  try {
    const apiKey=Deno.env.get("LIBRETRANSLATE_API_KEY")?.trim();
    const upstream=await fetch(new URL("translate",provider),{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({q:message.body,source:"auto",target:providerTarget(data.targetLanguage as string),
        format:"text",...(apiKey?{api_key:apiKey}:{})}),
      signal:AbortSignal.timeout(12000)
    });
    if(!upstream.ok) return reply(502,{error:"Translation service unavailable"});
    const json=await upstream.json();
    const translatedText=json?.translatedText;
    const sourceLanguage=json?.detectedLanguage?.language;
    if(typeof translatedText!=="string"||!translatedText.trim())
      return reply(502,{error:"Translation service returned no text"});
    return reply(200,{translatedText,
      sourceLanguage:typeof sourceLanguage==="string"?sourceLanguage:null,
      targetLanguage:data.targetLanguage});
  }catch{return reply(502,{error:"Translation service unavailable"});}
});
