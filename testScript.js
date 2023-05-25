// import {Veri5Now} from './index';

const Veri5Now  = require(".");

// const vl = Veri5Now();

(async ()=>{
    
console.log("Callling...")
let v  = await Veri5Now.init("http://127.0.0.1:3010","CRIB4U",'52cabbbb-ec2f-4740-b2a4-eed73614ace6');
// console.log(v)
// setTimeout(() => {
// await Veri5Now.getLicenseAccessKey(async (d)=>{
//     await Veri5Now.getLicenseByAccessKey(d,'64638ee9d37ba3bef9d196b9',(d)=>console.log(d));
// });
// await Veri5Now.extractLicense((d)=>console.log(d));
// await Veri5Now.validateLicense('64638ee9d37ba3bef9d196b9',(d)=>console.log(d));
// }, 1500);
})();

