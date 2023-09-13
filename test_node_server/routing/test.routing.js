const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = require("express").Router();

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
    fs.writeFileSync("public_key", keyPair.publicKey);
    fs.writeFileSync("private_key", keyPair.privateKey);
    res.status(200).json({ public: keyPair.publicKey, private: keyPair.privateKey });
  } catch (error) {
    next(error);
  }
});

router.post("/rsaEncrypt", async (req, res, next) => {
  console.log(" >>> Test encrypt");
  try {
    const { data } = req.body;
    if (data) {
      let PUBKEY = fs.readFileSync("public_key", "utf8");

      // Encrypting msg with publicEncrypt method
      let encmsg = crypto
        .publicEncrypt(PUBKEY, Buffer.from(JSON.stringify(data).toString(), "utf8"))
        .toString("base64");

      return res.status(200).json({ data: encmsg });
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

      let PRIVKEY = fs.readFileSync("private_key", "utf8");

      console.log({ PRIVKEY });
      // Decrypting msg with privateDecrypt method
      let msg = crypto.privateDecrypt(
        {
          key: PRIVKEY,
          passphrase: "",
        },
        Buffer.from(data, "base64")
      );

      return res.status(200).json({ data: msg.toString("utf8") });
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
  const keyLen = Number(req?.params?.length || 32);

  const key = crypto.randomBytes(keyLen);

  const bits = keyLen == 16 ? 128 : keyLen == 24 ? 192 : keyLen == 32 ? 256 : "Invalid";

  return res.status(200).json({ len_bytes: keyLen, len_bits: bits, data: key.toString("base64") });
});

router.post("/aesEncrypt", async (req, res, next) => {
  console.log(" >>> Test AES encrypt");
  try {
    const { secret, data } = req.body;
    if (data) {
      let aesKey = Buffer.from(secret, "base64");

      const cipher = crypto.createCipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
      let encmsg = cipher.update(JSON.stringify(data), "utf8", "base64");
      encmsg += cipher.final("base64");

      return res.status(200).json({ data: encmsg });
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
      let aesKey = Buffer.from(secret, "base64");
      const decipher = crypto.createDecipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
      let decryptedData = decipher.update(base64String, "base64", "utf8");
      decryptedData += decipher.final("utf8");
      return res.status(200).json({ data: decryptedData });
    } else {
      res.status(200).json({ data: "Data not found..." });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
