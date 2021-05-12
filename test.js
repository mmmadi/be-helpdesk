const https = require("https");
const options = {
  hostname: "nomer.tele2.kz",
  port: 443,
  path: "/ns-t2-api-prod/nmb?count=10000000&mask=a",
  method: "GET",
};

const req = https.request(options, (res) => {
  res.on("data", (d) => {
    process.stdout.write(d);
  });
});

req.end();
