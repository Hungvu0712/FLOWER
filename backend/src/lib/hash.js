const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const BCRYPT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

// Dùng cho magic link / refresh token / reset password token:
// không bao giờ lưu token thô trong DB, chỉ lưu hash để so khớp lúc verify.
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { hashPassword, verifyPassword, sha256, generateRandomToken };
