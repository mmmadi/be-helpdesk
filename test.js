const request = require("request");
const config = require("./config/config.json");
const utf8 = require("utf8");

const subject = "test";

const text = `*Здравствуйте*%0aК%20вам%20поступила%20новая%20заявка%20*№%2094*%0aТема:%20*${subject}*%0aПосмотрите%20статус%20заявки%20в%20приложение%0a[Открыть%20заявку](http://192.168.40.87:3000/orders/94)`;

const x = 347602499;
const URL = `https://api.telegram.org/bot${
  config.telegram.token
}/sendMessage?chat_id=${x}&text=${utf8.encode(text)}&parse_mode=${
  config.telegram.parse_mode
}`;

// console.log(URL);

request(URL, (error) => {
  console.log(error);
});
