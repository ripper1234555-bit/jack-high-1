require("dotenv").config();
const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendVerificationCode(toEmail, code, name) {
  if (!transporter) {
    console.log(
      `\n[DEV MODE — no EMAIL_USER/EMAIL_PASS set in .env]\nVerification code for ${toEmail}: ${code}\n`
    );
    return;
  }

  await transporter.sendMail({
    from: `"YAP" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your YAP verification code",
    text: `Hi ${name}, your YAP verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Hi ${name},</p><p>Your YAP verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

module.exports = { sendVerificationCode };
