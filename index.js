var {machineId} = require('node-machine-id');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');

const License = (() => {
  let productCode;
  let baseUrl;
  let secretId;
  let platform;
  let fingerprint;
  let IPAddress;
  let dateTime = new Date();
  let timeZone = moment.tz.guess();

  /**
   *
   * @param {String} url
   * @param {String} id
   */
  const init = async (url, proCode) => {
    baseUrl = url;
    productCode = proCode;
    await machineId().then((id) => {
      fingerprint =id;
    })
    secretId = uuidv4();
    platform = process?.platform || "";
    return true;
  };

  const getMyConfig = (callback) => {
    let _data = {
        baseUrl,
        productCode,
        fingerprint,
        secretId,
        IPAddress,
        dateTime,
        timeZone
    }
    
    if('function' == typeof callback){
callback(_data);
    } else {
      return _data;
    }

    
  };

  return {
    init,
    getMyConfig
  }

})();

 
if("undefined" != typeof module){
  var Veri5Now = License;
  module.exports = Veri5Now;
  
}else if ("undefined" != typeof exports) {
  exports.Veri5Now = License;
} else {
  var Veri5Now = License;
}