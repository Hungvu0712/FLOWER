const env = require('../../../config/env');
const prisma = require('../../../config/prisma');
const logger = require('../../../lib/logger');

// Chọn provider qua biến môi trường — nơi gọi (auth.service, users.service...) không cần biết
// đang chạy Resend hay SMTP. Đổi provider chỉ cần đổi EMAIL_PROVIDER trong .env.
// Xem ARCHITECTURE.md §6.
const provider = env.email.provider === 'resend'
  ? require('./providers/resend.provider')
  : require('./providers/nodemailer.provider');

async function sendEmail({ to, subject, html, type }) {
  try {
    const result = await provider.send({ to, subject, html });
    await prisma.emailLog.create({
      data: { toEmail: to, type, status: 'sent', providerMessageId: result.providerMessageId },
    });
    return result;
  } catch (err) {
    logger.error(`Gửi email thất bại (type=${type}, to=${to}):`, err.message);
    await prisma.emailLog.create({
      data: { toEmail: to, type, status: 'failed', error: err.message },
    }).catch(() => {}); // không để lỗi ghi log email làm crash luồng chính
    throw err;
  }
}

module.exports = { sendEmail };
