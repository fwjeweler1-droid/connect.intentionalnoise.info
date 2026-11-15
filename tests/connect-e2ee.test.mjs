import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;

// The production app loads the source as a browser ESM module. Import it as a
// data URL to make the test independent of Node's package type settings.
const source = await readFile(new URL('../connect-e2ee.js', import.meta.url), 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const alice='00000000-0000-4000-8000-000000000001';
const bob='00000000-0000-4000-8000-000000000002';
const mallory='00000000-0000-4000-8000-000000000003';
async function keypair(id) {
 const enc=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const sig=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 return {keys:{encryption:enc.privateKey,signing:sig.privateKey},publicRecord:{user_id:id,encryption_public_key:await crypto.subtle.exportKey('jwk',enc.publicKey),signing_public_key:await crypto.subtle.exportKey('jwk',sig.publicKey)}};
}
const A=await keypair(alice), B=await keypair(bob), C=await keypair(mallory);
const deepSort=v=>Array.isArray(v)?v.map(deepSort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,deepSort(v[k])])):v;
test('receiver and sender decrypt independently after database JSONB key reordering',async()=>{
 const message='Hello, music world 🎶 — Salut! こんにちは';
 const packet=deepSort(JSON.parse(JSON.stringify(await mod.encryptMessage(message,alice,bob,A.keys,A.publicRecord,B.publicRecord))));
 assert.equal(await mod.decryptMessage(packet,alice,bob,bob,B.keys,A.publicRecord),message);
 assert.equal(await mod.decryptMessage(packet,alice,bob,alice,A.keys,A.publicRecord),message);
 assert.equal(packet.ciphertext.includes('music world'),false);
});
test('modified ciphertext is rejected by sender signature',async()=>{
 const packet=await mod.encryptMessage('A secret',alice,bob,A.keys,A.publicRecord,B.publicRecord);
 packet.ciphertext=packet.ciphertext.slice(0,-4)+'AAAA';
 await assert.rejects(()=>mod.decryptMessage(packet,alice,bob,bob,B.keys,A.publicRecord),/signature|authenticate|decrypt|invalid/i);
});
test('impersonated sender and altered recipient are rejected',async()=>{
 const packet=await mod.encryptMessage('Authentic',alice,bob,A.keys,A.publicRecord,B.publicRecord);
 await assert.rejects(()=>mod.decryptMessage(packet,mallory,bob,bob,B.keys,C.publicRecord),/signature|authenticate|decrypt|invalid/i);
 await assert.rejects(()=>mod.decryptMessage(packet,alice,mallory,bob,B.keys,A.publicRecord),/signature|authenticate|decrypt|invalid/i);
});
test('third party without a wrapped envelope cannot decrypt',async()=>{
 const packet=await mod.encryptMessage('Only us',alice,bob,A.keys,A.publicRecord,B.publicRecord);
 await assert.rejects(()=>mod.decryptMessage(packet,alice,bob,mallory,C.keys,A.publicRecord),/Unsupported encrypted message/);
});
test('wrong signing identity rejects even intact encrypted body',async()=>{
 const packet=await mod.encryptMessage('Test',alice,bob,A.keys,A.publicRecord,B.publicRecord);
 await assert.rejects(()=>mod.decryptMessage(packet,alice,bob,bob,B.keys,C.publicRecord),/Invalid sender signature/);
});
test('identity fingerprint is stable and changes with a different key',async()=>{
 const f1=await mod.fingerprint(A.publicRecord);
 const f2=await mod.fingerprint(deepSort(A.publicRecord));
 const f3=await mod.fingerprint(B.publicRecord);
 assert.equal(f1,f2);assert.notEqual(f1,f3);
});
test('fail closed for invalid and excessive messages',async()=>{
 await assert.rejects(()=>mod.encryptMessage(' ',alice,bob,A.keys,A.publicRecord,B.publicRecord),/Message must/);
 await assert.rejects(()=>mod.encryptMessage('x'.repeat(2001),alice,bob,A.keys,A.publicRecord,B.publicRecord),/Message must/);
 await assert.rejects(()=>mod.encryptMessage('x',alice,bob,A.keys,A.publicRecord,null),/Both participants/);
});


// Tiny IndexedDB test double; covers only the transactional methods the
// cryptography module uses. Browser Safari/Chrome still require live tests.
test('encrypted key backup unlocks on another device; wrong passphrase fails',async()=>{
 const data=new Map(),db={
  createObjectStore(n){data.set(n,new Map())},
  transaction(name){const t={oncomplete:null,onerror:null};
   t.objectStore=()=>({
    get(id){const r={result:null,onsuccess:null,onerror:null};queueMicrotask(()=>{r.result=data.get(name).get(id);r.onsuccess?.()});return r},
    put(value,id){data.get(name).set(id,value);queueMicrotask(()=>t.oncomplete?.())},
    delete(id){data.get(name).delete(id);queueMicrotask(()=>t.oncomplete?.())}
   });return t
  },
  close(){}
 };
 let initialized=false;
 globalThis.indexedDB={open(){const request={result:db,onsuccess:null,onupgradeneeded:null,onerror:null};queueMicrotask(()=>{if(!initialized){initialized=true;request.onupgradeneeded?.()}request.onsuccess?.()});return request}};
 const user='00000000-0000-4000-8000-000000000004',pass='a very long recovery passphrase with spaces';
 const setup=await mod.createIdentity(user,pass);
 assert.equal(await mod.localIdentity(user),null,'do not persist key before registration');
 await mod.persistIdentity(user,setup.local);
 const stored=await mod.localIdentity(user);
 assert.equal(stored.signing.extractable,false);
 assert.equal(stored.encryption.extractable,false);
 await mod.clearLocal(user);
 assert.equal(await mod.localIdentity(user),null);
 await assert.rejects(()=>mod.restoreIdentity(user,'incorrect passphrase definitely long',setup.backup,setup.publicRecord),/Could not unlock key/);
 assert.equal(await mod.localIdentity(user),null);
 const recovered=await mod.restoreIdentity(user,pass,setup.backup,setup.publicRecord);
 const packet=await mod.encryptMessage('Device recovery succeeded',user,bob,recovered,setup.publicRecord,B.publicRecord);
 assert.equal(await mod.decryptMessage(packet,user,bob,bob,B.keys,setup.publicRecord),'Device recovery succeeded');
});
test('key substitution after trust on first use is rejected',async()=>{
 const own='00000000-0000-4000-8000-000000000004';
 const peer='00000000-0000-4000-8000-000000000002';
 const pinned=await mod.pinPeer(own,peer,B.publicRecord);
 assert.equal(typeof pinned,'string');
 await assert.rejects(()=>mod.pinPeer(own,peer,C.publicRecord),/identity changed/);
});
test('checkout and chat page never contain a plaintext fallback in the new send handler',async()=>{
 const html=await readFile(new URL('../make-contact.html',import.meta.url),'utf8');
 assert.match(html,/encrypted_payload=await e2ee\.encryptMessage/);
 assert.match(html,/body:'\[Encrypted message\]',encrypted_payload/);
 assert.match(html,/Plaintext fallback is disabled/);
 assert.doesNotMatch(html,/insert\(\{sender_id:user\.id,recipient_id:peer,body:message\}\)/);
 assert.doesNotMatch(html,/src="\/local-translate\.js"/);
});
