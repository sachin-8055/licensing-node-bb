const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const forge = require("node-forge");
var CryptoJS = require("crypto-js");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let path;

    path = `/temp`;

    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }

    cb(null, path);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

router.get("/rsaKeyGen", async (req, res, next) => {
  try {
    /**
     // Key generation using Crypto
    const keyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",      
      },
    });

    // Creating public and private key file
    fs.writeFileSync("public.pem", keyPair.publicKey);
    fs.writeFileSync("private.pem", keyPair.privateKey);
    res.status(200).json({ public: keyPair.publicKey, private: keyPair.privateKey });

    */

    const forgeKeyCreationOptions = {
      bits: 2048,
      // e: 0x10001,
    };
    const keys = forge.pki.rsa.generateKeyPair(forgeKeyCreationOptions);
    const privateKey = forge.pki.privateKeyToPem(keys.privateKey);
    const publicKey = forge.pki.publicKeyToPem(keys.publicKey);

    fs.writeFileSync("private.pem", privateKey);
    fs.writeFileSync("public.pem", publicKey);

    res.status(200).json({ data: true });
  } catch (error) {
    next(error);
  }
});

router.post("/rsaEncrypt", async (req, res, next) => {
  console.log(" >>> Test encrypt");
  try {
    const { data } = req.body;
    if (data) {
      let PUBKEY = fs.readFileSync("public.pem", "utf8");

      /*
      // Encrypting msg with publicEncrypt method using Crypto
      let encmsg = crypto
        .publicEncrypt({key:PUBKEY,passphrase:"",padding: crypto.constants.RSA_PKCS1_PADDING}, Buffer.from(JSON.stringify(data).toString(), "utf8"))
        .toString("base64");
      return res.status(200).json({ data: encmsg });
      */

      let _input = data;
      if (typeof data == "object") {
        _input = JSON.stringify(data);
      }
      // Decrypting msg with privateDecrypt method Using node-forge
      const forgePublicKey = forge.pki.publicKeyFromPem(PUBKEY);
      // Encrypt data with the public key
      const key_encrypted = forgePublicKey.encrypt(_input);
      const key_b64 = forge.util.encode64(key_encrypted);

      return res.status(200).json({ data: key_b64 });
    } else {
      res.status(200).json({ data: "Data not found..." });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/rsaDecrypt", async (req, res, next) => {
  console.log(" >>> Test decrypt");
  try {
    const { data } = req.body;
    if (data) {
      // Reading private key file

      let PRIVKEY = fs.readFileSync("private.pem", "utf8");

      console.log({ PRIVKEY });

      /*
      // Decrypting msg with privateDecrypt method Using Crypto
      let msg = crypto.privateDecrypt({key:PRIVKEY,passphrase:"",padding: crypto.constants.RSA_PKCS1_PADDING},
        Buffer.from(data, "base64")
      );

      return res.status(200).json({ data: msg.toString("utf8") });
      */

      // Decrypting msg with privateDecrypt method Using node-forge
      const forgePrivateKey = forge.pki.privateKeyFromPem(PRIVKEY);

      const base64Decode_to_byte = forge.util.decode64(data);

      // Decrypt data with the private key
      const decryptedData = forgePrivateKey.decrypt(base64Decode_to_byte);

      return res.status(200).json({ data: decryptedData });
    } else {
      res.status(200).json({ data: "Data not found..." });
    }
  } catch (error) {
    next(error);
  }
});

/********* AES *************** */

router.get("/getStringToBase64/:str", async (req, res, next) => {
  const _string = req.params.str;

  return res.status(200).json({ data: _string ? btoa(_string) : "" });
});

router.get("/generateAesKey/:length", async (req, res, next) => {
  if (req?.params?.length) {
    if (!["16", "24", "32"].includes(req?.params?.length.toString().trim())) {
      return res.status(500).json({ data: "Length should be 16,24,32 only" });
    }
  }
  // Generate AES key using Crypto
  const keyLen = Number(req?.params?.length || 32);
  const crypto_key_bytes = crypto.randomBytes(keyLen);

  // Generate AES key using node-forge
  var forge_key_byte = forge.random.getBytesSync(req?.params?.length || 32);
  const forge_key_b64 = Buffer.from(forge_key_byte).toString("base64");

  // Generate AES key using CryptoJS
  const crypto_js_key_bytes = CryptoJS.lib.WordArray.random(req?.params?.length || 32);

  const bits = keyLen == 16 ? 128 : keyLen == 24 ? 192 : keyLen == 32 ? 256 : "Invalid";

  return res.status(200).json({
    len_bytes: keyLen,
    len_bits: bits,
    crypto_key: crypto_key_bytes.toString("base64"),
    forge_key: forge_key_b64,
    crypto_js_key: crypto_js_key_bytes.toString(CryptoJS.enc.Base64),
  });
});

router.post("/aesEncrypt", async (req, res, next) => {
  console.log(" >>> Test AES encrypt");
  try {
    const { secret, data } = req.body;
    if (data) {
      let encmsg = "";
      let _input = "";
      if (typeof data == "object") {
        _input = JSON.stringify(data);
      }

      /*
      let aesKey = Buffer.from(secret, "base64");

      const cipher = crypto.createCipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
      encmsg = cipher.update(_input, "utf8", "base64");
      encmsg += cipher.final("base64");
      */

      encmsg = CryptoJS.AES.encrypt(_input, secret);

      return res.status(200).json({ data: encmsg.toString() });
    } else {
      res.status(200).json({ data: "Data not found..." });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/aesDecrypt", async (req, res, next) => {
  console.log(" >>> Test AES decrypt");
  try {
    const { secret, data } = req.body;
    if (data) {
      // Reading private key file
      const base64String = data;
      let decryptedData = "";
      /*
      let aesKey = Buffer.from(secret, "base64");
      const decipher = crypto.createDecipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
      let decryptedData = decipher.update(base64String, "base64", "utf8");
      decryptedData += decipher.final("utf8");
      */

      decrypted_bytes = CryptoJS.AES.decrypt(base64String, secret);
      decryptedData= decrypted_bytes.toString(CryptoJS.enc.Utf8);

      return res.status(200).json({ data: JSON.parse(decryptedData) });
    } else {
      res.status(200).json({ data: "Data not found..." });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
