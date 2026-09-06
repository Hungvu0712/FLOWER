const prisma = require('../../../config/prisma');
const AppError = require('../../../lib/AppError');
const auditLog = require('../audit-log/auditLog.service');

async function list() {
  return prisma.loginMethodSetting.findMany({ orderBy: { method: 'asc' } });
}

// Luôn phải còn >= 1 phương thức bật sau khi áp thay đổi — chặn ở service, không chỉ ở UI.
// Xem SECURITY.md §1, README.md §2.3.
async function update(actorId, method, isEnabled, ipAddress) {
  const current = await prisma.loginMethodSetting.findMany();
  const target = current.find((m) => m.method === method);
  if (!target) throw new AppError('Phương thức đăng nhập không tồn tại', 404, 'NOT_FOUND');

  const enabledAfterChange = current.filter((m) => (m.method === method ? isEnabled : m.isEnabled)).length;
  if (enabledAfterChange < 1) {
    throw new AppError(
      'Phải luôn còn ít nhất 1 phương thức đăng nhập được bật',
      400,
      'AT_LEAST_ONE_LOGIN_METHOD_REQUIRED',
    );
  }

  const updated = await prisma.loginMethodSetting.update({
    where: { method },
    data: { isEnabled, updatedBy: actorId },
  });

  await auditLog.record({
    actorId,
    action: 'login_method.toggle',
    entityType: 'login_method_setting',
    entityId: method,
    before: { isEnabled: target.isEnabled },
    after: { isEnabled },
    ipAddress,
  });

  return updated;
}

module.exports = { list, update };
