const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('material de Português completo, com imagens e itens não validados fora da pontuação',()=>{
 const context=vm.createContext({});
 for(const name of ['questions','material','human-rights','computing','portuguese'])vm.runInContext(fs.readFileSync(`private/${name}.js`,'utf8'),context);
 const bank=vm.runInContext('BANK',context),material=vm.runInContext('PORTUGUESE_MATERIAL',context);
 assert.equal(material.length,60);assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
 assert.deepEqual(Array.from(material.filter(q=>q.status==='pending'),q=>q.id),[291,298]);
 assert.equal(material.filter(q=>q.status==='ready').length,58);
 for(const q of material){
  assert.ok(q.question&&q.explanation);assert.ok(q.correct>=0&&q.correct<q.options.length);
  for(const img of q.passageImages||[]){assert.match(img.src,/^\/portuguese\/[a-z0-9-]+\.webp$/);assert.ok(fs.existsSync('private'+img.src));assert.ok(img.alt);}
  assert.doesNotMatch(JSON.stringify(q),/Licenciado para|CPF|\d{3}\.\d{3}\.\d{3}-\d{2}|alternativaque/);
 }
 // Imported answers stay attached to their option text when the UI shuffles them.
 const dom={getElementById:()=>({innerHTML:'',querySelectorAll:()=>[]}),querySelectorAll:()=>[]};
 context.document=dom;
 vm.runInContext(fs.readFileSync('private/app.js','utf8'),context);
 for(const q of material.filter(q=>q.status==='ready')){
  context.item=q;const shuffled=vm.runInContext('shuffledQuestion(item)',context);
  assert.equal(shuffled.options[shuffled.correct],q.options[q.correct]);
 }
 context.item=material[0];assert.match(vm.runInContext('passage(item)',context),/\/portuguese\/machado.webp/);
});
