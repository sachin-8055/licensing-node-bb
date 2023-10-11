// const crypto = require("crypto");
const fs = require("fs");

let loggerFile = "bbLicenseUtils/logger.json";

async function logger(data = "", type = "default") {
  try {
    if (type != "default" && type != "success" && type != "error" && type != "info" && type != "sync" && type != "syncError") {
      return;
    }
    if (fs && data && data != "") {
      if (fs.existsSync(`${loggerFile}`)) {
        let loggerFileData = fs.readFileSync(`${loggerFile}`, "utf-8");
        let _updatedData = {};
        if (loggerFileData) {
          _updatedData = JSON.parse(loggerFileData);
        }

        let _logData = {
          dateTime: new Date(),
          data: data.toString(),
        };

        if (type == "sync") {
          _updatedData[type] = _logData;
        } else {
          _updatedData[type].push(_logData);
        }
        fs.writeFileSync(`${loggerFile}`, JSON.stringify(_updatedData, null, 2));
      } else {
        /** No logfile present */
        let _updatedData = {
          default: [],
          success: [],
          info:[],
          error: [],
          sync: {},
          syncError: [],
        };

        let _logData = {
          dateTime: new Date(),
          data: data.toString(),
        };

        if (type == "sync") {
          _updatedData[type] = _logData;
        } else {
          _updatedData[type].push(_logData);
        }

        fs.writeFileSync(`${loggerFile}`, JSON.stringify(_updatedData, null, 2));
      }
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}
async function getLoggerData() {
  try {
    if (fs) {
      // let filePath = `${baseDir}/veri5now`;
      if (fs.existsSync(`${loggerFile}`)) {
        let traceFileData = fs.readFileSync(`${loggerFile}`, "utf-8");

        if (traceFileData) {
          return JSON.parse(loggerFile);
        }
      }

      return null;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}

module.exports = { logger, getLoggerData };
