/**
 * Authenticator MFA staging only. The release gate is OFF, and this branch is
 * not deployed to Connect's main branch. No MFA network calls run while OFF.
 * Supabase Auth owns factor secrets; never send them to Connect tables/logs.
 */
import { MFA_RELEASE_ENABLED } from './mfa-feature-flag.js';
const $=id=>document.getElementById(id);
const status=msg=>{ $('status').textContent=msg };
const safeReturn=()=>{
  const raw=new URLSearchParams(location.search).get('next')||'auth.html';
  try{
    const url=new URL(raw,location.origin);
    const allow=new Set(['/auth.html','/search.html','/band-page.html','/media-storage.html','/show-your-work.html','/make-contact.html']);
    return url.origin===location.origin&&allow.has(url.pathname)
      ?url.pathname+url.search+url.hash
      :'/auth.html';
  }catch{return '/auth.html'}
};
const codeOf=input=>{
  const code=input.value.replace(/[^0-9]/g,'').trim();
  if(!/^[0-9]{6}$/.test(code))throw Error('Enter the six digits shown in your authenticator app.');
  return code;
};
function resetEnrollment(){
  pendingFactor=null;
  $('enrollCode').value='';
  $('setupSecret').textContent='';
  $('qr').removeAttribute('src');$('qr').hidden=true;
  $('enrollmentDetails').hidden=true;
  $('startEnroll').hidden=false;
}
let pendingFactor=null, client=null,user=null,loading=false,assurance=null,factors=[];
if (!MFA_RELEASE_ENABLED) {
  // Hard stop: no Auth API calls and no enroll or verify controls can run.
  $('disabled').hidden=false;
  $('mfaApp').hidden=true;
  status('MFA launch gate is OFF. Existing login remains unchanged.');
} else {
  $('disabled').hidden=true;
  $('mfaApp').hidden=false;
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.75.0');
  client=createClient('https://xyudcdgjyormlokwhfoi.supabase.co','sb_publishable_-gMviWXPBzov-2D-htf9iA_y6ZVV-q0',{
    auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}
  });
  $('signInLink').href='auth.html?next='+encodeURIComponent('/mfa.html');
  $('continueLink').href=safeReturn();

  async function refresh(){
    if(loading)return;
    loading=true;
    try{
      const {data,error}=await client.auth.getUser();
      user=error?null:data.user;
      $('signInRequired').hidden=!!user;
      $('mfaControls').hidden=!user;
      if(!user){status('Sign in to manage authenticator verification.');return}
      const [levelResult,factorResult]=await Promise.all([
        client.auth.mfa.getAuthenticatorAssuranceLevel(),
        client.auth.mfa.listFactors()
      ]);
      if(levelResult.error)throw levelResult.error;
      if(factorResult.error)throw factorResult.error;
      assurance=levelResult.data;
      factors=factorResult.data.totp||[];
      renderFactors();
      status('Security settings loaded. Authenticator enrollment changes only your own account.');
    }catch(e){status('Unable to load security settings: '+(e.message||'Please retry'))}
    finally{loading=false}
  }
  function renderFactors(){
    const current=assurance?.currentLevel||'aal1';
    const needed=assurance?.nextLevel==='aal2'&&current!=='aal2';
    $('assurance').textContent='Current session: '+(current==='aal2'?'Authenticator verified':'Password sign-in only');
    const verified=factors.filter(f=>f.status==='verified');
    const unverified=factors.filter(f=>f.status!=='verified');
    $('summary').textContent=verified.length+' verified authenticator'+(verified.length===1?'':'s')+' configured.';
    $('verifyPanel').hidden=!needed;
    $('enrollPanel').hidden=needed||verified.length>0;
    $('continueLink').hidden=needed;
    const select=$('factorSelect');select.replaceChildren();
    for(const f of verified){
      const opt=document.createElement('option');opt.value=f.id;
      opt.textContent=f.friendly_name||'Authenticator app';
      select.append(opt);
    }
    $('factors').replaceChildren();
    if(needed){
      const p=document.createElement('p');p.textContent='Second-factor verification is required before continuing.';
      $('factors').append(p);
    }
    const list=$('manageFactors');list.replaceChildren();
    if(!factors.length){const p=document.createElement('p');p.textContent='No authenticator devices configured.';list.append(p)}
    for(const f of factors){
      const item=document.createElement('div');item.className='factor';
      const p=document.createElement('p');p.textContent=(f.friendly_name||'Authenticator app')+
        ' — '+(f.status==='verified'?'Verified':'Setup not completed');item.append(p);
      const remove=document.createElement('button');remove.type='button';remove.className='secondary';
      remove.textContent=f.status==='verified'?'Remove authenticator':'Discard unfinished setup';
      remove.disabled=f.status==='verified'&&current!=='aal2';
      remove.addEventListener('click',async()=>{
        if(!confirm('Remove this authenticator factor from your account? This cannot be undone.'))return;
        remove.disabled=true;
        try{
          const {error}=await client.auth.mfa.unenroll({factorId:f.id});
          if(error)throw error;
          resetEnrollment();
          await refresh();
          status('Authenticator removed.');
        }catch(e){status('Could not remove authenticator: '+(e.message||'Unknown error'));remove.disabled=false}
      });
      item.append(remove);list.append(item);
    }
  }
  $('startEnroll').addEventListener('click',async()=>{
    if(pendingFactor)return;
    const button=$('startEnroll');button.disabled=true;
    try{
      const {data,error}=await client.auth.mfa.enroll({
        factorType:'totp',friendlyName:'Intentional Noise Connect'
      });
      if(error)throw error;
      pendingFactor=data.id;
      // Supabase returns a data:image/svg+xml URI for the QR code.
      const image=String(data?.totp?.qr_code||'');
      if(image.startsWith('data:image/svg+xml')){
        $('qr').src=image;$('qr').hidden=false;
      }
      $('setupSecret').textContent=String(data?.totp?.secret||'');
      $('enrollmentDetails').hidden=false;
      button.hidden=true;
      status('Scan the QR code or manually enter the secret, then confirm the six-digit code.');
    }catch(e){status('Unable to start setup: '+(e.message||'Unknown error'))}
    finally{button.disabled=false}
  });
  $('enrollVerifyForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!pendingFactor)return;
    const button=$('finishEnroll');button.disabled=true;
    try{
      const {error}=await client.auth.mfa.challengeAndVerify({
        factorId:pendingFactor,code:codeOf($('enrollCode'))
      });
      if(error)throw error;
      resetEnrollment();await refresh();
      status('Authenticator verified successfully. Store access to your authenticator safely.');
    }catch(e){status('Verification failed: '+(e.message||'Try the latest code'))}
    finally{button.disabled=false}
  });
  $('cancelEnroll').addEventListener('click',async()=>{
    if(!pendingFactor){resetEnrollment();return}
    const id=pendingFactor;
    $('cancelEnroll').disabled=true;
    try{
      const {error}=await client.auth.mfa.unenroll({factorId:id});
      if(error)throw error;
      resetEnrollment();await refresh();status('Unfinished setup discarded.');
    }catch(e){status('Could not discard setup: '+(e.message||'Unknown error'))}
    finally{$('cancelEnroll').disabled=false}
  });
  $('verifyForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const button=$('verifyButton');button.disabled=true;
    try{
      const factorId=$('factorSelect').value;
      if(!factorId||!factors.some(f=>f.id===factorId&&f.status==='verified'))
        throw Error('Select a verified authenticator.');
      const {error}=await client.auth.mfa.challengeAndVerify({
        factorId,code:codeOf($('verificationCode'))
      });
      if(error)throw error;
      $('verificationCode').value='';
      await refresh();
      status('Second-factor verification completed. You may continue.');
    }catch(e){status('Could not verify: '+(e.message||'Try the newest code'))}
    finally{button.disabled=false}
  });
  client.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT'){
      user=null;resetEnrollment();$('signInRequired').hidden=false;$('mfaControls').hidden=true;
      status('You have been signed out.');
    }
  });
  await refresh();
}
