var { machineId, machineIdSync } = require("node-machine-id");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const address = require("address");
const fetch = require("node-fetch");
const fs = require("fs");
const forge = require("node-forge");
var CryptoJS = require("crypto-js");

let invalidResponse = {
  resultCode: -1,
  data: null,
  message: "Invalid Request To License Server.",
};

const forgeKeyCreationOptions = {
  bits: 2048,
  e: 0x10001,
};

let baseDir = process.cwd();
let serverKey = "server.pem";
let clientKey = "client.pem";

const License = (() => {
  let productCode;
  let baseUrl;
  let secretId;
  let platform;
  let fingerprint;
  let IPAddress = address.ip();
  let dateTime = new Date();
  let timeZone = moment.tz.guess();

  /**
   *
   * @param {String} url
   * @param {String} id
   *
   */
  const init = async (url, proCode, clientSecret) => {
    baseUrl = url;
    productCode = proCode;
    await machineId().then((id) => {
      fingerprint = id;
    });

    // let id = machineIdSync()
    // console.log({id})

    secretId = clientSecret || uuidv4();
    platform = process?.platform || "";

    if (!fs.existsSync(`${baseDir}/veri5now/private.pem`)) {
      generateClientKeys();
    }

    // Immediate Connect to License Server to get Product Keys
    await connect();

    return {
      baseUrl,
      productCode,
      secretId,
      dateTime,
      timeZone,
    };
  };

  const getMyConfig = async (callback) => {
    let _data = {
      baseUrl,
      productCode,
      fingerprint,
      secretId,
      IPAddress,
      dateTime,
      timeZone,
    };

    if ("function" == typeof callback) {
      callback(_data);
    } else {
      return _data;
    }
  };

  const connect = async () => {
    console.log("Connecting...");
    try {
      if (!fs.existsSync(`${baseDir}/veri5now/${serverKey}`)) {
        await getProductCertificateKeyFromServer(baseUrl, productCode);
      } else {
        console.log(
          "Product Cert Present, to resync call 'Veri5Now.resyncServerCert()'"
        );
      }
    } catch (error) {
      console.error("CONNECT ERROR : ", error);
    }
  };

  const resyncServerCert = async () => {
    try {
      getProductCertificateKeyFromServer(baseUrl, productCode);
    } catch (error) {
      console.error("Resync Serv. Cert. ERROR : ", error);
    }
  };

  const getLicenseByLicenseId = async (licenceId, callback) => {
    if (!licenceId) {
      throw new Error("No License ID Found.");
    }

    try {
      await fetch(`${baseUrl}/license/api/retrieve/${licenceId}`, {
        method: "GET",
      })
        .then((res) => {
          const isJson = res.headers
            .get("content-type")
            ?.includes("application/json");

          if (isJson) {
            return res.json();
          } else {
            invalidResponse.data =
              `${res?.status} - ${res?.statusText}` || null;
            return invalidResponse;
          }
        })
        .then((responseJson) => {
          let _data = responseJson;

          if ("function" == typeof callback) {
            callback(_data);
          } else {
            return _data;
          }
        });
    } catch (error) {
      console.error("LICENSE BY ID ERROR : ", error);
    }
  };

  /**
   *
   * @param {Function} callback
   * @returns {String}
   *
   */
  const getLicenseAccessKey = async (callback) => {
    try {
      let fullPublicKey = fs.readFileSync(
        `${baseDir}/veri5now/${serverKey}`,
        "utf8"
      );

      if (!fullPublicKey.includes("PUBLIC KEY")) {
        fullPublicKey = await getFormatedKey(fullPublicKey, "public");
      }

      let encrSecret = await rsaEncryption(fullPublicKey, secretId);

      if (encrSecret?.message) {
        console.error("rsaEncryption Fail : " + encrSecret?.message);
      }

      let fullClientKey = fs.readFileSync(
        `${baseDir}/veri5now/public.pem`,
        "utf8"
      );

      let clientKey = await getStringKey(fullClientKey);

      let response_data = `${encrSecret?.data || "NA"}..${clientKey}`;

      if ("function" == typeof callback) {
        callback(response_data);
      } else {
        return response_data;
      }
    } catch (error) {
      console.log("LICENSE Access KEY ERROR :", error);
    }
  };

  /**
   *
   * @param {String} accessKey
   * @param {Function} callback
   * @returns
   *
   */
  const getLicenseByAccessKey = async (accessKey, licenseId, callback) => {
    try {
      if (accessKey) {
        let fullPublicKey = fs.readFileSync(
          `${baseDir}/veri5now/${serverKey}`,
          "utf8"
        );

        let encrClientDevice = await aEsEncryption(
          secretId,
          await getMyConfig()
        );
        let encrSecret = await rsaEncryption(fullPublicKey, secretId);

        // console.log({ encrClientDevice });

        fetch(
          `${baseUrl}/license/api/getLicenseFile/${productCode}/${licenseId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-Certificate": encrClientDevice.data,
            },
            body: JSON.stringify({
              key: accessKey,
              userSecretKey: encrSecret.data,
            }),
          }
        )
          .then((res) => {
            const isJson = res.headers
              .get("content-type")
              ?.includes("application/json");

            const isFile = res.headers
              .get("content-type")
              ?.includes("application/octet-stream");

            if (isJson) {
              return res.json();
            } else if (isFile) {
              // return res.blob();
              return res.json();
            } else {
              invalidResponse.data =
                `${res?.status} - ${res?.statusText}` || null;
              return invalidResponse;
            }
          })
          .then((responseJson) => {
            if ("undefined" != typeof fs) {
              let path = `${process.cwd()}/license`;
              if (!fs.existsSync(path)) {
                fs.mkdirSync(path, { recursive: true });
              }

              fs.writeFileSync(path + "/license", JSON.stringify(responseJson));
            } else {
              if ("function" == typeof callback) {
                callback(responseJson);
              } else {
                return responseJson;
              }
            }
          });
      }
    } catch (error) {
      console.log("LICENSE BY ACCESS KEY ERROR :", error);
    }
  };

  /**
   *
   * @param {Function} callback
   * @returns {Object}
   *
   */
  const extractLicense = async (callback) => {
    try {
      let path = `${process.cwd()}/license`;
      let licFileData = fs.readFileSync(`${path}/license`, "utf-8");
      let licFileData_json =
        "string" == typeof licFileData ? JSON.parse(licFileData) : licFileData;

      let clientPrtKey = fs.readFileSync(
        `${baseDir}/veri5now/private.pem`,
        "utf-8"
      );

      // console.log({sign:licFileData_json.sign})
      // console.log({clientPrtKey})
      let decryptedSecret = await rsaDecryption(
        clientPrtKey,
        licFileData_json.sign
      );

      let decryptPackageData = await aEsDecryption(
        decryptedSecret.data,
        licFileData_json.enc
      );

      if ("function" == typeof callback) {
        callback(decryptPackageData.data);
      } else {
        return decryptPackageData.data;
      }
    } catch (error) {
      console.log("License Extract ERROR : ", error);
    }
  };

  /**
   * 
   * @param {String} licenseId 
   * @param {Function} callback 
   */
  const validateLicense = async (licenseId, callback) => {
    try {
      let fullPublicKey = fs.readFileSync(
        `${baseDir}/veri5now/${serverKey}`,
        "utf8"
      );

      let encrClientDevice = await aEsEncryption(secretId, await getMyConfig());

      let encrSecret = await rsaEncryption(fullPublicKey, secretId);

      let json_body_string = JSON.stringify({
        productCode: productCode,
        clientId: "",
        licenseId: licenseId,
        userSecretKey: encrSecret.data,
      });

      var _headers = {
        "Content-Type": "application/json",
        "X-User-Certificate": encrClientDevice.data,
      };

      await fetch(
        `${baseUrl}/license/api/validateClientLicense/${productCode}`,
        {
          method: "POST",
          headers: _headers,
          body: json_body_string,
        }
      )
        .then((res) => {
          const isJson = res.headers
            .get("content-type")
            ?.includes("application/json");

          const isFile = res.headers
            .get("content-type")
            ?.includes("application/octet-stream");

          if (isJson) {
            return res.json();
          } else if (isFile) {
            // return res.blob();
            return res.json();
          } else {
            invalidResponse.data =
              `${res?.status} - ${res?.statusText}` || null;
            return invalidResponse;
          }
        })
        .then((responseJson) => {
          if ("function" == typeof callback) {
            callback(responseJson);
          } else {
            return responseJson;
          }
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (error) {
      console.log("License Extract ERROR : ", error);
    }
  };
  return {
    init,
    getMyConfig,
    // connect,
    getLicenseByLicenseId,
    resyncServerCert,
    getLicenseAccessKey,
    getLicenseByAccessKey,
    extractLicense,
    validateLicense,
  };
})();

async function getProductCertificateKeyFromServer(baseUrl, productCode) {
  try {
    fetch(`${baseUrl}/license/api/getCertificateKey/${productCode}`, {
      method: "GET",
      // headers: {
      //   "Content-Type": "application/json",
      //   "X-User-Certificate":encrClientDevice
      // },
      // body: json_body_string,
    })
      .then((res) => {
        const isJson = res.headers
          .get("content-type")
          ?.includes("application/json");

        if (isJson) {
          return res.json();
        } else {
          invalidResponse.data = `${res?.status} - ${res?.statusText}` || null;
          return invalidResponse;
        }
      })
      .then((responseJson) => {
        let _data = responseJson;

        if (_data.resultCode > 0) {
          const fullPath = baseDir + "/veri5now";

          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
          }

          fs.writeFileSync(fullPath + "/" + serverKey, _data.data);

          console.log(
            `Server Certificate Recived for Product : ${productCode}`
          );
          return true;
        }
      });
  } catch (error) {
    console.error("CONNECT ERROR : ", error);
  }
}

// License Specific Key generation and Encr Decr
/**
 *
 * @param {String} key
 * @returns {String}
 */
async function getStringKey(key) {
  try {
    if (!key) {
      return "Key is empty";
    }

    let stringKey = key
      .replace("-----BEGIN RSA PRIVATE KEY-----", "")
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----BEGIN LICENSE KEY-----", "");

    stringKey = stringKey
      .replace("-----END RSA PRIVATE KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace("-----END LICENSE KEY-----", "");

    stringKey = stringKey.replace(/\r\n/g, "");

    return stringKey;
  } catch (error) {
    console.log("Key to String Error", error);
  }
}

// License Specific Key generation and Encr Decr
/**
 *
 * @param {String} key
 * @param {String} type 'public' | 'private' | 'license'
 * @returns {String}
 */
async function getFormatedKey(key, type) {
  try {
    if (!key || !type) {
      return "Key or Type is empty";
    }

    console.log({ len: key.length });
    let i = 0;
    let tempFormatedData = "";

    do {
      tempFormatedData += key.substring(i, i + 64) + "\r\n";

      i = i + 64;

      console.log({ i });
    } while (i <= key.length);

    if (type.toLowerCase() === "private") {
      tempFormatedData = `-----BEGIN RSA PRIVATE KEY-----\r\n${tempFormatedData}-----END RSA PRIVATE KEY-----\r\n`;
    } else if (type.toLowerCase() === "public") {
      tempFormatedData = `-----BEGIN PUBLIC KEY-----\r\n${tempFormatedData}-----END PUBLIC KEY-----\r\n`;
    } else if (type.toLowerCase() === "license") {
      tempFormatedData = `-----BEGIN LICENSE KEY-----\r\n${tempFormatedData}-----END LICENSE KEY-----\r\n`;
    }

    return tempFormatedData;
  } catch (error) {
    console.log("Key to String Error", error);
  }
}

async function generateClientKeys() {
  try {
    const keys = forge.pki.rsa.generateKeyPair(forgeKeyCreationOptions);
    const privateKey = forge.pki.privateKeyToPem(keys.privateKey);
    const publicKey = forge.pki.publicKeyToPem(keys.publicKey);

    const filePath = baseDir + "/veri5now";
    console.log("New Licence Creation :", { filePath });

    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    if (privateKey) {
      fs.writeFileSync(filePath + "/private.pem", privateKey);
      fs.writeFileSync(filePath + "/public.pem", publicKey);
    }

    return true;
  } catch (error) {
    console.error("Catch generateClientKeys : ", error);
    return null;
  }
}

/**
 *
 * @param {String} secretKey
 * @param {String} data
 * @returns {Object} {data:""} | {message:"Error"}
 */
async function aEsEncryption(secretKey, data) {
  return new Promise(async (resolve, reject) => {
    try {
      var input_data =
        "object" == typeof data
          ? JSON.stringify(data)
          : "string" != typeof data
          ? data.toString()
          : data;

      if (!secretKey)
        return alert("Invalid / Empty secret key found to encrypt data");

      // console.log("aEsEncryption",{SEC:secretKey})
      var encrypted = await CryptoJS.AES.encrypt(input_data, secretKey);

      resolve({ data: encrypted.toString() });
    } catch (error) {
      console.log(error);
      reject(error);
      // throw new Error(error);
    }
  });
}

/**
 *
 * @param {String} publicKey
 * @param {String} dataToEncrypt
 * @returns {Object} {data:""} | {message:"Error"}
 *
 */
async function rsaEncryption(publicKey, dataToEncrypt) {
  return new Promise(async (resolve, reject) => {
    try {
      var input_data =
        "object" == typeof dataToEncrypt
          ? JSON.stringify(dataToEncrypt)
          : "string" != typeof dataToEncrypt
          ? dataToEncrypt.toString()
          : dataToEncrypt;

      // console.log("aEsEncryption",{publicKey})
      if (publicKey) {
        // Convert the keys from PEM format to Forge format
        const forgePublicKey = forge.pki.publicKeyFromPem(publicKey);

        // Encrypt data with the public key
        const key_encrypted = forgePublicKey.encrypt(input_data);

        // console.log(`Encrypted data: ${encrypted}`);
        const key_b64 = key_encrypted.toString("base64");

        resolve({ data: key_b64 });
      } else {
        resolve({ message: "No Self Certificate Key Available To Decrypt" });
      }
    } catch (error) {
      console.log(error);
      reject(error);
      // throw new Error(error);
    }
  });
}

/**
 *
 * @param {String} SecretKey
 * @param {String} encryptedData
 * @returns {Object} {data:""} | {message:"Error"} | "Error"
 *
 */
async function aEsDecryption(SecretKey, encryptedData) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!SecretKey)
        return alert("Invalid / Empty secret key found to encrypt data");

      /** Data Decryption */

      var bytes = CryptoJS.AES.decrypt(encryptedData, SecretKey);
      var originalData = bytes.toString(CryptoJS.enc.Utf8);

      // console.log({originalData})
      if ("string" == typeof originalData) {
        resolve({ data: JSON.parse(originalData) });
      } else {
        resolve({ data: originalData });
      }
    } catch (error) {
      console.log(error);
      reject(error);
      // throw new Error(error);
    }
  });
}

/**
 *
 * @param {String} privateKey
 * @param {String} dataToDecrypt
 * @returns {Object} {data:""} | {message:"Error"}
 *
 */
async function rsaDecryption(privateKey, dataToDecrypt) {
  return new Promise(async (resolve, reject) => {
    try {
      if (privateKey) {
        // Convert the keys from PEM format to Forge format
        const forgePrivateKey = forge.pki.privateKeyFromPem(privateKey);

        // Decrypt data with the private key
        const decryptedData = forgePrivateKey.decrypt(dataToDecrypt);

        resolve({ data: decryptedData });
      } else {
        resolve({ message: "No Self Certificate Key Available To Decrypt" });
      }
    } catch (error) {
      console.log(error);
      reject(error);
      // throw new Error(error);
    }
  });
}
/***
 *
 *
 * END Of Encryption and Decryption
 *
 *
 */

if ("undefined" != typeof module) {
  var Veri5Now = License;
  module.exports = Veri5Now;
} else if ("undefined" != typeof exports) {
  exports.Veri5Now = License;
} else {
  var Veri5Now = License;
}
