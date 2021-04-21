const data = {
  title: "Статус заявки изменён",
  type: "Ваша заявка выполнена",
  name: creator.rows[0].name,
  text: "Статус вашей заявки был изменён на выполнено",
  mail: creator.rows[0].mail,
  orderId: id,
};

mailMiddleware(data);
