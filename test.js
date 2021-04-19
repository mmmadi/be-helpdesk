import fs from "fs";
import path from "path";

// const __dirname = path.resolve();

// const current_path = path.resolve(__dirname);

// const order_dir = current_path + `/public/orders/76`;

// const readedFiles = fs.readdirSync(order_dir);

let test = [
  { id: 2, name: "passwords.xlsx", base64: "test" },
  { id: 3, name: "asdasd.xlsx", base64: "test" },
  { id: 4, name: "bkbkasdaqw.xlsx", base64: "test" },
  { id: 1, name: "passwords.txt", base64: "test" },
];

const test2 = [
  { id: 9, name: "passwords.txt", base64: "test2" },
  { id: 10, name: "qwewqe.xlsx", base64: "test2" },
  { id: 12, name: "hasdasdqwe.xlsx", base64: "test2" },
  { id: 13, name: "asgasasdasd.xlsx", base64: "test2" },
];

// test
//   .filter((file) => test2.map((s) => s.name).includes(file.name))
//   .forEach((c) => console.log(c));
const asd = new Date();
console.log(asd.toString());

// const asdasd = { id: 9, name: "passwords.txt", base64: "test2" };
// const compare = test.findIndex((file) => file.name === asdasd.name);
// console.log(test);

// const newObj = { ...test[compare], name: asdasd.name.replace(".", `${}`) };

// const newArray = [
//   ...test.slice(0, compare),
//   newObj,
//   ...test.slice(compare + 1),
// ];

// console.log(newArray);
