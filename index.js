var { machineId, machineIdSync } = require("node-machine-id");
// const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const address = require("address");
const fetch = require("node-fetch");
const fs = require("fs");
// const forge = require("node-forge");
// var CryptoJS = require("crypto-js");
// const crypto = require("crypto");
// const https = require("https");

const { generateRSAKeys, rsaEncryption, rsaDecryption } = require("./RSA.lib");
const { generateAESKeys, aesEncryption, aesDecryption } = require("./AES.lib");

const defaultResponse = { code: -100, data: {}, result: "", flag: true };

const License = (() => {
  let licenseKey;
  let baseUrl;
  let secretId;
  let platform;
  let deviceId;
  let ip = address.ip();
  let dateTime = new Date();
  let timeZone = moment.tz.guess();

  function isInvalid(value) {
    if (undefined == value || null == value || value.toString().trim() == "") {
      return true;
    } else {
      return false;
    }
  }

  const init = async (base_Url, license_Key, callback) => {
    let _res = { ...defaultResponse };

    try {
      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        _res.code = 1;
        _res.data = JSON.parse(fileData);
        _res.result = "Success";
      } else {
        if (!isInvalid(base_Url) && !isInvalid(license_Key)) {
          await machineId().then((id) => {
            deviceId = id;
          });
          platform = process?.platform || "";
          licenseKey = license_Key;
          baseUrl = base_Url;

          secretId = await generateAESKeys();

          const _configData = {
            baseUrl,
            licenseKey,
            deviceId,
            secretId: secretId?.aesKey || "",
            platform,
            ip,
            dateTime,
            timeZone,
          };

          fs.writeFileSync("init", JSON.stringify(_configData));

          _res.code = 1;
          _res.data = _configData;
          _res.result = "Success";
        } else {
          _res.code = -1;
          _res.result = "'base_Url' OR 'license_Key' Not Found, please check parameters.";
        }
      }

      let keyGen = null;

      /** Check key exist and generate new keys */
      if (!fs.existsSync("public.pem") || !fs.existsSync("private.pem")) {
        keyGen = await generateRSAKeys();
        if (keyGen) {
          /** new Key is generated need to exchange with server */
          // Creating public and private key file
          fs.writeFileSync("public.pem", keyGen.publicKey);
          fs.writeFileSync("private.pem", keyGen.privateKey);

          await doExchange();
        }
      }
      if (!fs.existsSync("server.pem")) {
        await doExchange();
      }
      if ("function" == typeof callback) {
        callback(_res);
      } else {
        return _res;
      }
    } catch (error) {
      console.log(error);
      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }
  };

  async function doExchange() {
    try {
      let devConfig = {};

      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        devConfig = JSON.parse(fileData);
      }

      console.log("devConfig : ", { devConfig });

      let deviceId = devConfig?.deviceId;
      let licenseKey = devConfig?.licenseKey;
      let publicKey = await fs.readFileSync("public.pem", "utf8");

      if (!deviceId || !licenseKey || !publicKey) {
        console.log("Invalid/Incomplete config to exchange");
        return false;
      }

      const _doExchangeApi = `${devConfig.baseUrl}/sdk/api/doExchange`;
      console.log({ _doExchangeApi });

      try {
        await fetch(`${_doExchangeApi}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: publicKey,
            licenseKey: licenseKey,
            deviceId: deviceId,
          }),
        })
          .then((res) => {
            const isJson = res.headers.get("content-type")?.includes("application/json");

            if (isJson) {
              return res.json();
            } else {
              console.log(`${res?.status} - ${res?.statusText}` || "API Call: Error ");
            }
          })
          .then((responseJson) => {
            let _data = responseJson;
            // console.log(_data);
            if (_data?.resultCode == 1) {
              fs.writeFileSync("server.pem", _data?.data || "");
            } else {
              console.error("Exchange ERROR : ", _data);
            }
          });
      } catch (error) {
        console.error("LICENSE BY ID ERROR : ", error);
      }

      return true;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  const getConfig = async (callback) => {
    let _res = { ...defaultResponse };

    try {
      let _data = {};

      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        _data = JSON.parse(fileData);
        console.log("FROM FILE :: ", _data);
      }
      _res.code = 1;
      _res.result = "Success";
      _res.data = _data;

      if ("function" == typeof callback) {
        callback(_res);
      } else {
        return _res;
      }
    } catch (error) {
      console.log(error);
      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }
  };

  async function generateLicense() {
    let _res = { ...defaultResponse };

    try {
      let devConfig = {};

      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        devConfig = JSON.parse(fileData);
      }


      console.log("devConfig : ", { devConfig });

      const _clientEncryptedData = await aesEncryption(devConfig?.secretId, _configData);
      const _clientKeyData = await rsaEncryption("server.pem", devConfig?.secretId);

      const licenseServerAPI = `${devConfig.baseUrl}/sdk/api/generateLicense`;
      console.log({ licenseServerAPI });

      let serverRes = "";
      try {
        await fetch(`${licenseServerAPI}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: _clientKeyData,
            licenseKey: _configData?.licenseKey,
            client: _clientEncryptedData,
          }),
        })
          .then((res) => {
            const isJson = res.headers.get("content-type")?.includes("application/json");

            if (isJson) {
              return res.json();
            } else {
              console.log(`${res?.status} - ${res?.statusText}` || "API Call: Error ");
            }
          })
          .then((responseJson) => {
            let _data = responseJson;
            console.log(_data);

            if (_data?.resultCode == 1) {
              _res.code = 1;
              _res.result = "Success";
              _res.data = _data.data;
            } else {
              console.error("Gen License ERROR : ", _data);

              _res.code = -11;
              _res.result = "Fail";
              _res.data = _data;
            }
          });
      } catch (error) {
        console.error("LICENSE BY ID ERROR : ", error);
      }
    } catch (error) {
      console.log(error);
      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }
    return _res;
  }

  async function extractLicense(filePath) {
    let _res = { ...defaultResponse };

    try {

      
      if(!filePath || filePath.trim() == ""){

        _res.code = -1;
        _res.result = "'filePath' Not Found, please check parameters.";

        return _res;
      }

      let devConfig = {};

      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        devConfig = JSON.parse(fileData);
      }

      /** Read License File */
      let _encryptedLicense = await fs.readFileSync(filePath, "utf8");

      /** Format JSON and decode sign */
      _encryptedLicense = JSON.parse(_encryptedLicense);

      const decodedSign = await rsaDecryption("private.pem", _encryptedLicense?.sign);

      /** after success of sign decode uste decoded sign and do 'enc' decryption using AES */
      let decodedLicense = await aesDecryption(decodedSign, _encryptedLicense?.enc);

      console.log({ decodedLicense });

      const fullLicense = typeof decodedLicense == "string" ? JSON.parse(decodedLicense) : decodedLicense;

      _res.code = 1;
      _res.result = "Success";
      _res.data = fullLicense;
    } catch (error) {
      console.log(error);

      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }
    return _res;
  }

  return {
    init,
    doExchange,
    getConfig,
    generateLicense,
    extractLicense
  };
})();

// async function aesEncryption(secretKey, plainText) {
//   try {
//     let aesKey = Buffer.from(secretKey, "base64");

//     const cipher = crypto.createCipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
//     let encmsg = cipher.update(plainText, "utf8", "base64");
//     encmsg += cipher.final("base64");

//     return encmsg;
//   } catch (error) {
//     console.log(error);
//     return "";
//   }
// }

// async function aesDecryption(secretKey, encryptedText) {
//   try {
//     let aesKey = Buffer.from(secretKey, "base64");
//     const decipher = crypto.createDecipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
//     let decryptedData = decipher.update(encryptedText, "base64", "utf8");
//     decryptedData += decipher.final("utf8");
//     return decryptedData;
//   } catch (error) {
//     console.log(error);
//     return "";
//   }
// }

// async function rsaEncryption(plainText) {
//   try {
//     let PUBKEY = fs.readFileSync("public.pem", "utf8");

//     // Encrypting msg with publicEncrypt method
//     let encmsg = crypto.publicEncrypt(PUBKEY, Buffer.from(plainText, "utf8")).toString("base64");

//     return encmsg;
//   } catch (error) {
//     console.log(error);
//     return "";
//   }
// }

// async function rsaDecryption(encryptedText) {
//   try {
//     let PRIVKEY = fs.readFileSync("private.pem", "utf8");

//     // Decrypting msg with privateDecrypt method
//     let plaintext = crypto.privateDecrypt(
//       {
//         key: PRIVKEY,
//         passphrase: "",
//       },
//       Buffer.from(encryptedText, "base64")
//     );

//     return plaintext.toString("utf8");
//   } catch (error) {
//     console.log(error);
//     return "";
//   }
// }

if ("undefined" != typeof module) {
  var BBLicense = License;
  module.exports = BBLicense;
} else if ("undefined" != typeof exports) {
  exports.BBLicense = License;
} else {
  var BBLicense = License;
}

License.init("http://dhdhd.com", "PROPROPRO");
setTimeout(() => {
  License.getConfig();
}, 2000);

setTimeout(() => {
  License.doExchange();
}, 3000);
