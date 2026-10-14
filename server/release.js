const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
let version;
module.exports=function release(){
 if(!version)version=(async()=>{
  const hash=createHash('sha256');
  for(const name of ['index.html','app.js','protection.js','updates.js','account.js','questions.js','material.js','human-rights.js','computing.js','portuguese.js','style.css','install.js','sw.js']){
   hash.update(name);hash.update(await fs.readFile(path.join(__dirname,'..','private',name)));
  }
  return hash.digest('hex');
 })().catch(error=>{version=undefined;throw error;});
 return version;
};
