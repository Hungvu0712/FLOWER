const prisma = require('../../../config/prisma');
const logger = require('../../../lib/logger');

// Ghi audit log là best-effort — lỗi ghi log không được làm rollback transaction nghiệp vụ chính.
// Xem SECURITY.md §2.
async function record({ actorId, action, entityType, entityId, before, after, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, entityType, entityId: String(entityId), before, after, ipAddress },
    });
  } catch (err) {
    logger.error('Ghi audit log thất bại:', err.message);
  }
}

async function list({ actorId, entityType, from, to, page = 1, pageSize = 20 }) {
  const where = {
    ...(actorId && { actorId }),
    ...(entityType && { entityType }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

module.exports = { record, list };
