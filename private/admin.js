let keys=[];
const $=id=>document.getElementById(id);
async function api(url,body){const r=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const data=await r.json();if(r.status===401){location.replace('/login');throw new Error('Sessão encerrada.');}if(!r.ok)throw new Error(data.error);return data;}
function showKey(key){$('new-key').textContent=key;$('secret').hidden=false;$('copy').textContent='Copiar chave';$('secret').scrollIntoView({behavior:'smooth',block:'center'});}
function element(tag,text,className){const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;}
function render(){
 $('total').textContent=keys.length;$('active').textContent=keys.filter(k=>!k.blocked).length;$('bound').textContent=keys.filter(k=>k.bound).length;
 $('keys').replaceChildren();
 for(const k of keys.filter(k=>k.name.toLocaleLowerCase().includes($('search').value.toLocaleLowerCase()))){
  const card=element('section','','card key-card'),info=element('div',''),actions=element('div','','actions');
  info.append(element('h2',k.name),element('span',k.blocked?'Bloqueada':k.bound?'Vinculada':'Aguardando primeiro acesso','badge'+(k.blocked?' blocked':'')),element('p','Final da chave: '+k.key_hint,'muted'),element('p',k.last_login?'Última entrada: '+new Date(k.last_login).toLocaleString('pt-BR'):'Nenhum acesso registrado','muted'));
  if(k.device_label) info.append(element('p',k.device_label,'muted'));
  for(const action of [k.blocked?'unblock':'block','restore','replace']){
   const label=action==='block'?'Bloquear':action==='unblock'?'Liberar':action==='restore'?'Restaurar acesso (mesma chave)':'Substituir chave';const b=element('button',label,action==='block'?'danger':'secondary');
   b.onclick=()=>confirmAction(k,action,label);actions.append(b);
  }card.append(info,actions);$('keys').append(card);
 }
 if(!$('keys').children.length)$('keys').textContent=keys.length?'Nenhuma pessoa encontrada.':'Você ainda não criou nenhuma chave.';
}
async function load(){try{keys=(await api('/api/admin/keys')).keys;render();}catch(e){$('message').textContent=e.message;}}
function confirmAction(k,action,label){
 $('confirm-title').textContent=label+' — '+k.name;
 $('confirm-text').textContent=action==='restore'?'A mesma chave será mantida. As sessões atuais serão encerradas e o próximo acesso vinculará um único navegador. Confirme a identidade da pessoa e oriente-a a entrar no aparelho desejado. Se o acesso estiver bloqueado, ele continuará bloqueado.':action==='replace'?'A chave anterior deixará de funcionar e as sessões serão encerradas. Envie a nova chave para cadastrar o novo navegador.':action==='block'?'O acesso será bloqueado e as sessões serão encerradas.':'A chave voltará a funcionar no navegador já cadastrado.';
 $('confirm').showModal();$('confirm-yes').onclick=async()=>{const b=$('confirm-yes');b.disabled=true;try{const data=await api('/api/admin/action',{id:k.id,action});$('confirm').close();await load();if(data.key)showKey(data.key);$('message').textContent='Acesso atualizado.';}catch(e){$('confirm').close();$('message').textContent=e.message;}finally{b.disabled=false;}};
}
$('confirm-no').onclick=()=>$('confirm').close();$('search').oninput=render;
$('create').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const data=await api('/api/admin/keys',{name:new FormData(e.target).get('name')});e.target.reset();await load();showKey(data.key);}catch(err){$('message').textContent=err.message;}finally{b.disabled=false;}};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('new-key').textContent);$('copy').textContent='Copiada';}catch{$('message').textContent='Selecione e copie a chave exibida.';}};
$('dismiss').onclick=()=>{$('secret').hidden=true;$('new-key').textContent='';};
$('logout').onclick=async()=>{try{await api('/api/logout',{});location.replace('/login');}catch(e){$('message').textContent=e.message;}};
load();
