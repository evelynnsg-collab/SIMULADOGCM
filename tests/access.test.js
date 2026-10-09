const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {makeHandler}=require('../server/handler');
const {passwordHash,digest}=require('../server/security');
test('controle de acesso completo e vínculo exclusivo',async t=>{
 const pg=new PGlite(); await pg.exec(fs.readFileSync('server/schema.sql','utf8'));
 const db={query:(...args)=>pg.query(...args),connect:async()=>({query:(...args)=>pg.query(...args),release(){}})};
 const config={NODE_ENV:'test',ADMIN_USERNAME:'admin-test',ADMIN_PASSWORD_HASH:await passwordHash('test-password')};
 const server=http.createServer(makeHandler(async()=>db,config));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;config.APP_ORIGIN=origin;
 t.after(async()=>{await new Promise(r=>server.close(r));await pg.close()});
 function browser(){const jar={};const request=async(path,body,override={})=>{const res=await fetch(origin+path,{method:body?'POST':'GET',redirect:'manual',headers:{origin,'content-type':'application/json',cookie:Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; '),...override},...(body?{body:JSON.stringify(body)}:{})});for(const c of res.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');jar[k]=v;}return res;};request.jar=jar;return request;}
 const admin=browser(),a=browser(),b=browser();
 assert.equal((await a('/questions.js')).status,303);
 assert.equal((await a('/human-rights.js')).status,303);
 assert.equal((await a('/computing.js')).status,303);
 assert.equal((await admin('/api/login',{mode:'admin',username:'admin-test',password:'wrong'})).status,401);
 assert.equal((await admin('/api/login',{mode:'admin',username:'admin-test',password:'test-password'})).status,200);
 assert.equal((await admin('/api/admin/keys',{name:'Aluno'},{origin:'https://evil.invalid'})).status,403);
 const created=await admin('/api/admin/keys',{name:'Aluno'});assert.equal(created.status,201);const {key,id}=await created.json();
 const row=(await pg.query('SELECT * FROM gcm_keys')).rows[0];assert.equal(row.key_hash,digest(key));assert.notEqual(row.key_hash,key);
 const first=await Promise.all([a('/api/login',{key}),b('/api/login',{key})]);assert.deepEqual(first.map(r=>r.status).sort(),[200,403]);
 const good=first[0].status===200?a:b,bad=first[0].status===200?b:a;
 const initial=await first.find(r=>r.status===200).json();
 const proof=initial.deviceProof;assert.match(proof,/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
 assert.equal((await good('/questions.js')).status,200);
 assert.equal((await good('/computing.js')).status,200);
 const material=await good('/human-rights.js');assert.equal(material.status,200);assert.match(await material.text(),/const HUMAN_RIGHTS/);
 assert.equal((await good('/api/admin/keys')).status,403);
 assert.equal((await good('/admin.js')).status,403);
 assert.equal((await good('/admin.html')).status,404);
 assert.equal((await good('/server/schema.sql')).status,404);
 assert.equal((await good('/api/logout',{})).status,200);
 assert.equal((await good('/api/login',{key})).status,200);
 assert.equal((await bad('/api/login',{key})).status,403);
 // Existing accounts receive a backup while logged in, without changing their key.
 const me=await (await good('/api/me')).json();assert.equal(me.deviceProof,proof);
 assert.equal((await (await admin('/api/me')).json()).deviceProof,undefined);
 // Active student sessions renew without creating another key or device.
 await pg.query("UPDATE gcm_sessions SET expires_at=NOW()+INTERVAL '30 minutes' WHERE key_id=$1",[id]);
 const renewed=await good('/api/me');assert.equal(renewed.status,200);assert.equal(renewed.headers.getSetCookie().length,2);
 const exp=(await pg.query('SELECT expires_at FROM gcm_sessions WHERE key_id=$1',[id])).rows[0].expires_at;
 assert.ok(new Date(exp).getTime()>Date.now()+6*86400000);
 // Expiration does not invalidate the person's original key.
 await pg.query("UPDATE gcm_sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE key_id=$1",[id]);
 assert.equal((await good('/api/me')).status,401);
 assert.equal((await good('/api/login',{key})).status,200);
 // Lost cookies recover with this key AND its signed browser backup, never with key alone.
 for(const name of Object.keys(good.jar))delete good.jar[name];
 assert.equal((await good('/api/login',{key})).status,403);
 assert.equal((await good('/api/login',{key,deviceProof:proof.slice(0,-1)+(proof.endsWith('A')?'B':'A')})).status,403);
 assert.equal((await good('/api/login',{key,deviceProof:proof})).status,200);
 assert.equal((await bad('/api/login',{key})).status,403);
 assert.equal((await good('/api/admin/action',{id,action:'restore'})).status,403);
 assert.equal((await admin('/api/admin/action',{id,action:'block'})).status,200);
 assert.equal((await good('/api/me')).status,401);
 assert.equal((await good('/questions.js')).status,303);
 assert.equal((await good('/api/login',{key})).status,403);
 // Manual recovery keeps the key, revokes sessions and does not unblock a blocked account.
 assert.equal((await admin('/api/admin/action',{id,action:'restore'})).status,200);
 let restored=(await pg.query('SELECT * FROM gcm_keys WHERE id=$1',[id])).rows[0];
 assert.equal(restored.key_hash,digest(key));assert.equal(restored.device_hash,null);assert.equal(restored.blocked,true);
 assert.equal((await good('/api/login',{key,deviceProof:proof})).status,403);
 await admin('/api/admin/action',{id,action:'unblock'});
 assert.equal((await good('/api/login',{key})).status,200);
 // Recovery without cookies/local storage: administrator releases binding, same key works once.
 await admin('/api/admin/action',{id,action:'restore'});
 assert.equal((await good('/api/me')).status,401);
 assert.equal((await bad('/api/login',{key})).status,200);
 assert.equal((await good('/api/login',{key,deviceProof:proof})).status,403);
 const replacement=await (await admin('/api/admin/action',{id,action:'replace'})).json();
 assert.equal((await good('/api/me')).status,401);
 assert.equal((await good('/api/login',{key})).status,403);
 assert.equal((await good('/api/login',{key,deviceProof:proof})).status,403);
 assert.equal((await bad('/api/login',{key:replacement.key})).status,200);
 const listing=await (await admin('/api/admin/keys')).json();assert.equal(listing.keys.length,1);assert.equal(listing.keys[0].bound,true);assert.equal(listing.keys[0].key_hash,undefined);
 config.ADMIN_PASSWORD_HASH=await passwordHash('changed-test-password');assert.equal((await admin('/api/me')).status,401);
});
