const multer = require("multer");
const crypto = require("crypto");
var { machineId, machineIdSync } = require("node-machine-id");
const moment = require("moment-timezone");
const address = require("address");
const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const forge = require("node-forge");
var CryptoJS = require("crypto-js");
const { generateRSAKeys, rsaEncryption, rsaDecryption } = require("../Functions/RSA.functions");
const { generateAESKeys, aesEncryption, aesDecryption } = require("../Functions/AES.functions");

router.get("/getConfig", async (req, res, next) => {
  try {
    let _configData = null;
    if (fs.existsSync("init")) {
      _configData = fs.readFileSync("init", "utf8");
      _configData = JSON.parse(_configData);
    }

    res.status(200).json({ res: _configData });
  } catch (error) {
    next(error);
  }
});

router.get("/init", async (req, res, next) => {
  try {
    const { baseUrl, licenseKey, productCode } = req.query;
    let _configData = null;

    let secretId;
    let platform;
    let deviceId;
    let IPAddress = address.ip();
    let dateTime = new Date();
    let timeZone = moment.tz.guess();

    await machineId().then((id) => {
      deviceId = id;
    });
    platform = process?.platform || "";

    if (!fs.existsSync("init")) {
      secretId = await generateAESKeys();

      _configData = {
        baseUrl,
        productCode,
        deviceId,
        secretId: secretId?.aesKey || "",
        IPAddress,
        dateTime,
        timeZone,
        licenseKey,
      };

      fs.writeFileSync("init", JSON.stringify(_configData));
    } else {
      _configData = fs.readFileSync("init", "utf8");
      _configData = JSON.parse(_configData);
    }

    let keyGen = null;

    /** Check key exist and generate new keys */
    if (!fs.existsSync("public.pem") || !fs.existsSync("private.pem")) {
      keyGen = await generateRSAKeys();
    }
    console.log({ keyGen });
    if (keyGen) {
      /** new Key is generated need to exchange with server */
      // Creating public and private key file
      fs.writeFileSync("public.pem", keyGen.publicKey);
      fs.writeFileSync("private.pem", keyGen.privateKey);

      await doExchange(deviceId, licenseKey, keyGen.publicKey);
    } else if (!fs.existsSync("server.pem")) {
      const _pubKey = await fs.readFileSync("public.pem", "utf8");

      await doExchange(deviceId, licenseKey, _pubKey);
    }

    res.status(200).json({ res: _configData });
  } catch (error) {
    next(error);
  }
});

async function doExchange(deviceId, licenseKey, publicKey) {
  try {
    let devConfig = fs.readFileSync("init", "utf8");

    devConfig = JSON.parse(devConfig);

    console.log("devConfig : ", { devConfig });

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

router.get("/generateLicense", async (req, res, next) => {
  try {
    let _configData = null;
    if (fs.existsSync("init")) {
      _configData = fs.readFileSync("init", "utf8");
      _configData = JSON.parse(_configData);
    }

    if (_configData) {
      const _clientEncryptedData = await aesEncryption(_configData?.secretId, _configData);
      const _clientKeyData = await rsaEncryption("server.pem", _configData?.secretId);

      const licenseServerAPI = `${_configData.baseUrl}/sdk/api/generateLicense`;
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
            serverRes = _data;
          });
      } catch (error) {
        console.error("LICENSE BY ID ERROR : ", error);
      }

      res.status(200).json({ res: serverRes });
    } else {
      res.status(500).json({ res: "No client config found" });
    }
  } catch (error) {
    next(error);
  }
});



router.get("/getLicenseData", async (req, res, next) => {
  try {
    let _configData = null;
    if (fs.existsSync("init")) {
      _configData = fs.readFileSync("init", "utf8");
      _configData = JSON.parse(_configData);
    }

    if (_configData) {
      const response = await extractLicense();


      res.status(200).json({ res: response });
    } else {
      res.status(500).json({ res: "No client config found" });
    }
  } catch (error) {
    next(error);
  }
});

async function extractLicense() {
  try {
    
    /** Read License File */
    let _encryptedLicense = await fs.readFileSync("license.pem",'utf8');

    /** Format JSON and decode sign */
    _encryptedLicense = JSON.parse(_encryptedLicense);

    const decodedSign = await rsaDecryption("private.pem",_encryptedLicense?.sign);

    /** after success of sign decode uste decoded sign and do 'enc' decryption using AES */
    let decodedLicense = await aesDecryption(decodedSign,_encryptedLicense?.enc);

    console.log({decodedLicense});

    return typeof decodedLicense == 'string'?JSON.parse(decodedLicense):decodedLicense;
  } catch (error) {
    console.log(error);
    return false;
  }
}
module.exports = router;
