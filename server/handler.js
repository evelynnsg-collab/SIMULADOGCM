const fs=require('node:fs/promises');
const path=require('node:path');
const {digest,token,equal,passwordValid}=require('./security');
const validToken=v=>typeof v==='string' && /^[A-Za-z0-9_-]{43}$/.test(v);
const ROOT=path.join(__dirname,'..','private');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const allowed=new Set(['index.html','app.js','questions.js','material.js','human-rights.js','style.css','favicon.svg','account.js','admin.js','access.css']);
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
function makeHandler(getDb,config=process.env){
 const secure=config.NODE_ENV!=='test';
 const cookieName=secure?'__Host-gcm_session':'gcm_session';
 const deviceName=secure?'__Host-gcm_device':'gcm_device';
 function cookie(name,value,age){return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;}
 return async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Vercel-CDN-Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  const send=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
  try{
   const pathname=new URL(req.url,'https://local.invalid').pathname;
   if(!['GET','HEAD','POST'].includes(req.method)) return send(405,{error:'Método não permitido.'});
   const cookies=Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split('=')));
   let device=validToken(cookies[deviceName])?cookies[deviceName]:null;
   if(req.method==='POST'){
    // Cross-origin requests and plain HTML form posts cannot change access.
    if(!config.APP_ORIGIN || req.headers.origin!==config.APP_ORIGIN || !String(req.headers['content-type']||'').startsWith('application/json')) return send(403,{error:'Origem não autorizada.'});
   }
   let body={};
   if(req.method==='POST'){
    if(Number(req.headers['content-length']||0)>8192) fail(413,'Solicitação muito grande.');
    if(req.body!==undefined){body=typeof req.body==='string'?JSON.parse(req.body):req.body; if(JSON.stringify(body).length>8192)fail(413,'Solicitação muito grande.');}
    else {let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)fail(413,'Solicitação muito grande.');}body=JSON.parse(raw||'{}');}
    if(!body || Array.isArray(body) || typeof body!=='object')fail(400,'Solicitação inválida.');
   }
   const file=async name=>{res.statusCode=200;res.setHeader('Content-Type',MIME[path.extname(name)]||'text/plain');res.end(req.method==='HEAD'?undefined:await fs.readFile(path.join(ROOT,name)));};
   if(pathname==='/login' || pathname==='/login.js' || pathname==='/access.css'){
    if(req.method==='POST')return send(405,{error:'Método não permitido.'});
    return file(pathname==='/login'?'login.html':pathname.slice(1));
   }
   if(pathname==='/api/health')return send(200,{ok:true});
   if(!config.ADMIN_PASSWORD_HASH || !config.APP_ORIGIN || !config.ADMIN_USERNAME) return send(503,{error:'Acesso em configuração. Tente novamente mais tarde.'});
   const db=await getDb();
   async function limit(bucket,max){
    const r=await db.query(`INSERT INTO gcm_limits(bucket,hits,until_at) VALUES($1,1,NOW()+INTERVAL '10 minutes') ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN gcm_limits.until_at<NOW() THEN 1 ELSE gcm_limits.hits+1 END, until_at=CASE WHEN gcm_limits.until_at<NOW() THEN NOW()+INTERVAL '10 minutes' ELSE gcm_limits.until_at END RETURNING hits`,[bucket]);
    if(r.rows[0].hits>max){res.setHeader('Retry-After','600');fail(429,'Muitas tentativas. Aguarde 10 minutos.');}
   }
   const adminVersion=digest(config.ADMIN_PASSWORD_HASH);
   async function session(){
    if(!device || !validToken(cookies[cookieName]))return null;
    const r=await db.query(`SELECT s.*,k.name,k.blocked,k.device_hash AS bound_device FROM gcm_sessions s LEFT JOIN gcm_keys k ON k.id=s.key_id WHERE s.token_hash=$1 AND s.device_hash=$2 AND s.expires_at>NOW()`,[digest(cookies[cookieName]),digest(device)]);
    const s=r.rows[0];
    if(!s || (s.role==='student' && (s.blocked || s.bound_device!==s.device_hash)) || (s.role==='admin' && s.admin_version!==adminVersion))return null;
    return s;
   }
   async function issue(role,keyId){
    const sessionToken=token();
    await db.query(`INSERT INTO gcm_sessions(token_hash,role,key_id,device_hash,admin_version,expires_at) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '7 days')`,[digest(sessionToken),role,keyId,digest(device),role==='admin'?adminVersion:null]);
    res.setHeader('Set-Cookie',[cookie(cookieName,sessionToken,604800),cookie(deviceName,device,31536000)]);
   }
   if(pathname==='/api/login' && req.method==='POST'){
    const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
    await limit('ip:'+digest(ip),30);
    if(body.mode==='admin'){
     await limit('admin',20);
     const pw=typeof body.password==='string'?body.password:'';
     if(pw.length>256 || !equal(String(body.username||''),config.ADMIN_USERNAME) || !await passwordValid(pw,config.ADMIN_PASSWORD_HASH))fail(401,'Login ou senha incorretos.');
     device=device||token();
     await issue('admin',null);
     return send(200,{redirect:'/admin'});
    }
    const accessKey=typeof body.key==='string'?body.key.trim():'';
    if(!/^GCM-[A-Za-z0-9_-]{43}$/.test(accessKey)) fail(401,'Chave inválida ou bloqueada.');
    await limit('key:'+digest(accessKey),30);
    device=device||token();
    // Atomic UPDATE: two first-time devices cannot both claim this key.
    const r=await db.query(`UPDATE gcm_keys SET device_hash=$2, device_label=COALESCE(device_label,$3),last_login=NOW() WHERE key_hash=$1 AND blocked=FALSE AND (device_hash IS NULL OR device_hash=$2) RETURNING id`,[digest(accessKey),digest(device),String(req.headers['user-agent']||'Navegador').slice(0,220)]);
    if(!r.rows.length)fail(403,'Chave inválida, bloqueada ou vinculada a outro navegador. Fale com a administradora.');
    await issue('student',r.rows[0].id);
    return send(200,{redirect:'/'});
   }
   const who=await session();
   if(!who){
    if(pathname.startsWith('/api/'))return send(401,{error:'Entre para continuar.'});
    res.statusCode=303;res.setHeader('Location','/login');return res.end();
   }
   if(pathname==='/api/me' && req.method==='GET')return send(200,{role:who.role,name:who.role==='admin'?config.ADMIN_USERNAME:who.name});
   if(pathname==='/api/logout' && req.method==='POST'){
    await db.query('DELETE FROM gcm_sessions WHERE token_hash=$1',[who.token_hash]);
    res.setHeader('Set-Cookie',cookie(cookieName,'',0));return send(200,{ok:true});
   }
   if(pathname.startsWith('/api/admin/') || pathname==='/admin' || pathname==='/admin.js'){
    if(who.role!=='admin')return send(403,{error:'Somente a administradora pode acessar.'});
    if(pathname==='/api/admin/keys' && req.method==='GET'){
     const r=await db.query('SELECT id,name,key_hint,blocked,device_label,created_at,last_login,device_hash IS NOT NULL AS bound FROM gcm_keys ORDER BY created_at DESC LIMIT 1000');
     return send(200,{keys:r.rows});
    }
    if(pathname==='/api/admin/keys' && req.method==='POST'){
     const name=typeof body.name==='string'?body.name.trim():'';
     if(!name || name.length>100)fail(400,'Informe um nome com até 100 caracteres.');
     const key='GCM-'+token(),id=token();
     await db.query('INSERT INTO gcm_keys(id,name,key_hash,key_hint) VALUES($1,$2,$3,$4)',[id,name,digest(key),key.slice(-6)]);
     return send(201,{id,key});
    }
    if(pathname==='/api/admin/action' && req.method==='POST'){
     if(!validToken(body.id) || !['block','unblock','replace'].includes(body.action))fail(400,'Ação inválida.');
     const key=body.action==='replace'?'GCM-'+token():null;
     // One transaction also invalidates any outstanding sessions.
     const client=await db.connect();
     try{
      await client.query('BEGIN');
      let r;
      if(key)r=await client.query('UPDATE gcm_keys SET key_hash=$2,key_hint=$3,device_hash=NULL,device_label=NULL,blocked=FALSE WHERE id=$1 RETURNING id',[body.id,digest(key),key.slice(-6)]);
      else r=await client.query('UPDATE gcm_keys SET blocked=$2 WHERE id=$1 RETURNING id',[body.id,body.action==='block']);
      if(!r.rows.length)fail(404,'Acesso não encontrado.');
      await client.query('DELETE FROM gcm_sessions WHERE key_id=$1',[body.id]);
      await client.query('COMMIT');
     }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
     return send(200,{ok:true,...(key?{key}:{})});
    }
    if(pathname==='/admin' && req.method==='GET')return file('admin.html');
   }
   if(req.method==='POST')return send(404,{error:'Página não encontrada.'});
   const name=pathname==='/'?'index.html':pathname.slice(1);
   if(!allowed.has(name))return send(404,{error:'Página não encontrada.'});
   return file(name);
  }catch(e){return send(e.status||503,{error:e.status?e.message:'Não foi possível concluir. Tente novamente em instantes.'});}
 };
}
module.exports={makeHandler};
