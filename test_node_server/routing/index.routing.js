const multer = require("multer");
const fs = require("fs");
const Veri5Now = require("licensing-node-bb");

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

router.get("/", async (req, res, next) => {
  try {
    res.status(200).json({ dat: "Routeing accessible..." });
  } catch (error) {
    next(error);
  }
});

router.get("/getListProduct", async (req, res, next) => {
  console.log(" >>> getListProduct calling")
    try {
      Veri5Now.getProductList((e) => {
        console.log({e})
          return res.status(200).json(e);
        }).catch((err) => {
          console.log(":: CATCH :: ", err);
        });
    } catch (error) {
      next(error);
    }
  });

  
router.get("/reinitialize/:proCode", async (req, res, next) => {
  try {
    const { proCode } = req.params;
    if (proCode) {
      let e = await Veri5Now.init(
        process.env.LICENSE_SERVER_BASE_URL,
        proCode,
        process.env.LICENSE_DEFAULT_SECRET
      );
      return res.status(200).json(e);
    } else {
      res.status(200).json({ dat: "Product Code not found..." });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/getMyConfig", async (req, res, next) => {
  try {
    Veri5Now.getMyConfig((e) => {
    //   console.log({ e });
      return res.status(200).json({resultCode:1,details:e});
    }).catch((err) => {
      console.log(":: CATCH :: ", err);
    });
  } catch (error) {
    next(error);
  }
});

router.get("/getKeyFil", async (req, res, next) => {
  try {
    Veri5Now.getLicenseAccessKey(async (result) => {
      console.log(result);
      let _res = { ...result };
      _res.data.serverFileEndPoint = `${process.env.ServerUrl}${_res.data.serverFileEndPoint}`;

      return res.status(200).json(_res);
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/uploadLicenseFile",
  upload.single("license"),
  async (req, res, next) => {
    try {
      console.log("*** Uploading License ***");
      Veri5Now.uploadLicenseFile(req.file, async (result) => {
        console.log(result);

        return res.status(200).json(result);
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/gtLicenseDetails", async (req, res, next) => {
  try {
    console.log("*** Details of License ***");
    Veri5Now.getLicenseDetails((result) => {
      // console.log(result);
      res.status(200).json(result);
    });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
