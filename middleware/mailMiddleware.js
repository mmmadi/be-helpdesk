import nodemailer from "nodemailer";
import config from "../config/config.json";
import emailTemplate from "./emailTemplate.js";

const mailMiddleware = (data) => {
  const transporter = nodemailer.createTransport({
    host: config.mailSettings.smtp,
    port: config.mailSettings.port,
    secure: false,
    auth: {
      user: config.authMail.user,
      pass: config.authMail.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: config.authMail.user,
    to: data.mail,
    subject: data.title,
    html: emailTemplate(data),
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.log(error);
    }
  });
};

export default mailMiddleware;
