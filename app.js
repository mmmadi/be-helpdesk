import express from "express";
import config from "./config/config.json";

const PORT = config.port || 5000;
const app = express();

app.get("/", (req, res) => {
  res.send("<h1>hello</h1>");
});

app.listen(PORT, () => {
  console.log(`Server has been started on port ${PORT}...`);
});
