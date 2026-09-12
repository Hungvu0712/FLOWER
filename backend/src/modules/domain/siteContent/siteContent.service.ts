import { prisma } from "../../../config/prisma";
import { ValidationError } from "../../../shared/errors";
import * as auditLog from "../../core/audit-log/auditLog.service";
import * as filesService from "../../core/files/files.service";
import {
  SITE_CONTENT_KEYS,
  SITE_CONTENT_VALUE_SCHEMAS,
  type SiteContentKey,
  type SiteContentValue,
} from "./siteContent.validation";

export interface SiteContentDTO {
  key: SiteContentKey;
  // `unknown` — hero_banner được LÀM GIÀU thêm `url` (xem resolveDisplayValue), lệch khỏi kiểu lưu
  // trong DB (chỉ là fileId) nên không còn khớp kiểu generic thuần theo key — giống systemSettings.service.ts.
  value: unknown;
  updatedAt: Date;
}

// hero_banner lưu DẠNG fileId (tham chiếu files.id) nhưng frontend cần `url` để hiển thị ngay — join
// thêm 1 lần tra cứu rẻ, đúng pattern site_logo ở systemSettings.service.ts.
async function resolveDisplayValue(key: SiteContentKey, value: unknown): Promise<unknown> {
  if (key !== "hero_banner" || typeof value !== "string") return value;
  const file = await prisma.file.findUnique({ where: { id: value }, select: { url: true } });
  return { fileId: value, url: file?.url ?? null };
}

export async function list(): Promise<SiteContentDTO[]> {
  // Cùng dùng chung bảng system_settings với module core/settings — lọc theo đúng key-set của module
  // này để không lỡ trả lẫn site_name/site_logo/timezone/registration_enabled ra route public.
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...SITE_CONTENT_KEYS] } },
    orderBy: { key: "asc" },
  });
  return Promise.all(
    rows.map(async (r) => ({
      key: r.key as SiteContentKey,
      value: await resolveDisplayValue(r.key as SiteContentKey, JSON.parse(r.value)),
      updatedAt: r.updatedAt,
    })),
  );
}

export async function update(
  actorId: string,
  key: SiteContentKey,
  rawValue: unknown,
  ipAddress?: string,
): Promise<SiteContentDTO> {
  const schema = SITE_CONTENT_VALUE_SCHEMAS[key];
  const parsed = schema.safeParse(rawValue);
  if (!parsed.success) {
    throw new ValidationError({ value: parsed.error.issues[0]?.message ?? "Giá trị không hợp lệ" });
  }

  // hero_banner tham chiếu tới files.id — đánh dấu tái sử dụng qua file_usages (setEntityFile), nếu
  // không thì cron dọn file mồ côi sẽ xoá mất banner vừa upload vì "trông như" không được dùng ở đâu.
  if (key === "hero_banner") {
    if (parsed.data === null) {
      await filesService.clearEntityFile("site_content", "hero_banner");
    } else {
      await filesService.setEntityFile({
        fileId: parsed.data as string,
        entityType: "site_content",
        entityId: "hero_banner",
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
    action: "site_content.update",
    entityType: "site_content",
    entityId: key,
    before: before ? { value: JSON.parse(before.value) } : null,
    after: { value: parsed.data },
    ...(ipAddress && { ipAddress }),
  });

  return { key, value: await resolveDisplayValue(key, parsed.data), updatedAt: updated.updatedAt };
}

export type { SiteContentKey, SiteContentValue };
