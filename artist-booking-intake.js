// Private, optional artist booking intake for one authenticated owner.
// The matching public.artist_booking_intake table and owner-only RLS must exist
// before this client module is deployed. No public profile synchronization.
export function setupArtistBookingIntake(db,getUser){
  const $=id=>document.getElementById(id);
  const keys=['performance_details','live_sample_url','booking_availability','show_format','fee_details','technical_needs'];
  const status=msg=>{$('bookingIntakeStatus').textContent=msg};
  const form=$('bookingIntakeForm');
  let loading=false;
  function reset(){
    form.reset();
    status('Only you can see these answers. They are not published to venues or public artist pages.');
  }
  async function load(){
    const user=getUser();
    reset();
    if(!user)return;
    status('Loading your private booking answers…');
    const {data,error}=await db.from('artist_booking_intake')
      .select(keys.join(',')).eq('user_id',user.id).maybeSingle();
    if(!getUser()||getUser().id!==user.id)return;
    if(error){status('Could not load booking answers: '+error.message);return;}
    for(const key of keys)$(key).value=data?.[key]||'';
    status(data?'Saved booking answers loaded. Private to your account.':'No booking answers saved yet. All questions are optional.');
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const user=getUser();
    if(!user||loading)return;
    const values=Object.fromEntries(keys.map(k=>[k,$(k).value.trim()]));
    if(values.live_sample_url){
      try{const u=new URL(values.live_sample_url);if(u.protocol!=='https:')throw Error('HTTPS required');}
      catch{status('Your performance sample link must begin with https://.');return;}
    }
    const limits={performance_details:800,live_sample_url:500,booking_availability:600,show_format:600,fee_details:600,technical_needs:800};
    for(const [key,value] of Object.entries(values)){
      if(value.length>limits[key]){status('One or more answers exceed the field limit.');return;}
    }
    loading=true;$('saveBookingIntake').disabled=true;status('Saving your private booking answers…');
    try{
      const {error}=await db.from('artist_booking_intake').upsert({
        user_id:user.id,...values,updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(error)throw error;
      status('Five-question booking intake saved privately. Nothing was published to venues.');
    }catch(error){
      status('Booking answers could not be saved: '+(error.message||error));
    }finally{
      loading=false;$('saveBookingIntake').disabled=false;
    }
  });
  return {load,reset};
}
