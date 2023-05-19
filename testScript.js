// import {Veri5Now} from './index';

const Veri5Now  = require(".");

// const vl = Veri5Now();

(async ()=>{
    
console.log("Callling...")
await Veri5Now.init("HTTP:??","CRIB");

// setTimeout(() => {
    Veri5Now.getMyConfig((d)=>console.log(d));
// }, 1500);
})();

