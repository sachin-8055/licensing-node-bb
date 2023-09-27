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

let infoTracerFile = "infoTrace.json";

const updateTrace = async (JsonData) => {
  if (fs) {
    // let filePath = `${baseDir}/veri5now`;

    // if (!fs.existsSync(filePath)) {
    //   fs.mkdirSync(filePath, { recursive: true });
    // }

    let oldTrace = await getTrace();

    if (oldTrace && oldTrace != null && JsonData) {
      let newTraceData = { ...oldTrace, ...JsonData };

      fs.writeFileSync(`${infoTracerFile}`, JSON.stringify(newTraceData, null, 2));
    } else if (!oldTrace && JsonData) {
      fs.writeFileSync(`${infoTracerFile}`, JSON.stringify(JsonData, null, 2));
    }
  }
};

const getTrace = async () => {
  if (fs) {
    // let filePath = `${baseDir}/veri5now`;
    if (fs.existsSync(`${infoTracerFile}`)) {
      let traceFileData = fs.readFileSync(`${infoTracerFile}`, "utf-8");

      if (traceFileData) {
        return JSON.parse(traceFileData);
      }
    }

    return null;
  }
};

const License = (() => {
  let licenseKey;
  let baseUrl;
  let secretId;
  let platform;
  let deviceId;
  let ip = address.ip();
  let dateTime = new Date();
  let timeZone = moment.tz.guess();

  function License(){
    console.log("BBLicense Configured...");
  }
  function isInvalid(value) {
    if (undefined == value || null == value || value.toString().trim() == "") {
      return true;
    } else {
      return false;
    }
  }

  const init = async (base_Url, license_Key, callback) => {
    let _res = { ...defaultResponse };

    console.log({base_Url, license_Key})
    try {
      if (!isInvalid(base_Url) && !isInvalid(license_Key)) {
        if (fs.existsSync("init")) {
          let fileData = fs.readFileSync("init", "utf-8");
          const parseData = JSON.parse(fileData);

          if (parseData.licenseKey != license_Key) {
            parseData.licenseKey = license_Key;
            parseData.dateTime = new Date();

            fs.writeFileSync("init", JSON.stringify(parseData));

            try {
              
              if (fs.existsSync("public.pem")) {
                console.log(">>>>>> Deleting  public >>>>>> ")
                fs.unlinkSync("public.pem");
              }
              if (fs.existsSync("private.pem")) {
                console.log(">>>>>> Deleting  private >>>>>> ")
                fs.unlinkSync("private.pem");
              }
              if (fs.existsSync("server.pem")) {
                console.log(">>>>>> Deleting  server >>>>>> ")
                fs.unlinkSync("server.pem");
              }

            } catch (error) {
              console.log(">>>>>>>>>>. File Delete Error >>>>>>")
              console.log(error)
            }
            
          }

          _res.code = 1;
          _res.data = parseData;
          _res.result = "Success";
        } else {
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
        }
      } else {
        _res.code = -1;
        _res.result = "'base_Url' OR 'license_Key' Not Found, please check parameters.";
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
          console.log(">>>>>> New Keys Are generated >>>>>> ")
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

      // console.log("devConfig : ", { devConfig });

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

    } catch (error) {
      console.log(error);
      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }
      if ("function" == typeof callback) {
        callback(_res);
      } else {
        return _res;
      }
  };

  async function getLicense(callback) {
    let _res = { ...defaultResponse };

    try {
      let devConfig = {};

      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        devConfig = JSON.parse(fileData);
      }

      // console.log("devConfig : ", { devConfig });

      const _clientEncryptedData = await aesEncryption(devConfig?.secretId, devConfig);
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
            licenseKey: devConfig?.licenseKey,
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

              updateTrace({ isExpired: false, isActive: true, dateTime: new Date() });
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
    
    if ("function" == typeof callback) {
      callback(_res);
    } else {
      return _res;
    }
  }

  async function extractLicense(filePath,callback) {
    let _res = { ...defaultResponse };

    try {
      if (!filePath || filePath.trim() == "") {
        _res.code = -1;
        _res.result = "'filePath' Not Found, please check parameters.";

        return _res;
      }

      let devConfig = {};

      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        devConfig = JSON.parse(fileData);
      }
      /** Check tracing first is it expired or not active (trace sync from server) */

      let oldTrace = await getTrace();

      if (oldTrace && oldTrace.isActive == false) {
        _res.code = -2;
        _res.result = "License is not active, plaease contact admin.";
        _res.data = null;

        return _res;
      } else if (oldTrace && oldTrace.isExpired == true) {
        _res.code = -2;
        _res.result = "License is Expired, plaease contact admin.";
        _res.data = null;

        return _res;
      }

      /**** */
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
    
    if ("function" == typeof callback) {
      callback(_res);
    } else {
      return _res;
    }
  }

  setInterval(async function () {
    try {
      let devConfig = {};

      if (fs.existsSync("init")) {
        let fileData = fs.readFileSync("init", "utf-8");
        devConfig = JSON.parse(fileData);
      }

      // console.log("devConfig : ", { devConfig });

      let deviceId = devConfig?.deviceId;
      let licenseKey = devConfig?.licenseKey;

      if (!deviceId || !licenseKey) {
        console.log("Invalid/Incomplete config to sync");
        return false;
      }

      const _syncApi = `${devConfig.baseUrl}/sdk/api/sync`;
      console.log({ _syncApi });

      await fetch(`${_syncApi}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
          if (_data?.resultCode > 0) {
            updateTrace({ isSync: true, lastSync: new Date(), isActive: true, isExpired: false });
          } else if (_data?.resultCode == -77) {
            updateTrace({ isExpired: true, lastSync: new Date() });
          } else if (_data?.resultCode == -88) {
            updateTrace({ isActive: false, lastSync: new Date() });
          } else {
            console.error("Sync ERROR : ", _data);
          }
        });
    } catch (error) {
      console.error("LICENSE Sync ERROR : ", error);
    }
  }, 20000);

  return {
    init,
    doExchange,
    getConfig,
    getLicense,
    extractLicense,
  };
})();

if ("undefined" != typeof module) {
  var BBLicense = License;
  module.exports = BBLicense;
} else if ("undefined" != typeof exports) {
  exports.BBLicense = License;
} else {
  var BBLicense = License;
}
