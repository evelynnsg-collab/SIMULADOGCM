const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('private/updates.js','utf8');
function fixture({ready=false,saved=null,fail=false}={}){
 const timers=[],events={},storage=new Map(saved?[['gcm.update-progress.v1',JSON.stringify(saved)]]:[]);
 let reloads=0,restored,allowed=ready,version='b'.repeat(64);
 const context={Date,JSON,AbortController,navigator:{onLine:true},document:{hidden:false,querySelector:()=>({content:'a'.repeat(64)}),addEventListener:(n,f)=>events[n]=f},addEventListener:(n,f)=>events[n]=f,setInterval:(f,ms)=>timers.push({f,ms}),setTimeout:()=>1,clearTimeout:()=>{},sessionStorage:{getItem:k=>storage.get(k),removeItem:k=>storage.delete(k),setItem:(k,v)=>storage.set(k,v)},location:{reload:()=>reloads++},GCMUpdateBridge:{ready:()=>allowed,capture:()=>({history:[{id:251,subject:'por',ok:false}],wrong:[251]}),restore:s=>restored=s},fetch:async()=>{if(fail)throw Error('Offline');return {ok:true,json:async()=>({version})};}};
 vm.runInNewContext(source,context);
 return {context,timers,storage,events,get reloads(){return reloads;},get restored(){return restored;},ready:()=>allowed=true,same:()=>version='a'.repeat(64)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('nova versão aguarda o fim do treino e guarda o desempenho antes de atualizar',async()=>{
 const f=fixture();await tick();assert.equal(f.reloads,0);
 f.ready();f.timers.find(t=>t.ms===3000).f();assert.equal(f.reloads,1);
 const saved=JSON.parse(f.storage.get('gcm.update-progress.v1'));assert.deepEqual(saved.state.wrong,[251]);
 f.timers.find(t=>t.ms===3000).f();assert.equal(f.reloads,1);
 const next=fixture({saved});await tick();assert.deepEqual(next.restored,saved.state);assert.equal(next.storage.size,0);
});
test('falhas de rede e versão atual não recarregam nem apagam os resultados',async()=>{
 const offline=fixture({ready:true,fail:true});await tick();assert.equal(offline.reloads,0);assert.equal(offline.storage.size,0);
 const same=fixture();same.same();await tick();same.ready();same.timers.find(t=>t.ms===3000).f();assert.equal(same.reloads,0);
});
test('questões ficam dentro da matéria e complementares continuam fora do simulado',()=>{
 const elements={};const c=vm.createContext({document:{getElementById:id=>elements[id]||(elements[id]={innerHTML:'',value:'',querySelectorAll:()=>[]}),querySelectorAll:()=>[]}});
 for(const name of ['questions','material','human-rights','computing','portuguese','app'])vm.runInContext(fs.readFileSync(`private/${name}.js`,'utf8'),c);
 const html=fs.readFileSync('private/index.html','utf8');assert.doesNotMatch(html,/data-view="material"/);
 assert.doesNotMatch(elements.main.innerHTML,/Explorar material|open-material|catalog-item/);
 for(const subject of ['leg','por','mat','inf']){
  c.subject=subject;for(const scope of ['edital','extra']){c.scope=scope;const pool=vm.runInContext('practicePool(subject,scope)',c);assert.ok(pool.every(q=>q.subject===subject&&q.status!=='pending'));assert.ok(pool.every(q=>scope==='extra'?q.status==='extra':!q.status||q.status==='ready'));}
 }
 assert.equal(vm.runInContext("practicePool('por').length",c),88);
 assert.ok(vm.runInContext("practicePool('leg','extra').some(q=>q.materialGroup.includes('Direitos Humanos'))",c));
});
