const nodemailer = require('nodemailer');
const env = require('../../../../config/env');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.port === 465,
      auth: { user: env.email.smtp.user, pass: env.email.smtp.pass },
    });
  }
  return transporter;
}

// Phương án tạm khi chưa có domain riêng cho Resend — dễ vào spam hơn, xem ARCHITECTURE.md §6.
async function send({ to, subject, html }) {
  const info = await getTransporter().sendMail({ from: env.email.from, to, subject, html });
  return { providerMessageId: info.messageId };
}

module.exports = { send };
