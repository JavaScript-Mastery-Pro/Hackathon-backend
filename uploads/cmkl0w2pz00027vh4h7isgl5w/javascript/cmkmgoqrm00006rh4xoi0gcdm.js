const nodemailer = require("nodemailer");
const config = require("./config");

module.exports = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      auth: {
        user: config.smtp.auth.user,
        pass: config.smtp.auth.pass,
      },
    });

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject: subject,
      text: text,
    });
    console.log("email sent successfully", email);
  } catch (error) {
    console.log("email not sent!");
    console.log(error);
    return error;
  }
};
