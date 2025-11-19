const nodemailer = require("nodemailer");

require("dotenv").config();

const sendEmail = async ({ from, to, subject, html }) => {
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 465,
    secure: process.env.EMAIL_SECURE === "true",

    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transport.sendMail({
    from,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
