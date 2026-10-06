const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {makeHandler}=require('../server/handler');
test('instalação disponível sem abrir conteúdo protegido',async t=>{
 const server=http.createServer(makeHandler(async()=>{throw Error('DB não deve ser consultado para instalar');},{}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const res=await fetch(base+'/manifest.webmanifest');assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/manifest\+json/);
 const manifest=await res.json();assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');
 for(const icon of manifest.icons){const r=await fetch(base+icon.src);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');const b=Buffer.from(await r.arrayBuffer());assert.equal(b.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}
 const sw=await fetch(base+'/sw.js');assert.equal(sw.status,200);assert.equal(sw.headers.get('service-worker-allowed'),'/');assert.match(await sw.text(),/fetch\(event.request\)/);
 assert.equal((await fetch(base+'/install.js')).status,200);
 const html=await(await fetch(base+'/login')).text();assert.match(html,/manifest.webmanifest/);assert.match(html,/install.js/);
 assert.notEqual((await fetch(base+'/questions.js')).status,200);
});
