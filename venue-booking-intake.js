// Optional and private venue booking-preferences intake.
// This never publishes an offer or venue profile.
export function setupVenueBookingIntake(db,getUser,isVenue){
  const $=id=>document.getElementById(id);
  const form=$('venueIntakeForm');
  const fields=['event_audience','performance_schedule','compensation_terms','technical_provisions','venue_logistics'];
  const limits={event_audience:700,performance_schedule:700,compensation_terms:700,technical_provisions:850,venue_logistics:850};
  const status=text=>{$('venueIntakeStatus').textContent=text};
  let saving=false;

  function reset(){
    form.reset();
    status('These answers are private to your account and are not shown on public gig offers.');
  }
  async function load(){
    const user=getUser();
    reset();
    if(!user||!isVenue())return;
    status('Loading your private venue answers…');
    const {data,error}=await db.from('venue_booking_intake')
      .select(fields.join(',')).eq('user_id',user.id).maybeSingle();
    if(!getUser()||getUser().id!==user.id||!isVenue())return;
    if(error){status('Could not load venue answers: '+error.message);return;}
    for(const field of fields)$(field).value=data?.[field]||'';
    status(data?'Your saved venue answers are ready to edit.':'No saved venue answers yet. Every question is optional.');
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const user=getUser();
    if(!user||!isVenue()||saving)return;
    const values=Object.fromEntries(fields.map(field=>[field,$(field).value.trim()]));
    for(const [field,value] of Object.entries(values)){
      if(value.length>limits[field]){status('One or more answers are too long.');return;}
    }
    saving=true;
    $('saveVenueIntake').disabled=true;
    status('Saving private venue answers…');
    try{
      const {error}=await db.from('venue_booking_intake').upsert({
        user_id:user.id,...values,updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(error)throw error;
      if(getUser()?.id===user.id&&isVenue())status('Five venue questions saved privately. No booking offer was published.');
    }catch(error){
      if(getUser()?.id===user.id)status('Venue answers could not be saved: '+(error.message||error));
    }finally{
      saving=false;
      $('saveVenueIntake').disabled=false;
    }
  });
  return {load,reset};
}
