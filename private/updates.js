(()=>{
 const current=document.querySelector('meta[name="gcm-release"]')?.content;
 if(!/^[a-f0-9]{64}$/.test(current||''))return;
 const storageKey='gcm.update-progress.v1';
 try{
  const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');
  sessionStorage.removeItem(storageKey);
  if(saved&&Date.now()-saved.at>=0&&Date.now()-saved.at<120000)globalThis.GCMUpdateBridge?.restore(saved.state);
 }catch{}
 let checking=false,pending=false,reloading=false;
 function apply(){
  if(!pending||reloading||document.hidden||!navigator.onLine||!globalThis.GCMUpdateBridge?.ready())return;
  // If storage is unavailable, wait for the next ordinary opening instead of losing results.
  try{sessionStorage.setItem(storageKey,JSON.stringify({at:Date.now(),state:globalThis.GCMUpdateBridge.capture()}));}catch{return;}
  reloading=true;location.reload();
 }
 async function check(){
  if(checking||reloading||document.hidden||!navigator.onLine)return;
  checking=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch('/api/version',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
   if(!response.ok)return;
   const data=await response.json();
   if(/^[a-f0-9]{64}$/.test(data.version||'')){pending=data.version!==current;apply();}
  }catch{}finally{clearTimeout(timeout);checking=false;}
 }
 setInterval(check,60000);setInterval(apply,3000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
 globalThis.addEventListener('online',check);check();
})();
