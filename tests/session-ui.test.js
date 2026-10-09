const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

test('falhas de conexão preservam a tela; acesso revogado volta ao login',async()=>{
 const elements=[],redirects=[],saved=new Map();let tick,reply;
 function element(){const e={style:{},children:[],textContent:'',append(c){this.children.push(c)},contains(c){return this.children.includes(c)},querySelector(){return null}};elements.push(e);return e;}
 const context={document:{createElement:element,body:{prepend(){}},addEventListener(){}},
  fetch:async()=>{if(reply instanceof Error)throw reply;return reply;},
  localStorage:{setItem:(k,v)=>saved.set(k,v)},location:{replace:p=>redirects.push(p)},setInterval:fn=>{tick=fn;}};
 reply={status:200,ok:true,json:async()=>({role:'student',name:'Aluno',deviceProof:'backup-test'})};
 await vm.runInNewContext(fs.readFileSync('private/account.js','utf8'),context);
 assert.equal(saved.get('gcm.device-proof.v1'),'backup-test');
 reply=new Error('offline');await tick();assert.equal(redirects.length,0);
 assert.match(elements[1].textContent,/Sem conexão/);
 reply={status:503,ok:false};await tick();assert.equal(redirects.length,0);
 reply={status:200,ok:true,json:async()=>({role:'student',name:'Aluno'})};await tick();
 assert.equal(elements[1].textContent,'Aluno');
 reply={status:401,ok:false};await tick();assert.deepEqual(redirects,['/login']);
});

test('login envia o backup do navegador e salva o novo sem guardar a chave',async()=>{
 const nodes={},saved=new Map([['gcm.device-proof.v1','old-backup']]);let sent,redirect;
 for(const id of ['error','student-tab','admin-tab','student-form','admin-form'])nodes[id]={setAttribute(){},querySelector(){return {disabled:false}}};
 const context={document:{getElementById:id=>nodes[id]},
  localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
  FormData:class{*[Symbol.iterator](){yield ['key','test-access-key'];}},
  fetch:async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({redirect:'/',deviceProof:'new-backup'})};},
  location:{replace:p=>{redirect=p;}}};
 vm.runInNewContext(fs.readFileSync('private/login.js','utf8'),context);
 await nodes['student-form'].onsubmit({preventDefault(){},target:nodes['student-form']});
 assert.equal(sent.deviceProof,'old-backup');assert.equal(sent.key,'test-access-key');
 assert.equal(saved.get('gcm.device-proof.v1'),'new-backup');assert.equal(saved.size,1);assert.equal(redirect,'/');
});
