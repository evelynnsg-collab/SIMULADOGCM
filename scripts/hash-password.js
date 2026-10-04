// Read from stdin; never pass a password as a command-line argument.
const {passwordHash}=require('../server/security');
let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',s=>input+=s);
process.stdin.on('end',async()=>{const password=input.replace(/\r?\n$/,'');if(password.length<10)throw new Error('Use ao menos 10 caracteres.');process.stdout.write(await passwordHash(password)+'\n');});
