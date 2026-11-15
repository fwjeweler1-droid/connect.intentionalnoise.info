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
