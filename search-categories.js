export const categories = [["gig_requests","Current gig requests"],["available_for_gigs","Available for gigs"],["all","Everyone"],["musician","Musician"],["sound_engineer","Sound engineer"],["music_instructor","Instructor"],["band","Band"],["vocalist","Vocalist"],["violinist","Violinist"],["guitar","Guitarist"],["bass","Bassist"],["drums","Drummer"],["keys","Keyboard player"],["producer","Producer"],["songwriter","Songwriter"],["artist","Artist"],["videographer","Videographer"],["digital_creator","Digital Creator"]];
const patterns = {
musician: /musician|guitar|bass|drum|vocal|sing|keyboard|piano|instrument|songwrit|violin|cello|sax|trumpet|trombone|fiddle|banjo|mandolin|flute|clarinet|percussion/i,
sound_engineer: /sound[ _-]?engineer|audio[ _-]?engineer|recording[ _-]?engineer|mixing|mastering|live sound|foh/i,
music_instructor: /music[ _-]?(?:instructor|teacher|educator)|(?:instrument|violin|piano|guitar|voice)[ _-]?(?:teacher|tutor|instructor)|teach(?:es|ing)?[ _-]?(?:music|lessons)|private[ _-]?music[ _-]?lessons/i,
band: /\bband\b|ensemble|orchestra|choir/i,
vocalist: /vocal|singer|singing/i,
violinist: /violin|fiddl/i,
guitar: /guitar|guitarist|resonator|dobro|lap steel|pedal steel|fingerstyle/i,
bass: /\bbass(?:ist)?\b/i,
drums: /drum|percussion/i,
keys: /keyboard|piano|pianist|organist|synth/i,
producer: /produc/i,
songwriter: /songwrit|composer|composition/i,
artist: /\bartist\b|visual[ _-]?art|illustrat|painting|graphic[ _-]?design/i,
videographer: /videograph|filmmak|cinematograph|video[ _-]?(?:product|shoot|edit)/i,
digital_creator: /digital[ _-]?creat|content[ _-]?creat|digital[ _-]?media|social[ _-]?content/i
};
export function matchesCategory(profile, category) {
if (category === 'all') return true;
if (category === 'available_for_gigs') return profile.available_for_gigs === true;
if (category === 'gig_requests') return false;
const roles = profile.roles || [];
if (roles.includes(category)) return true;
if (category === 'band' && profile.profile_type === 'band') return true;
if (category === 'musician' && roles.some(r=>['musician','vocalist','violinist','guitar','bass','drums','keys','songwriter'].includes(r))) return true;
return !!patterns[category]?.test([...(profile.instruments||[]),...roles,profile.bio||''].join(' '));
}
export function safeSearchReturn(raw, origin) {
try { const url = new URL(raw,origin); return url.origin===origin && ['/search.html','/gig-requests.html','/band-page.html','/review-work.html','/media-storage.html','/studio.html','/releases-and-gigs.html','/fill-my-stage.html'].includes(url.pathname) ? url.pathname+url.search : ''; } catch { return ''; }
}


