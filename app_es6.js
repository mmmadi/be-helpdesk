const express = require("express");
const config = require("./config/config.json");
const testController = require("./controller/test_controller.js");
const authController = require("./controller/auth_controller.js");
const orderController = require("./controller/order_controller.js");
const orderFilterController = require("./controller/order_filter_controller.js");
const dashboardController = require("./controller/dashboard_controller.js");
const profileController = require("./controller/profile_controller.js");

const PORT = config.port || 8081;
const app = express();

app.use(express.json({ limit: "100mb", extended: true }));

app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.use("/static", express.static("public"));
app.use(testController);
app.use(authController);
app.use(orderController);
app.use(orderFilterController);
app.use(dashboardController);
app.use(profileController);

app.listen(PORT, () => {
  console.log(`Server has been started on port ${PORT}...`);
});
