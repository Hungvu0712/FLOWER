import { prisma } from "../../config/prisma";

export interface UserRolesAndPermissions {
  roles: string[];
  permissions: string[];
}

// Load role code + permission code (flatten, unique) của 1 user — nguồn sự thật duy nhất cho RBAC,
// gọi lại ở MỖI request qua authenticate middleware (không nhúng vào JWT) để đổi role trong DB có
// hiệu lực ngay. Cũng dùng cho GET /account/me để frontend hiển thị đúng role/permission hiện tại.
// Xem docs/02 §8.
export async function loadUserRolesAndPermissions(
  userId: string,
): Promise<UserRolesAndPermissions> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const roles = userRoles.map((ur) => ur.role.code);
  const permissionSet = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      permissionSet.add(rp.permission.code);
    }
  }

  return { roles, permissions: [...permissionSet] };
}
