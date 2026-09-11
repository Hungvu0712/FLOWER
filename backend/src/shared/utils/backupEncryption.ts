import crypto from "crypto";

// docs/12 OPS-02: mã hoá backup database trước khi upload lên Cloudinary — nếu tài khoản Cloudinary
// bị lộ, toàn bộ dữ liệu khách hàng trong file .dump (tên, SĐT, địa chỉ giao hàng) không đọc được.
//
// Mã hoá lai (hybrid) RSA + AES-256-GCM — KHÔNG dùng gpg/age qua CLI để tránh thêm 1 binary bắt buộc
// phải có trên máy chủ production (giống pg_dump), giữ nguyên chỉ dùng module `crypto` sẵn có của
// Node: RSA-OAEP không mã hoá trực tiếp được file lớn (giới hạn theo kích thước khoá), nên chỉ dùng
// RSA để mã hoá 1 khoá AES ngẫu nhiên (32 byte) — khoá AES đó mới trực tiếp mã hoá nội dung file.
// Khoá RIÊNG (private key) để giải mã KHÔNG BAO GIỜ được đưa lên máy chủ — xem scripts/decrypt-backup.mjs.
//
// Định dạng file đầu ra (binary, đọc tuần tự):
//   [4 byte uint32 BE: độ dài khoá AES đã mã hoá RSA] [khoá AES đã mã hoá RSA]
//   [12 byte: IV của AES-GCM] [16 byte: authTag của AES-GCM] [phần còn lại: ciphertext]
const AES_ALGORITHM = "aes-256-gcm";
const AES_KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encryptBackupBuffer(plaintext: Buffer, publicKeyPem: string): Buffer {
  const aesKey = crypto.randomBytes(AES_KEY_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(AES_ALGORITHM, aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedAesKey = crypto.publicEncrypt(
    { key: publicKeyPem, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    aesKey,
  );

  const keyLength = Buffer.alloc(4);
  keyLength.writeUInt32BE(encryptedAesKey.length);

  return Buffer.concat([keyLength, encryptedAesKey, iv, authTag, ciphertext]);
}

// Dùng ở scripts/decrypt-backup.mjs (chạy OFFLINE bằng khoá riêng, không nằm trong build server) —
// export ở đây để có thể viết unit test roundtrip mã hoá/giải mã ngay trong bộ test backend.
export function decryptBackupBuffer(envelope: Buffer, privateKeyPem: string): Buffer {
  const keyLength = envelope.readUInt32BE(0);
  let offset = 4;

  const encryptedAesKey = envelope.subarray(offset, offset + keyLength);
  offset += keyLength;

  const iv = envelope.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;

  const authTag = envelope.subarray(offset, offset + AUTH_TAG_LENGTH);
  offset += AUTH_TAG_LENGTH;

  const ciphertext = envelope.subarray(offset);

  const aesKey = crypto.privateDecrypt(
    { key: privateKeyPem, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    encryptedAesKey,
  );

  const decipher = crypto.createDecipheriv(AES_ALGORITHM, aesKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
