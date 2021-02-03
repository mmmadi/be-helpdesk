import express from "express";
import config from "./config/config.json";
import testController from "./controller/test_controller.js";
import authController from "./controller/auth_controller.js";

const PORT = config.port || 5000;
const app = express();

app.use(express.json({ limit: "100mb", extended: true }));

app.use(testController);
app.use(authController);

app.listen(PORT, () => {
  console.log(`Server has been started on port ${PORT}...`);
});
