const telegramText = (type, data) => {
  let text = "";

  const checkStatus = "Посмотрите%20статус%20заявки%20в%20приложение";
  const button = `[Открыть%20заявку](http://192.168.40.5/orders/${data.id})`;

  // Создание заявки
  if (type === 1) {
    text = `*Здравствуйте*%0aК%20вам%20поступила%20новая%20заявка%20*№%20${data.id}*%0aТема:%20*${data.subject}*%0a${checkStatus}%0a${button}`;

    return text;
  } else if (type === 2) {
    // Взятие в работу
    text = `
        *Здравствуйте,%20${data.name}*%0aВаша%20заявка%20взята%20в%20работу%0a${checkStatus}%0a${button}
      `;

    return text;
  } else if (type === 3) {
    // Выполнение заявки
    text = `
    *Здравствуйте,%20${data.name}*%0aСтатус%20вашей%20заявки%20был%20изменён%20на%20выполнено%0a${checkStatus}%0a${button}
  `;
    return text;
  } else if (type === 4) {
    // Отмена заявки
    text = `
    *Здравствуйте,%20${data.name}*%0aВашу%20заявку%20отклонили%0a${checkStatus}%0a${button}
  `;
    return text;
  } else {
    // Добавление в участники
    text = `
    *Здравствуйте,%20${data.name}*%0aВас%20добавили%20в%20участники%20заявки%0a${checkStatus}%0a${button}
  `;
    return text;
  }
};

module.exports = telegramText;
