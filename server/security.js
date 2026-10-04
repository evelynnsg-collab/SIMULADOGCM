const crypto = require('node:crypto');
const {promisify} = require('node:util');
const scrypt = promisify(crypto.scrypt);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
const equal = (a,b) => crypto.timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
async function passwordHash(password) {
 const salt=crypto.randomBytes(16).toString('hex');
 const key=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 return `scrypt:${salt}:${key.toString('hex')}`;
}
async function passwordValid(password,encoded) {
 const parts=String(encoded).split(':');
 if(parts.length!==3 || parts[0]!=='scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
 const key=await scrypt(password,parts[1],64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 return crypto.timingSafeEqual(key,Buffer.from(parts[2],'hex'));
}
module.exports={digest,token,equal,passwordHash,passwordValid};
