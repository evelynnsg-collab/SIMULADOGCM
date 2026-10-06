// Network-only: no keys, private pages or questions are stored in Cache Storage.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate')return;
 event.respondWith(fetch(event.request).catch(()=>new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GCM em Foco · Sem conexão</title><body style="font:18px system-ui;background:#111e35;color:white;padding:40px;line-height:1.6"><h1>Você está sem conexão.</h1><p>Conecte-se à internet para validar seu acesso e continuar estudando.</p><a href="/" style="color:#d5f65b">Tentar novamente</a></body></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
