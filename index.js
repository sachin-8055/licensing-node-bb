var { machineId } = require("node-machine-id");
const moment = require("moment-timezone");
const address = require("address");
const fetch = require("node-fetch");
const fs = require("fs");

const { generateRSAKeys, rsaEncryption, rsaDecryption } = require("./RSA.lib");
const { generateAESKeys, aesEncryption, aesDecryption } = require("./AES.lib");
const { getLoggerData, logger } = require("./Logger");

const defaultResponse = { code: -100, data: {}, result: "", flag: true };

const timeoutInMilliseconds = 100000;

let licenseBaseFolder = "License";
let licenseFile = "License.pem";
let baseFolderPath = "bbLicenseUtils";
let infoTracerFile = "infoTrace.json";
let initFile = "init";
let publicFile = "public.pem";
let privateFile = "private.pem";
let serverFile = "server.pem";

const updateTrace = async (JsonData) => {
  if (fs) {
    // let filePath = `${baseDir}/veri5now`;

    // if (!fs.existsSync(filePath)) {
    //   fs.mkdirSync(filePath, { recursive: true });
    // }

    let oldTrace = await getTrace();

    if (oldTrace && oldTrace != null && JsonData) {
      let newTraceData = { ...oldTrace, ...JsonData };

      fs.writeFileSync(`${baseFolderPath}/${infoTracerFile}`, JSON.stringify(newTraceData, null, 2));
    } else if (!oldTrace && JsonData) {
      fs.writeFileSync(`${baseFolderPath}/${infoTracerFile}`, JSON.stringify(JsonData, null, 2));
    }
  }
};

const getTrace = async () => {
  if (fs) {
    // let filePath = `${baseDir}/veri5now`;
    if (fs.existsSync(`${baseFolderPath}/${infoTracerFile}`)) {
      let traceFileData = fs.readFileSync(`${baseFolderPath}/${infoTracerFile}`, "utf-8");

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
  let org_Id = "default";
  let ip = address.ip();
  let dateTime = new Date();
  let timeZone = moment.tz.guess();

  function License() {}
  function isInvalid(value) {
    if (undefined == value || null == value || value.toString().trim() == "") {
      return true;
    } else {
      return false;
    }
  }

  const getLogs = async () => {
    let _res = { ...defaultResponse };
    try {
      const log_res = await getLoggerData();

      _res.code = 1;
      _res.data = log_res;
      _res.result = "Success";
    } catch (error) {
      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
      console.log("SDK EXCEPTION :> ", error);
    }

    return _res;
  };

  /**
   *
   * @param {String} [license_Key=""]
   * @param {String} [org_Id=""]
   * @param {String} [assignType="default"]
   * @returns
   */
  const updateLicense = async (license_Key, org_Id, assignType) => {
    let _res = { ...defaultResponse };
    try {
      console.log(`updateLicense : KEY:${license_Key} : ORG:${org_Id}`);

      if (!license_Key || !org_Id) {
        _res.code = -1;
        _res.result = "license_Key & org_Id can't be null | blank.";

        return _res;
      }

      let orgInitFile = `${baseFolderPath}/${org_Id}/${initFile}`;

      if (fs.existsSync(orgInitFile)) {
        let fileData = fs.readFileSync(orgInitFile, "utf-8");
        const parseData = JSON.parse(fileData);

        parseData.assignType == license_Key.toString().trim() ? "default" : assignType;

        parseData.licenseKey = license_Key;
        parseData.orgId = org_Id.toString().trim();
        parseData.dateTime = new Date();

        _res.code = 1;
        _res.data = parseData;
        _res.result = "Success";

        const res_init = await init(parseData?.baseUrl, license_Key, parseData);
        console.log("updateLicense == ", { res_init });
      } else {
        _res.code = -1;
        _res.data = null;
        _res.result = "No exiting init file found please do initialise client using init()";
      }

      return _res;
    } catch (error) {
      console.log("SDK EXCEPTION :> ", error);
      logger(
        JSON.stringify({
          function: "updateLicense()",
          reason: "Exception",
          error: error?.message || error.toString(),
        }),
        "error"
      );

      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }
  };

  const removeInitFiles = async (org_Id, reason = "init()") => {
    console.log(`removeInitFiles : for:${reason} : ORG:${org_Id}`);

    if (!org_Id) {
      _res.code = -1;
      _res.result = "org_Id can't be null | blank.";

      return _res;
    }

    let orgPublicFile = `${baseFolderPath}/${org_Id}/${publicFile}`;
    let orgPrivateFile = `${baseFolderPath}/${org_Id}/${privateFile}`;
    let orgServerFile = `${baseFolderPath}/${org_Id}/${serverFile}`;

    try {
      if (fs.existsSync(orgPublicFile)) {
        logger(
          JSON.stringify({
            function: `${reason || "init()"}`,
            reason: `Deleting file :${orgPublicFile} : due to license key change.`,
          }),
          "info"
        );
        fs.unlinkSync(orgPublicFile);
      }
      if (fs.existsSync(orgPrivateFile)) {
        logger(
          JSON.stringify({
            function: `${reason || "init()"}`,
            reason: `Deleting file :${orgPrivateFile} : due to license key change.`,
          }),
          "info"
        );
        fs.unlinkSync(orgPrivateFile);
      }
      if (fs.existsSync(orgServerFile)) {
        logger(
          JSON.stringify({
            function: `${reason || "init()"}`,
            reason: `Deleting file :${orgServerFile} : due to license key change.`,
          }),
          "info"
        );
        fs.unlinkSync(orgServerFile);
      }
    } catch (error) {
      console.log("SDK EXCEPTION :> ", error);
      logger(
        JSON.stringify({
          function: `${reason || "init()"}`,
          reason: "Existing file deletion exception",
          error: error?.message || error.toString(),
        }),
        "error"
      );
    }

    return true;
  };
  /**
   *
   * @param {String} [base_Url=""] Licensing server base URL
   * @param {String} [license_Key=""]
   * @param {Object} [clientData=""]
   * @returns
   */
  const init = async (base_Url, license_Key, clientData) => {
    try {
      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }
      if (!fs.existsSync(licenseBaseFolder)) {
        fs.mkdirSync(licenseBaseFolder, { recursive: true });
      }
    } catch (error) {
      console.log("SDK EXCEPTION older Creation Exception:> ", error);
    }
    let _res = { ...defaultResponse };
    let isExchange = false;

    logger(JSON.stringify({ function: "init()", base_Url, license_Key }));

    try {
      if (!isInvalid(base_Url) && !isInvalid(license_Key)) {
        /** Check client data object for required fields */

        if (!clientData || typeof clientData !== "object") {
          _res.code = -1;
          _res.result =
            "Client data not found or invalid it should be an object {'email':'required*','phone':'required*','userName':'required*','orgId':'required*','orgName':'required*', 'serverNameAlias':'required*'}";

          return _res;
        }

        org_Id = clientData.orgId.toString().trim() || "";

        /** check If file already present or not If not then ask full details */
        if (!fs.existsSync(`${baseFolderPath}/${org_Id}/${initFile}`)) {
          if (
            !clientData.email ||
            !clientData.hasOwnProperty("email") ||
            !clientData.phone ||
            !clientData.hasOwnProperty("phone") ||
            !clientData.userName ||
            !clientData.hasOwnProperty("userName") ||
            !clientData.orgId ||
            !clientData.hasOwnProperty("orgId") ||
            !clientData.orgName ||
            !clientData.hasOwnProperty("orgName") ||
            !clientData.serverNameAlias ||
            !clientData.hasOwnProperty("serverNameAlias") ||
            !clientData.assignType ||
            !clientData.hasOwnProperty("assignType")
          ) {
            _res.code = -1;
            _res.result =
              "Client data not found or invalid it should be an object {'email':'required*','phone':'required*','userName':'required*','orgId':'required*','orgName':'required*', 'serverNameAlias':'required*','assignType':'default/renew'}";

            return _res;
          }
        }

        /** make ORG ID path */
        try {
          if (!fs.existsSync(`${baseFolderPath}/${org_Id}`)) {
            fs.mkdirSync(`${baseFolderPath}/${org_Id}`, { recursive: true });
          }
          if (!fs.existsSync(`${licenseBaseFolder}/${org_Id}`)) {
            fs.mkdirSync(`${licenseBaseFolder}/${org_Id}`, { recursive: true });
          }
        } catch (error) {
          console.log("SDK EXCEPTION older Creation Exception:> ", error);
        }
        /*** */

        if (fs.existsSync(`${baseFolderPath}/${org_Id}/${initFile}`)) {
          let fileData = fs.readFileSync(`${baseFolderPath}/${org_Id}/${initFile}`, "utf-8");
          const parseData = JSON.parse(fileData);

          if (parseData.licenseKey != license_Key) {
            parseData.licenseKey = license_Key;
            parseData.dateTime = new Date();

            fs.writeFileSync(`${baseFolderPath}/${org_Id}/${initFile}`, JSON.stringify(parseData));

            try {
              await removeInitFiles(org_Id, "init()");
            } catch (error) {
              console.log("EXCEPTION removeInitFiles :> ", error);
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
            ...clientData,
          };

          fs.writeFileSync(`${baseFolderPath}/${org_Id}/${initFile}`, JSON.stringify(_configData));

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
      if (
        !fs.existsSync(`${baseFolderPath}/${org_Id}/${publicFile}`) ||
        !fs.existsSync(`${baseFolderPath}/${org_Id}/${privateFile}`)
      ) {
        keyGen = await generateRSAKeys();
        if (keyGen) {
          /** new Key is generated need to exchange with server */
          // Creating public and private key file
          fs.writeFileSync(`${baseFolderPath}/${org_Id}/${publicFile}`, keyGen.publicKey);
          fs.writeFileSync(`${baseFolderPath}/${org_Id}/${privateFile}`, keyGen.privateKey);

          logger("New Client Keys Are generated");

          // isExchange = await doExchange();
          isExchange = true;
        }
      }

      let licenseFileAndData = fs.existsSync(`${baseFolderPath}/${org_Id}/${serverFile}`)
        ? fs.readFileSync(`${baseFolderPath}/${org_Id}/${serverFile}`, "utf-8")
        : null;

      if (!licenseFileAndData || !fs.existsSync(`${licenseBaseFolder}/${org_Id}/${licenseFile}`)) {
        /** If file not present */
        // isExchange = await doExchange();
        isExchange = true;
      }

      // else {
      //   /** If file present then check is it blank*/
      //   let fileData = fs.readFileSync(`${baseFolderPath}/${org_Id}/${serverFile}`, "utf-8");

      //   if (!fileData || fileData.trim() == "") {
      //     isExchange = await doExchange();
      //   }
      // }

      const _isExchange_res = isExchange ? await doExchange() : null;

      if (isExchange && _isExchange_res?.resultCode < 0) {
        _res.code = -1;
        _res.data = null;
        _res.result = isExchange?.message;
      }

      return _res;
    } catch (error) {
      console.log("SDK EXCEPTION :> ", error);
      logger(
        JSON.stringify({
          function: "init()",
          reason: "Existing file deletion exception",
          error: error?.message || error.toString(),
        }),
        "error"
      );

      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }
  };

  async function doExchange() {
    try {
      console.log("doExchange : ", { org_Id });
      let devConfig = {};

      if (fs.existsSync(`${baseFolderPath}/${org_Id}/${initFile}`)) {
        let fileData = fs.readFileSync(`${baseFolderPath}/${org_Id}/${initFile}`, "utf-8");
        devConfig = JSON.parse(fileData);
      }

      // let deviceId = devConfig?.deviceId;
      // let licenseKey = devConfig?.licenseKey;
      let _public_Key = await fs.readFileSync(`${baseFolderPath}/${org_Id}/${publicFile}`, "utf-8");

      if (!devConfig || !devConfig.hasOwnProperty("licenseKey") || !_public_Key) {
        logger(JSON.stringify({ function: "doExchange()", reason: "Invalid/Incomplete config to exchange" }), "error");
        return false;
      }

      const _doExchangeApi = `${devConfig.baseUrl}/sdk/api/doExchange`;

      logger(JSON.stringify({ function: "doExchange()", reason: "API Call", api: _doExchangeApi }));

      let serverResponse = null;

      try {
        delete devConfig.secretId;
        delete devConfig.baseUrl;

        const apiBody = {
          key: _public_Key.toString(),
          ...devConfig,
        };

        const stringBody = JSON.stringify(apiBody);

        await fetch(`${_doExchangeApi}`, {
          method: "POST",
          timeout: timeoutInMilliseconds,
          headers: {
            "Content-Type": "application/json",
          },
          body: stringBody,
        })
          .then((res) => {
            const isJson = res.headers.get("content-type")?.includes("application/json");

            if (isJson) {
              return res.json();
            } else {
              console.log(`${res?.status} - ${res?.statusText}` || "API Call: Error ");
              logger(
                JSON.stringify({
                  function: "doExchange()",
                  reason: "API Call Error",
                  server_res: `${res?.status} - ${res?.statusText}`,
                }),
                "error"
              );
            }
          })
          .then((responseJson) => {
            let _data = responseJson;

            if (_data?.resultCode == 1) {
              fs.writeFileSync(`${baseFolderPath}/${org_Id}/${serverFile}`, _data?.data || "");

              /** After successfull exchange getLicense and save */
              getLicense(org_Id);
            } else {
              logger(JSON.stringify({ function: "doExchange()", server_res: _data }), "error");

              serverResponse = _data;
            }
          });
      } catch (error) {
        console.log("SDK EXCEPTION :> ", error);
        logger(
          JSON.stringify({
            function: "doExchange()",
            reason: "Exception 1",
            error: error?.message || error.toString(),
          }),
          "error"
        );
      }

      if (serverResponse) {
        /** Incase of error sending back to user */
        return serverResponse;
      } else {
        return true;
      }
    } catch (error) {
      console.log("SDK EXCEPTION :> ", error);
      logger(
        JSON.stringify({ function: "doExchange()", reason: "Exception 2", error: error?.message || error.toString() }),
        "error"
      );

      return null;
    }
  }

  const getConfig = async (_orgId) => {
    let _res = { ...defaultResponse };

    let _org_Id = _orgId || org_Id;

    console.log("getConfig : ", { _org_Id });

    try {
      let _data = {};

      if (fs.existsSync(`${baseFolderPath}/${_org_Id}/${initFile}`)) {
        let fileData = fs.readFileSync(`${baseFolderPath}/${_org_Id}/${initFile}`, "utf-8");
        _data = JSON.parse(fileData);
      }
      _res.code = 1;
      _res.result = "Success";
      _res.data = _data;
    } catch (error) {
      console.log("SDK EXCEPTION :> ", error);
      logger(
        JSON.stringify({
          function: "getConfig()",
          reason: "Exception while read init file",
          error: error?.message || error.toString(),
        }),
        "error"
      );

      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }

    return _res;
  };

  async function getLicense(_orgId) {
    let _res = { ...defaultResponse };

    let _org_Id = _orgId || org_Id;

    console.log("getLicense : ", { _org_Id });

    try {
      let devConfig = {};

      if (fs.existsSync(`${baseFolderPath}/${_org_Id}/${initFile}`)) {
        let fileData = fs.readFileSync(`${baseFolderPath}/${_org_Id}/${initFile}`, "utf-8");
        devConfig = JSON.parse(fileData);
      }

      const _clientEncryptedData = await aesEncryption(devConfig?.secretId, devConfig);
      const _clientKeyData = await rsaEncryption(`${baseFolderPath}/${_org_Id}/${serverFile}`, devConfig?.secretId);

      const licenseServerAPI = `${devConfig.baseUrl}/sdk/api/generateLicense`;

      logger(JSON.stringify({ function: "getLicense()", reason: "API Call", api: licenseServerAPI }));

      try {
        await fetch(`${licenseServerAPI}`, {
          method: "POST",
          timeout: timeoutInMilliseconds,
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

              logger(
                JSON.stringify({
                  function: "getLicense()",
                  reason: "API Call Error",
                  server_res: `${res?.status} - ${res?.statusText}`,
                }),
                "error"
              );
            }
          })
          .then((responseJson) => {
            let _data = responseJson;

            if (_data?.resultCode == 1) {
              _res.code = 1;
              _res.result = "Success : " + _data?.downloadUrl;
              _res.data = _data.data;

              try {
                fs.writeFileSync(
                  `${licenseBaseFolder}/${_org_Id}/${licenseFile}`,
                  JSON.stringify(JSON.parse(_data.data), null, 2)
                );
              } catch (error) {
                console.log("SDK EXCEPTION :> ", error);
                logger(
                  JSON.stringify({
                    function: "getLicense() : Saving License File",
                    reason: "Exception 0",
                    error: error?.message || error.toString(),
                  }),
                  "error"
                );
              }

              updateTrace({ isExpired: false, isActive: true, dateTime: new Date() });
            } else {
              logger(
                JSON.stringify({ function: "getLicense()", reason: "API Call Error", server_res: _data }),
                "error"
              );

              _res.code = -11;
              _res.result = "Fail";
              _res.data = _data;
            }
          });
      } catch (error) {
        console.log("SDK EXCEPTION :> ", error);
        logger(
          JSON.stringify({
            function: "getLicense()",
            reason: "Exception 1",
            error: error?.message || error.toString(),
          }),
          "error"
        );

        _res.code = -99;
        _res.result = error?.message || "Exception occured: " + error.toString();
      }
    } catch (error) {
      console.log("SDK EXCEPTION :> ", error);
      logger(
        JSON.stringify({ function: "getLicense()", reason: "Exception 2", error: error?.message || error.toString() }),
        "error"
      );

      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }

    return _res;
  }
  /**
   *
   * @param {String} [_orgId=""]
   * @returns
   */
  async function extractLicense(_orgId) {
    let _res = { ...defaultResponse };

    let _org_Id = _orgId || org_Id;

    console.log("getConfig : ", { _org_Id });
    try {
      if (!_org_Id || _org_Id.toString().trim() == "") {
        _res.code = -1;
        _res.result = "orgId not found.";
        return _res;
      }

      const filePath = `${licenseBaseFolder}/${_org_Id}/${licenseFile}`;

      // let devConfig = {};

      // if (fs.existsSync(`${baseFolderPath}/${_org_Id}/${initFile}`)) {
      //   let fileData = fs.readFileSync(`${baseFolderPath}/${_org_Id}/${initFile}`, "utf-8");
      //   devConfig = JSON.parse(fileData);
      // }
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
      let _encryptedLicense = await fs.readFileSync(filePath, "utf-8");

      /** Format JSON and decode sign */
      _encryptedLicense = JSON.parse(_encryptedLicense);

      const decodedSign = await rsaDecryption(`${baseFolderPath}/${_org_Id}/${privateFile}`, _encryptedLicense?.sign);

      /** after success of sign decode uste decoded sign and do 'enc' decryption using AES */
      let decodedLicense = await aesDecryption(decodedSign, _encryptedLicense?.enc);

      const fullLicense = typeof decodedLicense == "string" ? JSON.parse(decodedLicense) : decodedLicense;

      _res.code = 1;
      _res.result = "Success";
      _res.data = fullLicense;
    } catch (error) {
      console.log("SDK EXCEPTION :> ", error);
      logger(
        JSON.stringify({
          function: "extractLicense()",
          reason: "Exception",
          error: error?.message || error.toString(),
        }),
        "error"
      );

      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }

    return _res;
  }

  /**
   *
   * @param {String} [_orgId=""]
   * @param {String} [featureName=""]
   * @returns
   */
  async function getFeature(_orgId, featureName) {
    let _res = { ...defaultResponse };

    let _org_Id = _orgId || org_Id;

    console.log("getFeature : ", { _org_Id });

    try {
      if (!featureName || featureName?.trim() == "") {
        _res.code = 1;
        _res.result = "Feature name parameter should not be blank or send 'ALL'";
        _res.data = null;
      } else {
        let licenseData = await extractLicense(_org_Id);

        let _lic_package = licenseData?.data?.include?.package;

        if (licenseData?.data?.include?.package && _lic_package?.features) {
          if (featureName?.toLowerCase() == "all") {
            _res.code = 1;
            _res.result = "All features list";
            _res.data = _lic_package?.features;
          } else {
            const item =
              _lic_package?.features.length > 0
                ? _lic_package?.features?.find((data) => data.name.toLowerCase() === featureName.toLowerCase())
                : null;

            if (item) {
              _res.code = 1;
              _res.result = item ? "Success" : "No Feature Found.";
              _res.data = item ? (isNaN(Number(item.data)) ? "" : Number(item.data)) : null;
            }
          }
        } else {
          _res.code = 1;
          _res.result = "No Feature Available.";
          _res.data = null;
        }
      }
    } catch (error) {
      console.log("SDK EXCEPTION :> ", error);
      logger(
        JSON.stringify({
          function: "getConfig()",
          reason: "Exception while read init file",
          error: error?.message || error.toString(),
        }),
        "error"
      );

      _res.code = -99;
      _res.result = error?.message || "Exception occured : " + error.toString();
    }

    return _res;
  }

  /*
  setInterval(async function () {
    try {
      let devConfig = {};

      if (fs.existsSync(`${baseFolderPath}/${org_Id}/${initFile}`)) {
        let fileData = fs.readFileSync(`${baseFolderPath}/${org_Id}/${initFile}`, "utf-8");
        devConfig = JSON.parse(fileData);
      }

      let deviceId = devConfig?.deviceId;
      let licenseKey = devConfig?.licenseKey;

      if (!deviceId || !licenseKey) {
        logger(
          JSON.stringify({
            function: "sync()",
            reason: "Invalid/Incomplete config to sync : Not calling to api",
          }),
          "syncError"
        );
        return false;
      }

      const _syncApi = `${devConfig.baseUrl}/sdk/api/sync`;

      logger(
        JSON.stringify({
          function: "sync()",
          reason: "API Call",
          a: _syncApi,
        }),
        "sync"
      );

      await fetch(`${_syncApi}`, {
        method: "POST",
        timeout: timeoutInMilliseconds,
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

            logger(
              JSON.stringify({
                function: "sync()",
                reason: "API Call Error",
                server_res: `${res?.status} - ${res?.statusText}`,
              }),
              "syncError"
            );
          }
        })
        .then((responseJson) => {
          let _data = responseJson;

          if (_data?.resultCode > 0) {
            updateTrace({ isSync: true, lastSync: new Date(), isActive: true, isExpired: false });
          } else if (_data?.resultCode == -77) {
            updateTrace({ isExpired: true, lastSync: new Date() });
          } else if (_data?.resultCode == -88) {
            updateTrace({ isActive: false, lastSync: new Date() });
          } else {
            logger(
              JSON.stringify({
                function: "sync()",
                reason: "Error Response",
                server_res: _data,
              }),
              "syncError"
            );
          }
        });
    } catch (error) {
      logger(
        JSON.stringify({
          function: "sync()",
          reason: "Exception",
          error: error?.message || error.toString(),
        }),
        "syncError"
      );
    }
  }, 20000);


  */

  return {
    getLogs,
    init,
    updateLicense,
    doExchange,
    getConfig,
    getLicense,
    extractLicense,
    getFeature,
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
