(async()=>{
 const bar=document.createElement('div');bar.style.cssText='display:flex;gap:14px;align-items:center;justify-content:flex-end;padding:10px 20px;background:#17213c;color:white;font:14px system-ui;position:relative;z-index:1000';
 const name=document.createElement('span');bar.append(name);
 const exit=document.createElement('button');exit.textContent='Sair';exit.style.cssText='background:#d4fa79;color:#17213c;border:0;border-radius:6px;padding:7px 12px;cursor:pointer';
 exit.onclick=async()=>{try{const r=await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok)location.replace('/login');else exit.textContent='Tentar sair novamente';}catch{exit.textContent='Tentar sair novamente';}};
 async function check(){try{const r=await fetch('/api/me');if(r.status===401 || r.status===403){location.replace('/login');return;}if(!r.ok){document.documentElement.style.visibility='hidden';location.replace('/login');return;}const user=await r.json();name.textContent=user.name;if(user.role==='admin'&&!bar.querySelector('a')){const a=document.createElement('a');a.href='/admin';a.textContent='Gerenciar acessos';a.style.color='#d4fa79';bar.append(a);}if(!bar.contains(exit))bar.append(exit);}catch{document.documentElement.style.visibility='hidden';location.replace('/login');}}
 document.body.prepend(bar);await check();setInterval(check,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
})();
