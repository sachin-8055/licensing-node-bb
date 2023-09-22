const express = require("express");
require("dotenv").config();
const cors = require("cors");
var cookieParser = require("cookie-parser");

// const licenseRouting = require("./routing/index.routing")
const testApiRouting = require("./routing/test.routing")
const logicApiRouting = require("./routing/logic.routing")
const v1Routings = require("./routing/v1.routing")
const v1SdkTestRoutings = require("./routing/v1.sdk.routing")

const app = express();

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors());

app.use("/", express.static("public"));

app.use("/veri5now/", express.static("veri5now"));

// app.use("/api",licenseRouting);

app.use("/api/test",testApiRouting);

app.use("/api/logic",logicApiRouting);

app.use("/api/v1",v1Routings);

app.use("/api/v1/sdk",v1SdkTestRoutings);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.info("INFO : Express Server", "started http://localhost:" + PORT);
});
