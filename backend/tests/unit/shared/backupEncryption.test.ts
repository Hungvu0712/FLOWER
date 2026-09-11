import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { decryptBackupBuffer, encryptBackupBuffer } from "@/shared/utils/backupEncryption";

// Sinh 1 cặp khoá RSA thật cho test (2048 bit đủ nhanh, không cần 4096 bit như khuyến nghị production).
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

describe("backupEncryption (docs/12 OPS-02)", () => {
  it("mã hoá rồi giải mã trả lại ĐÚNG NGUYÊN VĂN nội dung gốc", () => {
    const plaintext = Buffer.from("PGDMP nội dung backup giả lập — dữ liệu khách hàng nhạy cảm");
    const encrypted = encryptBackupBuffer(plaintext, publicKey);
    const decrypted = decryptBackupBuffer(encrypted, privateKey);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it("roundtrip đúng với file nhị phân lớn (mô phỏng file .dump thật)", () => {
    const plaintext = crypto.randomBytes(500_000); // ~500KB dữ liệu nhị phân ngẫu nhiên
    const encrypted = encryptBackupBuffer(plaintext, publicKey);
    const decrypted = decryptBackupBuffer(encrypted, privateKey);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it("2 lần mã hoá CÙNG nội dung cho ra ciphertext KHÁC nhau (IV + khoá AES ngẫu nhiên mỗi lần)", () => {
    const plaintext = Buffer.from("nội dung giống hệt nhau");
    const a = encryptBackupBuffer(plaintext, publicKey);
    const b = encryptBackupBuffer(plaintext, publicKey);
    expect(a.equals(b)).toBe(false);
  });

  it("KHÔNG đọc được nội dung gốc chỉ bằng khoá công khai — file mã hoá không chứa plaintext", () => {
    const plaintext = Buffer.from("bí mật không được lộ ra ngoài dưới dạng thô");
    const encrypted = encryptBackupBuffer(plaintext, publicKey);
    expect(encrypted.includes(plaintext)).toBe(false);
  });

  it("dữ liệu bị chỉnh sửa (tamper) sau khi mã hoá → giải mã THẤT BẠI, không âm thầm trả dữ liệu sai", () => {
    const plaintext = Buffer.from("dữ liệu gốc");
    const encrypted = encryptBackupBuffer(plaintext, publicKey);
    encrypted[encrypted.length - 1] = (encrypted[encrypted.length - 1]! + 1) % 256; // sửa 1 byte cuối ciphertext
    expect(() => decryptBackupBuffer(encrypted, privateKey)).toThrow();
  });

  it("giải mã bằng SAI khoá riêng → thất bại", () => {
    const other = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const encrypted = encryptBackupBuffer(Buffer.from("dữ liệu"), publicKey);
    expect(() => decryptBackupBuffer(encrypted, other.privateKey)).toThrow();
  });
});
