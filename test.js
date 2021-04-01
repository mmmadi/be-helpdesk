import fs from "fs";
import path from "path";

const __dirname = path.resolve();

const current_path = path.resolve(__dirname);

const order_dir = current_path + `/public/orders/76`;

const readedFiles = fs.readdirSync(order_dir);

const test = [
  { name: "passwords.txt", base64: "from order" },
  { name: "passwords.xlsx", base64: "from order" },
  { name: "asdasd.xlsx", base64: "asd" },
];

readedFiles
  .filter(
    (file) =>
      !test
        .map((elem) => elem.base64 === "from order" && elem.name)
        .includes(file)
  )
  .forEach((x) => console.log(x.name));
