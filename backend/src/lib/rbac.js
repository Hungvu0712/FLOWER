const prisma = require('../config/prisma');

// Load role code + permission code (flatten, unique) của 1 user — dùng để nhúng vào JWT payload
// và để authorize() middleware so khớp mà không cần query DB mỗi request.
async function loadUserRolesAndPermissions(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const roles = userRoles.map((ur) => ur.role.code);
  const permissionSet = new Set();
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      permissionSet.add(rp.permission.code);
    }
  }

  return { roles, permissions: [...permissionSet] };
}

module.exports = { loadUserRolesAndPermissions };
