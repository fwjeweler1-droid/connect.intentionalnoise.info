export const categories = [["gig_requests","Current gig requests"],["available_for_gigs","Available for gigs"],["all","Everyone"],["musician","Musician"],["sound_engineer","Sound engineer"],["band","Band"],["vocalist","Vocalist"],["guitar","Guitarist"],["bass","Bassist"],["drums","Drummer"],["keys","Keyboard player"],["producer","Producer"],["songwriter","Songwriter"]];
const patterns = {
musician: /musician|guitar|bass|drum|vocal|sing|keyboard|piano|instrument|songwrit|violin|cello|sax|trumpet|trombone|fiddle|banjo|mandolin|flute|clarinet|percussion/i,
sound_engineer: /sound[ _-]?engineer|audio[ _-]?engineer|recording[ _-]?engineer|mixing|mastering|live sound|foh/i,
band: /\bband\b|ensemble|orchestra|choir/i,
vocalist: /vocal|singer|singing/i,
guitar: /guitar|guitarist|resonator|dobro|lap steel|pedal steel|fingerstyle/i,
bass: /\bbass(?:ist)?\b/i,
drums: /drum|percussion/i,
keys: /keyboard|piano|pianist|organist|synth/i,
producer: /produc/i,
songwriter: /songwrit|composer|composition/i
};
export function matchesCategory(profile, category) {
if (category === 'all') return true;
if (category === 'available_for_gigs') return profile.available_for_gigs === true;
if (category === 'gig_requests') return false;
const roles = profile.roles || [];
if (roles.includes(category)) return true;
if (category === 'band' && profile.profile_type === 'band') return true;
if (category === 'musician' && roles.some(r=>['musician','vocalist','guitar','bass','drums','keys','songwriter'].includes(r))) return true;
return !!patterns[category]?.test([...(profile.instruments||[]),...roles,profile.bio||''].join(' '));
}
export function safeSearchReturn(raw, origin) {
try { const url = new URL(raw,origin); return url.origin===origin && ['/search.html','/gig-requests.html','/band-page.html'].includes(url.pathname) ? url.pathname+url.search : ''; } catch { return ''; }
}

