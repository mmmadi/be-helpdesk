const emailTemplate = (data) => {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.title}</title>
  </head>
  <body style="margin: 0; padding: 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
       <tr>
        <td>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
              <tr >
               <td bgcolor="#212121" style="padding: 20px 30px 20px 30px; text-align: center; font-size: 2rem; color: #fff; font-family: Georgia, 'Times New Roman', Times, serif;">
                Petroleum
               </td>
              </tr>
              <tr >
                  <td bgcolor="#198754" style="padding: 20px 30px 20px 30px; text-align: center; font-size: 1.5rem; color: #fff; font-family: Georgia, 'Times New Roman', Times, serif;">
                      ${data.type}
                  </td>
              </tr>
              <tr>
                  <td bgcolor="#212121" style="padding: 40px 30px 40px 30px; color: #fff;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                           <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 1rem;">
                            Здравствуйте, ${data.name}!
                           </td>
                          </tr>
                          <tr>
                           <td style="padding: 20px 0 30px 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 1rem;" >
                            <p>${data.text}</p>
                            <p>Посмотрите статус заявки в приложении</p>
                            <p style="color: #757575 ;">
                              Есть вопросы? обратитесь на 
                              <a 
                                  href="mailto:it@petroleum.com.kz"
                                  style="text-decoration: none; color: #0288d1;"
                              >
                                  it@petroleum.com.kz
                              </a>
                          </p>
                           </td>
                          </tr>
                          <tr>
                           <td style="display: flex; align-items: center; justify-content: center;">
                            <a 
                              href="http://192.168.40.5/orders/${data.orderId}" 
                              style="
                                  text-decoration: none; 
                                  color: #fff;
                                  background-color: #0288d1;
                                  text-align: center;
                                  width: 100%;
                                  padding: .5rem 0 .5rem 0;
                                  font-family: Georgia, 'Times New Roman', Times, serif;
                                  font-size: 1.2rem;
                              "
                            >
                              Открыть заявку
                            </a>
                           </td>
                          </tr>
                         </table>
                  </td>
              </tr>
          </table>
        </td>
       </tr>
      </table>
     </body>
  </html>
    `;

  return html;
};
module.exports = emailTemplate;
