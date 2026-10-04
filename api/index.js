const {database}=require('../server/db');
const {makeHandler}=require('../server/handler');
module.exports=makeHandler(database);
