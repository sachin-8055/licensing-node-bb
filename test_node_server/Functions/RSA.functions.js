const crypto = require("crypto");
const fs = require("fs");
const forge = require("node-forge");

const productKeyFilePath = process.cwd() + "/" + process.env.PRIVATE_KEY_PATH;

const forgeKeyCreationOptions = {
  bits: 2048,
  // e: 0x10001,
};

async function generateRSAKeys(clientId) {
  try {
    const keys = forge.pki.rsa.generateKeyPair(forgeKeyCreationOptions);
    const privateKey = forge.pki.privateKeyToPem(keys.privateKey);
    const publicKey = forge.pki.publicKeyToPem(keys.publicKey);

    if (clientId && clientId.trim() != "") {
      const filePath = productKeyFilePath + clientId;

      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }

      fs.writeFileSync(filePath + "/private.pem", privateKey);
      fs.writeFileSync(filePath + "/public.pem", publicKey);

      console.log("Product Keys Generated and Saved.");
    }

    return { privateKey, publicKey };
  } catch (error) {
    console.log(error);
    return null;
  }
}
async function rsaEncryption(keyFilePath, plainText) {
  try {
    let PUBKEY = fs.readFileSync(keyFilePath, "utf8");
    let _input = plainText;
    if (typeof plainText == "object") {
      _input = JSON.stringify(plainText);
    }

    /*
      // Encrypting msg with publicEncrypt method Using Crypto
      let encmsg = crypto.publicEncrypt( {
        key: PUBKEY,
        padding: crypto.constants.RSA_PKCS1_PADDING,
        passphrase:""}, 
        Buffer.from(_input, "utf8")).toString("base64");
        */

    //Encrypting msg with node-forge
    const forgePublicKey = forge.pki.publicKeyFromPem(PUBKEY);
    const _encryptedData = forgePublicKey.encrypt(_input);
    const encmsg = forge.util.encode64(_encryptedData);

    return encmsg;
  } catch (error) {
    console.log(error);
    return "";
  }
}

async function rsaDecryption(keyFilePath, encryptedText) {
  try {
    let PRIVKEY = fs.readFileSync(keyFilePath, "utf8");
    let plainText = "";

    /*
    // Decrypting msg with privateDecrypt method
    let byteBufferText = crypto.privateDecrypt(
      {
        key: PRIVKEY,
        passphrase: "",
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(encryptedText, "base64")
    );

    plainText = byteBufferText.toString("utf8");

    */

    // Decryption using node-forge
    const forgePrivateKey = forge.pki.privateKeyFromPem(PRIVKEY);
    const base64Decode_to_byte = forge.util.decode64(encryptedText);
    plainText = forgePrivateKey.decrypt(base64Decode_to_byte);

    if (plainText.trim() != "" && plainText.includes("{") && typeof plainText == "string") {
      plainText = JSON.parse(plainText);
    }

    return plainText;
  } catch (error) {
    console.log(error);
    return "";
  }
}

module.exports = { generateRSAKeys, rsaEncryption, rsaDecryption };
