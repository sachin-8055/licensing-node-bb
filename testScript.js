// import {Veri5Now} from './index';

const Veri5Now  = require(".");
const { v4: uuidv4 } = require("uuid");
// const vl = Veri5Now();

(async ()=>{
    const secretId = uuidv4();
    const productCode = "CRIB4U";
    
console.log("Callling...")
let v  = await Veri5Now.init("http://127.0.0.1:3010",productCode,secretId);
// console.log(v)
// setTimeout(() => {
// await Veri5Now.getLicenseAccessKey(async (d)=>{
//     await Veri5Now.getLicenseByAccessKey(d,'64638ee9d37ba3bef9d196b9',(d)=>console.log(d));
// });
// await Veri5Now.extractLicense((d)=>console.log(d));
// await Veri5Now.validateLicense('64638ee9d37ba3bef9d196b9',(d)=>console.log(d));
// }, 1500);
})();

