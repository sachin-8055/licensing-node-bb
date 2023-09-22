const router = require("express").Router();
const BBLicense = require("licensing-node-bb");
const multer = require("multer");
const fs = require("fs");

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

router.get("/getConfig", async (req, res, next) => {
  try {
    const result = await BBLicense.getConfig();

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/init", async (req, res, next) => {
  try {
    const { licenseKey } = req.body;
    const baseUrl = process.env.LICENSE_SERVER_BASE_URL;

    const result = await BBLicense.init(baseUrl, licenseKey);

    console.log({result})
    if (result?.code > 0) {
      res.status(200).json({ resultCode: 1, message: "Success" });
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    next(error);
  }
});

router.get("/generateLicense", async (req, res, next) => {
  try {
    const result = await BBLicense.generateLicense();

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/uploadLicenseFile", upload.single("license"), async (req, res, next) => {
  try {
    if (req.file) {
      let fromUser = fs.readFileSync(req.file.path, "utf-8");

      fs.writeFileSync(`license.pem`, fromUser);

      res.status(200).json({ message: "Uploaded Successfully" });
    } else {
      res.status(404).json({ message: "No License File Found" });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/getLicenseData", async (req, res, next) => {
  try {
    const result = await BBLicense.extractLicense("license.pem");

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
