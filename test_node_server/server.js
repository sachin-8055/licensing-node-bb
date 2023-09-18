const express = require("express");
require("dotenv").config();
const cors = require("cors");
var cookieParser = require("cookie-parser");
const Veri5Now  = require('licensing-node-bb');
const licenseRouting = require("./routing/index.routing")
const testApiRouting = require("./routing/test.routing")
const logicApiRouting = require("./routing/logic.routing")
const v1Routings = require("./routing/v1.routing")

const app = express();

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors());

// Veri5Now.init(process.env.LICENSE_SERVER_BASE_URL,process.env.LICENSE_PRODUCT_CODE,process.env.LICENSE_DEFAULT_SECRET);

app.use("/", express.static("public"));

app.use("/veri5now/", express.static("veri5now"));

app.use("/api",licenseRouting);

app.use("/api/test",testApiRouting);

app.use("/api/logic",logicApiRouting);

app.use("/api/v1",v1Routings);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.info("INFO : Express Server", "started http://localhost:" + PORT);
});
