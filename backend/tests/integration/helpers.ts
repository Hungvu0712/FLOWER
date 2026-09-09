import { signAccessToken } from "@/shared/utils/jwt";
import { db } from "../mocks/prisma.mock";


/**
 * Giả lập một người dùng đã đăng nhập cho test integration: trả về cookie access_token hợp lệ và
 * mớm sẵn kết quả cho `loadUserRolesAndPermissions` (authenticate middleware luôn tra DB mỗi request).
 */
export function loginAs(userId: string, roles: string[], permissions: string[]): string[] {
  db.userRole.findMany.mockResolvedValue(
    roles.map((code) => ({
      role: { code, permissions: permissions.map((p) => ({ permission: { code: p } })) },
    })),
  );
  return [`access_token=${signAccessToken({ sub: userId })}`];
}

export const SUPER_ADMIN_PERMISSIONS = [
  "users.manage",
  "settings.manage",
  "roles.manage",
  "permissions.manage",
  "files.manage",
  "audit.view",
  "categories.manage",
];

export { db };
