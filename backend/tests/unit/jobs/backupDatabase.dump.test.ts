import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();
vi.mock("child_process", () => ({ spawn: (...args: unknown[]) => spawnMock(...args) }));

vi.mock("fs", () => {
  const mocks = {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
  return { default: mocks, ...mocks };
});

vi.mock("@/config/cloudinary", () => ({
  cloudinary: {
    uploader: { upload: vi.fn().mockResolvedValue({}), destroy: vi.fn() },
    api: { resources: vi.fn() },
  },
}));

vi.mock("@/shared/utils/backupEncryption", () => ({
  encryptBackupBuffer: vi.fn().mockReturnValue(Buffer.from("noi-dung-da-ma-hoa")),
}));

// object CHUNG cho cả file test — mutate trực tiếp giữa các test thay vì mock lại từ đầu, vì
// `@/config/env` được import 1 lần duy nhất (module cache) bởi backupDatabase.job.ts.
const envMock: { databaseUrl: string; backupEncryptionPublicKeyPem: string | undefined } = {
  databaseUrl: "postgresql://test:test@localhost:5432/test",
  backupEncryptionPublicKeyPem: undefined,
};
vi.mock("@/config/env", () => ({ env: envMock }));

const fsMocks = (await import("fs")).default;
const { cloudinary } = await import("@/config/cloudinary");
const { encryptBackupBuffer } = await import("@/shared/utils/backupEncryption");
const { backupDatabase } = await import("@/jobs/backupDatabase.job");

// spawn() giả lập pg_dump thành công NGAY LẬP TỨC — job chỉ đợi sự kiện 'close' mã 0.
function mockSuccessfulSpawn() {
  spawnMock.mockImplementation(() => {
    const proc = new EventEmitter();
    queueMicrotask(() => proc.emit("close", 0));
    return proc;
  });
}

beforeEach(() => {
  spawnMock.mockReset();
  vi.mocked(fsMocks.readFileSync).mockReset().mockReturnValue(Buffer.from("noi-dung-dump-gia-lap"));
  vi.mocked(fsMocks.writeFileSync).mockReset();
  vi.mocked(fsMocks.existsSync).mockReset().mockReturnValue(true);
  vi.mocked(fsMocks.unlinkSync).mockReset();
  vi.mocked(cloudinary.uploader.upload).mockClear();
  vi.mocked(encryptBackupBuffer).mockClear();
  envMock.backupEncryptionPublicKeyPem = undefined;
  mockSuccessfulSpawn();
});

describe("backupDatabase — nén + mã hoá (docs/12 OPS-02)", () => {
  it("pg_dump luôn chạy với --compress=9 (nén tối đa)", async () => {
    await backupDatabase();
    const args = spawnMock.mock.calls[0]![1] as string[];
    expect(args).toContain("--compress=9");
  });

  it("CHƯA cấu hình khoá công khai → upload file thô, KHÔNG gọi encryptBackupBuffer", async () => {
    await backupDatabase();

    expect(encryptBackupBuffer).not.toHaveBeenCalled();
    const uploadArgs = vi.mocked(cloudinary.uploader.upload).mock.calls[0]!;
    expect(uploadArgs[1]).toMatchObject({ public_id: expect.not.stringContaining(".enc") });
  });

  it("ĐÃ cấu hình khoá công khai → mã hoá trước khi upload, tên file có hậu tố .enc", async () => {
    envMock.backupEncryptionPublicKeyPem =
      "-----BEGIN PUBLIC KEY-----\nfake\n-----END PUBLIC KEY-----";

    await backupDatabase();

    expect(encryptBackupBuffer).toHaveBeenCalledWith(
      Buffer.from("noi-dung-dump-gia-lap"),
      envMock.backupEncryptionPublicKeyPem,
    );
    const [uploadPath, uploadOptions] = vi.mocked(cloudinary.uploader.upload).mock.calls[0]!;
    expect(uploadPath).toMatch(/\.dump\.enc$/);
    expect((uploadOptions as unknown as { public_id: string }).public_id).toMatch(/\.dump\.enc$/);
  });

  it("upload đúng resource_type raw và prefix backups/ dù mã hoá hay không", async () => {
    await backupDatabase();
    const uploadOptions = vi.mocked(cloudinary.uploader.upload).mock.calls[0]![1] as unknown as {
      resource_type: string;
      public_id: string;
    };
    expect(uploadOptions.resource_type).toBe("raw");
    expect(uploadOptions.public_id).toMatch(/^backups\//);
  });

  it("dọn file tạm (.dump và .dump.enc) sau khi xong, kể cả khi thành công", async () => {
    envMock.backupEncryptionPublicKeyPem =
      "-----BEGIN PUBLIC KEY-----\nfake\n-----END PUBLIC KEY-----";
    await backupDatabase();
    expect(fsMocks.unlinkSync).toHaveBeenCalledTimes(2); // .dump gốc + .dump.enc
  });
});
