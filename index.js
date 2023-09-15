var { machineId, machineIdSync } = require("node-machine-id");
// const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const address = require("address");
const fetch = require("node-fetch");
const fs = require("fs");
// const forge = require("node-forge");
// var CryptoJS = require("crypto-js");
const crypto = require("crypto");
const https = require("https");

const defaultResponse = { code: -100, data: {}, result: "", flag: true };

const License = (() => {
  let productCode;
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

  const init = async (base_Url, product_Code, callback) => {
    let _res = { ...defaultResponse };

    try {
      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        _res.code = 1;
        _res.data = JSON.parse(fileData);
        _res.result = "Success";
      } else {
        if (!isInvalid(base_Url) && !isInvalid(product_Code)) {
          await machineId().then((id) => {
            deviceId = id;
          });
          platform = process?.platform || "";
          productCode = product_Code;
          baseUrl = base_Url;

          secretId = secretId ? secretId : (crypto.randomBytes(32)).toString("base64");

          /** Check key exist and generate new keys */
          const keyGen = generateClientKeys();
          if (keyGen) {
            /** new Key is generated need to exchange with server */
          }

          const _configData = {
            baseUrl,
            productCode,
            deviceId,
            secretId,
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
          _res.result = "'baseUrl' OR 'productCode' Not Found, please check parameters.";
        }
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

  const generateClientKeys = () => {
    try {
      if (!fs.existsSync("public.pem") || !fs.existsSync("private.pem")) {
        const keyPair = crypto.generateKeyPairSync("rsa", {
          modulusLength: 2048,
          publicKeyEncoding: {
            type: "spki",
            format: "pem",
          },
          privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
            cipher: "aes-256-cbc",
            passphrase: "",
          },
        });

        // Creating public and private key file
        fs.writeFileSync("public.pem", keyPair.publicKey);
        fs.writeFileSync("private.pem", keyPair.privateKey);

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  const getConfig = async (callback) => {
    let _res = { ...defaultResponse };

    try {
      let _data = {};

      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        _data = JSON.parse(fileData);
        console.log("FROM FILE :: ", _data);
      }
      // else {
      //   _data = {
      //     baseUrl,
      //     productCode,
      //     deviceId,
      //     secretId,
      //     ip,
      //     dateTime,
      //     timeZone,
      //   };
      // }

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

  const doExchange = async () => {
    try {
      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        const _data = JSON.parse(fileData);
        console.log("FROM FILE :: ", _data);

        const secretKey = _data.secretId;

        const clientDataEncrRes = await aesEncryption(secretKey, JSON.stringify(_data));

        const secretKeyEncrRes = await rsaEncryption(secretKey);

        console.log({ clientDataEncrRes, secretKeyEncrRes });

        return false;
      } else {
        return false;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  return {
    init,
    doExchange,
    getConfig,
  };

})();

async function aesEncryption(secretKey, plainText) {
  try {
    let aesKey = Buffer.from(secretKey, "base64");

    const cipher = crypto.createCipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
    let encmsg = cipher.update(plainText, "utf8", "base64");
    encmsg += cipher.final("base64");

    return encmsg;
  } catch (error) {
    console.log(error);
    return "";
  }
}

async function aesDecryption(secretKey, encryptedText) {
  try {
    let aesKey = Buffer.from(secretKey, "base64");
    const decipher = crypto.createDecipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
    let decryptedData = decipher.update(encryptedText, "base64", "utf8");
    decryptedData += decipher.final("utf8");
    return decryptedData;
  } catch (error) {
    console.log(error);
    return "";
  }
}

async function rsaEncryption(plainText) {
  try {
    let PUBKEY = fs.readFileSync("public.pem", "utf8");

    // Encrypting msg with publicEncrypt method
    let encmsg = crypto.publicEncrypt(PUBKEY, Buffer.from(plainText, "utf8")).toString("base64");

    return encmsg;
  } catch (error) {
    console.log(error);
    return "";
  }
}

async function rsaDecryption(encryptedText) {
  try {
    let PRIVKEY = fs.readFileSync("private.pem", "utf8");

    // Decrypting msg with privateDecrypt method
    let plaintext = crypto.privateDecrypt(
      {
        key: PRIVKEY,
        passphrase: "",
      },
      Buffer.from(encryptedText, "base64")
    );

    return plaintext.toString("utf8");
  } catch (error) {
    console.log(error);
    return "";
  }
}

if ("undefined" != typeof module) {
  var BBLicense = License;
  module.exports = BBLicense;
} else if ("undefined" != typeof exports) {
  exports.BBLicense = License;
} else {
  var BBLicense = License;
}


License.init("http://dhdhd.com","PROPROPRO");
setTimeout(() => {
  
License.getConfig();
}, 2000);

setTimeout(() => {
  
License.doExchange();
}, 3000);
