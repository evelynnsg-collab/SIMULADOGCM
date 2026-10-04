const {Pool}=require('pg');
const fs=require('node:fs');
const path=require('node:path');
let pool,ready;
async function database(){
 if(!pool){
  const connectionString=process.env.DATABASE_URL || process.env.STORAGE_URL || process.env.POSTGRES_URL;
  if(!connectionString) throw new Error('DATABASE_NOT_CONFIGURED');
  pool=new Pool({connectionString,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
  pool.on('error',()=>{});
 }
 if(!ready) ready=(async()=>{
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(726184921)');
   await client.query(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 })().catch(e=>{ready=null;throw e});
 await ready;
 return pool;
}
module.exports={database};
