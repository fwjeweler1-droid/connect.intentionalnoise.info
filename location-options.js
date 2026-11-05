// Location choices for musician profile forms. Saved values remain human-readable.
// ISO 3166-1 alpha-2 countries, presented using the visitor's English locale.
const codes="AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(' ');
const us="Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|American Samoa|Guam|Northern Mariana Islands|Puerto Rico|U.S. Virgin Islands".split('|');
const ca="Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Northwest Territories|Nova Scotia|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon".split('|');
const au="Australian Capital Territory|New South Wales|Northern Territory|Queensland|South Australia|Tasmania|Victoria|Western Australia".split('|');
const gb="England|Northern Ireland|Scotland|Wales".split('|');
const regionLists={"United States":us,"Canada":ca,"Australia":au,"United Kingdom":gb};
const displayNames=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames(['en'],{type:'region'}):null;
const names=codes.map(code=>({code,name:displayNames?displayNames.of(code):code})).sort((a,b)=>a.name.localeCompare(b.name));
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label||value;return o;}
function pickCountry(saved){
 const select=document.getElementById('country');
 const other=document.getElementById('country_other');
 select.replaceChildren(option('','Select a country'));
 for(const item of names)select.append(option(item.name,item.name));
 select.append(option('__other__','Other — specify country'));
 const hit=[...select.options].find(o=>o.value.toLowerCase()===(saved||'').trim().toLowerCase());
 select.value=hit&&hit.value?hit.value:saved?'__other__':'';
 other.value=select.value==='__other__'?(saved||''):'';
 syncCountry();
}
function syncCountry(){
 const select=document.getElementById('country'),wrap=document.getElementById('countryOtherWrap'),other=document.getElementById('country_other');
 const otherSelected=select.value==='__other__';
 wrap.hidden=!otherSelected;other.required=otherSelected;other.disabled=!otherSelected;
 const region=document.getElementById('region'),oldValue=region.dataset.saved||'';
 region.replaceChildren(option('','Select a state / region'));
 const country=otherSelected?other.value.trim():select.value;
 for(const state of (regionLists[country]||[]))region.append(option(state,state));
 region.append(option('__none__','Not applicable / no state or region'));
 region.append(option('__other__','Other — specify state / region'));
 const match=[...region.options].find(o=>o.value.toLowerCase()===oldValue.toLowerCase() && o.value);
 region.value=match?match.value:oldValue?'__other__':'';
 const stateOther=document.getElementById('region_other');
 stateOther.value=region.value==='__other__'?oldValue:'';
 syncRegion();
}
function syncRegion(){
 const select=document.getElementById('region'),wrap=document.getElementById('regionOtherWrap'),other=document.getElementById('region_other');
 const show=select.value==='__other__';
 wrap.hidden=!show;other.required=show;other.disabled=!show;
}
export function setupLocations(){
 document.getElementById('country').addEventListener('change',()=>{document.getElementById('region').dataset.saved='';syncCountry();});
 document.getElementById('region').addEventListener('change',()=>{document.getElementById('region').dataset.saved='';syncRegion();});
 pickCountry('');
}
export function loadLocations(country,region){
 const state=document.getElementById('region');state.dataset.saved=(region||'').trim();
 pickCountry((country||'').trim());
}
export function locationValues(){
 const c=document.getElementById('country'),co=document.getElementById('country_other'),r=document.getElementById('region'),ro=document.getElementById('region_other');
 const country=c.value==='__other__'?co.value.trim():c.value;
 const region=r.value==='__other__'?ro.value.trim():r.value==='__none__'?'':r.value;
 if(!country||country.length>100)throw Error('Choose a country, or fill in Other country.');
 if(r.value==='__other__'&&(!region||region.length>100))throw Error('Enter your state / region in the Other field.');
 return {country,region};
}