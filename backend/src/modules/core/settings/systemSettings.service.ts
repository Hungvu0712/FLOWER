import { prisma } from "../../../config/prisma";
import { ValidationError } from "../../../shared/errors";
import * as auditLog from "../audit-log/auditLog.service";
import * as filesService from "../files/files.service";
import {
  SETTING_VALUE_SCHEMAS,
  type SettingKey,
  type SettingValue,
} from "./systemSettings.validation";

export interface SystemSettingDTO {
  key: SettingKey;
  // `unknown` (không phải SettingValue<K>) — site_logo được LÀM GIÀU thêm `url` để frontend hiển thị
  // trực tiếp (xem resolveDisplayValue), lệch khỏi kiểu lưu trong DB (chỉ là fileId) nên không còn
  // khớp kiểu generic thuần theo key nữa; kiểu chính xác đã được enforce ở validate INPUT (update()).
  value: unknown;
  updatedAt: Date;
}

// site_logo lưu DẠNG fileId (tham chiếu files.id, để cron dọn mồ côi không xoá nhầm — xem update() bên
// dưới), nhưng frontend cần `url` để hiển thị preview ngay — join thêm 1 lần tra cứu rẻ (theo khoá
// chính) thay vì bắt frontend tự gọi thêm API khác (hiện chưa có endpoint "lấy file theo id").
async function resolveDisplayValue(key: SettingKey, value: unknown): Promise<unknown> {
  if (key !== "site_logo" || typeof value !== "string") return value;
  const file = await prisma.file.findUnique({ where: { id: value }, select: { url: true } });
  return { fileId: value, url: file?.url ?? null };
}

export async function list(): Promise<SystemSettingDTO[]> {
  const rows = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  return Promise.all(
    rows.map(async (r) => ({
      key: r.key as SettingKey,
      value: await resolveDisplayValue(r.key as SettingKey, JSON.parse(r.value)),
      updatedAt: r.updatedAt,
    })),
  );
}

// Đọc 1 giá trị để nơi khác trong hệ thống dùng làm điều kiện nghiệp vụ (vd auth.service.ts đọc
// `registration_enabled` trước khi cho tạo tài khoản mới) — trả `undefined` nếu key chưa được seed,
// KHÔNG throw, để nơi gọi tự quyết định giá trị mặc định an toàn khi thiếu (xem auth.service.ts).
export async function getValue<K extends SettingKey>(
  key: K,
): Promise<SettingValue<K> | undefined> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row ? JSON.parse(row.value) : undefined;
}

export async function update(
  actorId: string,
  key: SettingKey,
  rawValue: unknown,
  ipAddress?: string,
): Promise<SystemSettingDTO> {
  const schema = SETTING_VALUE_SCHEMAS[key];
  const parsed = schema.safeParse(rawValue);
  if (!parsed.success) {
    throw new ValidationError({ value: parsed.error.issues[0]?.message ?? "Giá trị không hợp lệ" });
  }

  // site_logo tham chiếu tới `files.id` — đánh dấu tái sử dụng qua file_usages giống avatar/ảnh danh
  // mục (setEntityFile), nếu không thì cron dọn file mồ côi sau 24h sẽ xoá mất logo vừa upload vì
  // "trông như" không được dùng ở đâu cả. setEntityFile cũng tự validate fileId có tồn tại thật
  // (404 FILE_NOT_FOUND) — không cần kiểm tra lại ở đây.
  if (key === "site_logo") {
    if (parsed.data === null) {
      await filesService.clearEntityFile("system_setting", "site_logo");
    } else {
      await filesService.setEntityFile({
        fileId: parsed.data as string,
        entityType: "system_setting",
        entityId: "site_logo",
      });
    }
  }

  const before = await prisma.systemSetting.findUnique({ where: { key } });
  const encoded = JSON.stringify(parsed.data);
  const updated = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: encoded, updatedBy: actorId },
    update: { value: encoded, updatedBy: actorId },
  });

  await auditLog.record({
    actorId,
    action: "system_setting.update",
    entityType: "system_setting",
    entityId: key,
    before: before ? { value: JSON.parse(before.value) } : null,
    after: { value: parsed.data },
    ...(ipAddress && { ipAddress }),
  });

  return { key, value: await resolveDisplayValue(key, parsed.data), updatedAt: updated.updatedAt };
}
