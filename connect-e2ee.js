// Intentional Noise Connect — browser-side encrypted-message envelope v1.
// HTTPS and Web Crypto required. This is NOT a Double Ratchet or audited protocol.
// Keys never leave the browser unencrypted; the optional recovery backup is
// encrypted with a user-held passphrase. No plaintext is sent to Supabase.
const te=new TextEncoder(),td=new TextDecoder();
const subtle=crypto.subtle;
const DB_NAME='intentional-noise-connect-e2ee',STORE='keyring',PIN_STORE='peer-pins';
const byte=a=>a instanceof Uint8Array?a:new Uint8Array(a);
const b64=a=>{const b=byte(a);let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s)};
const un64=s=>{if(typeof s!=='string'||s.length>30000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('Malformed encrypted message');const a=atob(s);return Uint8Array.from(a,c=>c.charCodeAt(0))};
const fresh=n=>crypto.getRandomValues(new Uint8Array(n));
const aes=raw=>subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
const ecPub=(jwk,purpose)=>{if(!jwk||jwk.kty!=='EC'||jwk.crv!=='P-256'||typeof jwk.x!=='string'||typeof jwk.y!=='string')throw Error('Invalid public key');return subtle.importKey('jwk',jwk,{name:purpose,namedCurve:'P-256'},true,purpose==='ECDSA'?['verify']:[])};
const canonKey=k=>[k.kty,k.crv,k.x,k.y];
function store(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{r.result.createObjectStore(STORE);r.result.createObjectStore(PIN_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function get(storeName,id){const db=await store();return new Promise((resolve,reject)=>{const t=db.transaction(storeName,'readonly'),r=t.objectStore(storeName).get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);t.oncomplete=()=>db.close();t.onerror=()=>reject(t.error)})}
async function put(storeName,id,value){const db=await store();return new Promise((resolve,reject)=>{const t=db.transaction(storeName,'readwrite');t.objectStore(storeName).put(value,id);t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>{db.close();reject(t.error)}})}
export const localIdentity=id=>get(STORE,id);
export async function clearLocal(id){const db=await store();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(id);t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>{db.close();reject(t.error)}})}
async function importPrivate(record){return {encryption:await subtle.importKey('pkcs8',un64(record.encryption),{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']),signing:await subtle.importKey('pkcs8',un64(record.signing),{name:'ECDSA',namedCurve:'P-256'},false,['sign'])}}
async function deriveBackup(passphrase,salt,iterations){const key=await subtle.importKey('raw',te.encode(passphrase),'PBKDF2',false,['deriveKey']);return subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
function matching(a,b){return JSON.stringify(canonKey(a))===JSON.stringify(canonKey(b))}
export async function fingerprint(record){const x=te.encode(JSON.stringify([canonKey(record.encryption_public_key),canonKey(record.signing_public_key)]));const sum=new Uint8Array(await subtle.digest('SHA-256',x));return Array.from(sum).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase().match(/.{1,4}/g).join(' ')}
export async function pinPeer(myId,peerId,record){const fp=await fingerprint(record);const key=myId+'|'+peerId;const old=await get(PIN_STORE,key);if(old&&old!==fp)throw Error('Security warning: this member’s encryption identity changed. Messaging paused; verify their key out of band.');if(!old)await put(PIN_STORE,key,fp);return fp}
export async function createIdentity(id,passphrase){
 if(typeof passphrase!=='string'||passphrase.length<16)throw Error('Use a recovery passphrase of at least 16 characters');
 if(await localIdentity(id))throw Error('Encryption is already enabled on this device');
 const enc=await subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const sig=await subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const publicRecord={user_id:id,encryption_public_key:await subtle.exportKey('jwk',enc.publicKey),signing_public_key:await subtle.exportKey('jwk',sig.publicKey)};
 const priv={encryption:b64(await subtle.exportKey('pkcs8',enc.privateKey)),signing:b64(await subtle.exportKey('pkcs8',sig.privateKey)),publicRecord};
 const salt=fresh(16),iv=fresh(12),iterations=600000,backKey=await deriveBackup(passphrase,salt,iterations);
 const cipher=await subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode('connect-e2ee-backup|'+id)},backKey,te.encode(JSON.stringify(priv)));
 const backup={user_id:id,kdf_salt:b64(salt),kdf_iterations:iterations,nonce:b64(iv),ciphertext:b64(cipher)};
 const keys=await importPrivate(priv);
 const local={...keys,publicRecord};
 await put(STORE,id,local);
 return {local,publicRecord,backup};
}
export async function restoreIdentity(id,passphrase,backup,publicRecord){
 if(!backup||backup.kdf_iterations!==600000)throw Error('Unsupported recovery-key format');
 const key=await deriveBackup(passphrase,un64(backup.kdf_salt),backup.kdf_iterations);
 let data;
 try{const bytes=await subtle.decrypt({name:'AES-GCM',iv:un64(backup.nonce),additionalData:te.encode('connect-e2ee-backup|'+id)},key,un64(backup.ciphertext));data=JSON.parse(td.decode(bytes))}catch{throw Error('Could not unlock key. Check your recovery passphrase.')}
 if(!matching(data.publicRecord.encryption_public_key,publicRecord.encryption_public_key)||!matching(data.publicRecord.signing_public_key,publicRecord.signing_public_key))throw Error('Registered encryption identity does not match backup. Contact support.');
 const local={...await importPrivate(data),publicRecord};
 await put(STORE,id,local);return local;
}
function aad(sender,recipient){return te.encode('intentional-noise-e2ee-v1|'+sender+'|'+recipient)}
function signedBytes(sender,recipient,p){return te.encode(JSON.stringify([1,sender,recipient,canonKey(p.epk),p.salt,p.iv,p.ciphertext,Object.keys(p.wraps).sort().map(id=>[id,p.wraps[id].iv,p.wraps[id].ciphertext])]))}
async function wrapKey(ephemeralPrivate,pub,salt,sender,recipient,target,cek){
 const peer=await ecPub(pub.encryption_public_key,'ECDH');
 const bits=await subtle.deriveBits({name:'ECDH',public:peer},ephemeralPrivate,256);
 const seed=await subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
 const key=await subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info:te.encode('IN-connect-e2ee-v1:wrap:'+target)},seed,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const iv=fresh(12),ciphertext=await subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode('IN-connect-e2ee-v1:wrap:'+sender+':'+recipient+':'+target)},key,cek);
 return {iv:b64(iv),ciphertext:b64(ciphertext)};
}
export async function encryptMessage(message,sender,recipient,selfKeys,selfPublic,peerPublic){
 if(!selfKeys||!peerPublic)throw Error('Both participants must enable encryption');
 if(typeof message!=='string'||!message.trim()||message.length>2000)throw Error('Message must have 1–2,000 characters');
 const ephem=await subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
 const ephemeralPub=await subtle.exportKey('jwk',ephem.publicKey),salt=fresh(16),iv=fresh(12),cek=fresh(32);
 const ciphertext=await subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(sender,recipient)},await aes(cek),te.encode(message));
 const p={v:1,epk:ephemeralPub,salt:b64(salt),iv:b64(iv),ciphertext:b64(ciphertext),wraps:{}};
 p.wraps[sender]=await wrapKey(ephem.privateKey,selfPublic,salt,sender,recipient,sender,cek);
 p.wraps[recipient]=await wrapKey(ephem.privateKey,peerPublic,salt,sender,recipient,recipient,cek);
 p.signature=b64(await subtle.sign({name:'ECDSA',hash:'SHA-256'},selfKeys.signing,signedBytes(sender,recipient,p)));
 cek.fill(0);return p;
}
export async function decryptMessage(packet,sender,recipient,myId,myKeys,senderPublic){
 if(!myKeys)throw Error('Unlock your encryption key to read');
 if(!packet||packet.v!==1||typeof packet.ciphertext!=='string'||!packet.epk||!packet.wraps||!packet.wraps[myId])throw Error('Unsupported encrypted message');
 const signing=await ecPub(senderPublic.signing_public_key,'ECDSA');
 const authentic=await subtle.verify({name:'ECDSA',hash:'SHA-256'},signing,un64(packet.signature),signedBytes(sender,recipient,packet));
 if(!authentic)throw Error('Invalid sender signature');
 const shared=await subtle.deriveBits({name:'ECDH',public:await ecPub(packet.epk,'ECDH')},myKeys.encryption,256);
 const salt=un64(packet.salt),seed=await subtle.importKey('raw',shared,'HKDF',false,['deriveKey']);
 const key=await subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info:te.encode('IN-connect-e2ee-v1:wrap:'+myId)},seed,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const wrapped=packet.wraps[myId];const cek=await subtle.decrypt({name:'AES-GCM',iv:un64(wrapped.iv),additionalData:te.encode('IN-connect-e2ee-v1:wrap:'+sender+':'+recipient+':'+myId)},key,un64(wrapped.ciphertext));
 const plain=await subtle.decrypt({name:'AES-GCM',iv:un64(packet.iv),additionalData:aad(sender,recipient)},await aes(cek),un64(packet.ciphertext));
 return td.decode(plain);
}
