const crypto = require("crypto");
const { logger } = require("./Logger");

// var CryptoJS = require("crypto-js");

async function generateAESKeys(len) {
  try {
    
    newAesKey = (crypto.randomBytes(32)).toString("base64")

    /*
    const crypto_js_key= CryptoJS.lib.WordArray.random(len || 32);
    newAesKey = crypto_js_key.toString(CryptoJS.enc.Base64);
    */

    return { aesKey: newAesKey };
    
  } catch (error) {    
    logger(
      JSON.stringify({
        function: "generateAESKeys()",
        reason: "Exception:",
        error: error?.message || error.toString(),
      }),
      "error"
    );
    return null;
  }
}

async function aesEncryption(secretKey, plainText) {
  try {
    
    let encmsg = "";
    if (typeof plainText == "object") {
      plainText = JSON.stringify(plainText);
    }

    
    let aesKey = Buffer.from(secretKey, "base64");

    const cipher = crypto.createCipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
    encmsg = cipher.update(plainText, "utf8", "base64");
    encmsg += cipher.final("base64");
    
    /*
    encmsg = (CryptoJS.AES.encrypt(plainText, secretKey)).toString();
*/
    return encmsg;
  } catch (error) {
    // console.log(error);
    
    logger(
      JSON.stringify({
        function: "aesEncryption()",
        reason: "Exception:",
        error: error?.message || error.toString(),
      }),
      "error"
    );
    return "";
  }
}

async function aesDecryption(secretKey, encryptedText) {
  try {
    let decryptedData = null;

   
    let aesKey = Buffer.from(secretKey, "base64");
    const decipher = crypto.createDecipheriv("aes-256-ecb", aesKey, null); // Note the use of null for IV
    decryptedData = decipher.update(encryptedText, "base64", "utf8");
    decryptedData += decipher.final("utf8");
    

     /*
    decrypted_bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
    decryptedData= decrypted_bytes.toString(CryptoJS.enc.Utf8);
*/
    let plainText = decryptedData || "";

    if (plainText.trim() != "" && plainText.includes("{") && typeof plainText == "string") {
      plainText = JSON.parse(plainText);
    }

    return plainText;
  } catch (error) {
    // console.log(error);
    
    logger(
      JSON.stringify({
        function: "aesDecryption()",
        reason: "Exception:",
        error: error?.message || error.toString(),
      }),
      "error"
    );
    return "";
  }
}

module.exports = { generateAESKeys, aesEncryption, aesDecryption };
