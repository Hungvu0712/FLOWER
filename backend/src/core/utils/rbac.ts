import { prisma } from '../../config/prisma';

export interface UserRolesAndPermissions {
  roles: string[];
  permissions: string[];
}

// Load role code + permission code (flatten, unique) của 1 user — dùng để nhúng vào JWT payload
// và để authorize() middleware so khớp mà không cần query DB mỗi request.
export async function loadUserRolesAndPermissions(userId: string): Promise<UserRolesAndPermissions> {
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
