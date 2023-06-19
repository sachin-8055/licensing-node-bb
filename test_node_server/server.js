const express = require("express");
require("dotenv").config();
const cors = require("cors");
var cookieParser = require("cookie-parser");
const Veri5Now  = require('licensing-node-bb');
const licenseRouting = require("./routing/index.routing")

const app = express();

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors());

Veri5Now.init(process.env.LICENSE_SERVER_BASE_URL,process.env.LICENSE_PRODUCT_CODE,process.env.LICENSE_DEFAULT_SECRET);

app.use("/", express.static("public"));

app.use("/veri5now/", express.static("veri5now"));

app.use("/api",licenseRouting);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.info("INFO : Express Server", "started http://localhost:" + PORT);
});
