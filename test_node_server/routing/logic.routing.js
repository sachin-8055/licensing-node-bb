var { machineId, machineIdSync } = require("node-machine-id");
const moment = require("moment-timezone");
const address = require("address");
const fs = require("fs");
const crypto = require("crypto");
const router = require("express").Router();

router.get("/", async (req, res, next) => {
  try {
    res.status(200).json({ dat: "Routeing accessible..." });
  } catch (error) {
    next(error);
  }
});

router.get("/init", async (req, res, next) => {
  try {
    const { baseUrl, productCode } = req.query;

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

    secretId = secretId ? secretId : (crypto.randomBytes(32)).toString("base64");

    /** Check key exist and generate new keys */
    const keyGen = generateClientKeys();
    console.log({ keyGen });
    if (keyGen) {
      /** new Key is generated need to exchange with server */
    }

    const _configData = {
      baseUrl,
      productCode,
      deviceId,
      secretId,
      IPAddress,
      dateTime,
      timeZone,
    };

    fs.writeFileSync("init", JSON.stringify(_configData));

    res.status(200).json({ res: _configData });
  } catch (error) {
    next(error);
  }
});

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

router.get("/getConfig", async (req, res, next) => {
  try {
    let _data = {};

    if (fs.existsSync("init")) {
      let fileData = fs.readFileSync("init", "utf-8");
      _data = JSON.parse(fileData);
    }

    res.status(200).json({ res: _data });
  } catch (error) {
    next(error);
  }
});

router.get("/doExchang", async (req, res, next) => {
  try {
    if (fs.existsSync("init")) {
      let fileData = fs.readFileSync("init", "utf-8");
      const _data = JSON.parse(fileData);
      console.log("FROM FILE :: ", _data);

      const secretKey = _data.secretId;

      const clientDataEncrRes = await aesEncryption(secretKey, JSON.stringify(_data));

      const secretKeyEncrRes = await rsaEncryption(secretKey);

      console.log({ clientDataEncrRes, secretKeyEncrRes });

      const r= { "client":clientDataEncrRes, "key":secretKeyEncrRes };
      res.status(200).json(r);

    }
  } catch (error) {
    next(error);
  }
});


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

module.exports = router;
