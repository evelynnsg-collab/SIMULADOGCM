const error=document.getElementById('error');
for(const mode of ['student','admin']){
 document.getElementById(mode+'-tab').onclick=()=>{
  for(const m of ['student','admin']){document.getElementById(m+'-form').hidden=m!==mode;document.getElementById(m+'-tab').setAttribute('aria-selected',String(m===mode));}
  error.textContent='';
 };
 document.getElementById(mode+'-form').onsubmit=async event=>{
  event.preventDefault();error.textContent='';const form=event.target;const button=form.querySelector('button');button.disabled=true;
  try{
   let deviceProof;try{deviceProof=localStorage.getItem('gcm.device-proof.v1');}catch{}
   const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,...Object.fromEntries(new FormData(form)),...(mode==='student'?{deviceProof}:{})})});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(data.deviceProof)try{localStorage.setItem('gcm.device-proof.v1',data.deviceProof);}catch{}
   location.replace(data.redirect);
  }catch(e){error.textContent=e.message||'Não foi possível entrar.';}finally{button.disabled=false;}
 };
}
