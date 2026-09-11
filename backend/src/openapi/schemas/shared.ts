import { z } from "zod";
import { registry } from "../registry";

// Schema thực thể dùng lại ở NHIỀU module (vd File xuất hiện trong Products/Categories/Users/Folders)
// — tách riêng để không định nghĩa lại 4-5 lần. Mô tả RESPONSE (không phải input), viết tay dựa trên
// prisma/schema.prisma + sanitizeUser()/toàn bộ *.service.ts liên quan — có thể lệch nếu code đổi mà
// quên cập nhật, KHÔNG cùng mức đảm bảo "không thể lệch" như phần request (sinh trực tiếp từ chính
// zod schema của validate()). Xem ghi chú phạm vi ở docs/12 BE-12.
export const fileSchema = registry.register(
  "File",
  z
    .object({
      id: z.string().uuid(),
      url: z.string().url(),
      mimeType: z.string().openapi({ example: "image/jpeg" }),
      sizeBytes: z.number().int(),
      originalName: z.string(),
      folderId: z.string().uuid().nullable(),
      createdAt: z.string().datetime(),
    })
    .openapi("File"),
);

// SafeUser (auth.service.ts) — id/fullName/email/phone/avatarFileId/status/emailVerifiedAt +
// timestamps, KHÔNG bao giờ có passwordHash/failedLoginAttempts/lockedUntil.
export const safeUserSchema = registry.register(
  "SafeUser",
  z
    .object({
      id: z.string().uuid(),
      fullName: z.string(),
      email: z.string().email(),
      phone: z.string().nullable(),
      avatarFileId: z.string().uuid().nullable(),
      status: z.enum(["active", "blocked"]),
      emailVerifiedAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
      deletedAt: z.string().datetime().nullable(),
    })
    .openapi("SafeUser"),
);

export const permissionSchema = registry.register(
  "Permission",
  z
    .object({
      id: z.number().int(),
      code: z.string().openapi({ example: "products.manage" }),
      groupName: z.string().openapi({ example: "products" }),
      isSystem: z.boolean(),
      isRestricted: z.boolean(),
      description: z.string().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
    .openapi("Permission"),
);
