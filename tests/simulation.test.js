const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function app(){
 const els={};const get=id=>els[id]||(els[id]={innerHTML:'',querySelectorAll:()=>[]});
 const context=vm.createContext({document:{getElementById:get,querySelectorAll:()=>[]},setInterval:()=>1,clearInterval:()=>{}});
 for(const f of ['questions','material','human-rights','computing','portuguese','app'])vm.runInContext(fs.readFileSync(`private/${f}.js`,'utf8'),context);
 return {els,run:code=>vm.runInContext(code,context)};
}
test('simulado corrige cada resposta e mantém 40 registros e nota 100 ao finalizar',()=>{
 const a=app();a.run("start('sim')");assert.equal(a.run('session.questions.length'),40);
 for(let i=0;i<40;i++){
  a.run('session.answers[session.questions[session.index].id]={choice:session.questions[session.index].correct,submitted:false};renderQuestion()');
  assert.doesNotMatch(a.els.main.innerHTML,/Você acertou\./);
  const confirm=a.els.confirm.onclick;confirm();confirm(); // stale/double submit cannot score twice
  assert.match(a.els.main.innerHTML,/Você acertou\./);
  assert.match(a.els.main.innerHTML,/class="option[^>]+disabled/);
  assert.equal(a.run('history.length'),i+1);
  if(i===1){a.els.previous.onclick();assert.equal(a.run('session.index'),0);assert.match(a.els.main.innerHTML,/Você acertou\./);a.els.confirm.onclick();assert.equal(a.run('history.length'),2);}
  a.els.confirm.onclick();
 }
 a.els.complete.onclick();assert.equal(a.run('history.length'),40);assert.equal(a.run('history.filter(x=>x.ok).length'),40);assert.match(a.els.main.innerHTML,/100<small>\/ 100/);
});
test('erro mostra gabarito e comentário imediatamente; marcação não confirmada não pontua',()=>{
 const a=app();a.run("start('sim');let q=session.questions[0];session.answers[q.id]={choice:(q.correct+1)%q.options.length,submitted:false};renderQuestion()");
 a.els.confirm.onclick();assert.match(a.els.main.innerHTML,/Vamos entender esta questão/);assert.match(a.els.main.innerHTML,/Resposta correta/);assert.equal(a.run('wrong.size'),1);
 a.els.confirm.onclick();a.run('let next=session.questions[1];session.answers[next.id]={choice:next.correct,submitted:false};renderQuestion()');
 a.els.finish.onclick();assert.match(a.els.main.innerHTML,/39 questões sem confirmação<\/b>/);
 a.els.complete.onclick();assert.equal(a.run('history.length'),40);assert.equal(a.run('history.filter(x=>x.ok).length'),0);assert.match(a.els.main.innerHTML,/0<small>\/ 100/);
});
