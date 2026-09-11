// Giải mã 1 file backup .dump.enc bằng khoá RIÊNG (private key) — CHỦ ĐÍCH chạy OFFLINE, KHÔNG BAO
// GIỜ chạy trên máy chủ production. Khoá riêng không nằm trong `.env`/`env.ts` của server — người
// vận hành tự giữ file khoá riêng ở nơi an toàn (password manager, USB mã hoá...), tải file backup đã
// mã hoá về máy mình rồi chạy script này tại đó. Xem docs/09 §"Khoá mã hoá backup" và docs/10 §7.
//
// Dùng:  npm run decrypt-backup -- <file.dump.enc> <private-key.pem> <output.dump>
import fs from "fs";
import { decryptBackupBuffer } from "../src/shared/utils/backupEncryption";

const [encryptedPath, privateKeyPath, outputPath] = process.argv.slice(2);

if (!encryptedPath || !privateKeyPath || !outputPath) {
  console.error("Dùng: npm run decrypt-backup -- <file.dump.enc> <private-key.pem> <output.dump>");
  process.exit(1);
}

const envelope = fs.readFileSync(encryptedPath);
const privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");

try {
  const decrypted = decryptBackupBuffer(envelope, privateKeyPem);
  fs.writeFileSync(outputPath, decrypted);
  console.log(`Đã giải mã thành công → ${outputPath}`);
  console.log(
    `Khôi phục bằng: pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" ${outputPath}`,
  );
} catch (err) {
  console.error("Giải mã thất bại — sai khoá riêng, hoặc file backup bị hỏng/chỉnh sửa:", err);
  process.exit(1);
}
