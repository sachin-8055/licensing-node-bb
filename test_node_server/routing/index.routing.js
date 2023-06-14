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
    try {
        
      res.status(200).json({ dat: "Routeing accessible..." });
    } catch (error) {
      next(error);
    }
  });

  
router.post("/reinitialize", async (req, res, next) => {
  try {
    const { proCode } = req.body;
    if (proCode) {
      Veri5Now.init(
        process.env.LICENSE_SERVER_BASE_URL,
        proCode,
        process.env.LICENSE_DEFAULT_SECRET
      );
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

module.exports = router;
