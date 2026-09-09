import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { logger } from "../../../shared/logger/logger";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";

interface RecordAuditInput {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string | number;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}

// Ghi audit log là best-effort — lỗi ghi log không được làm rollback transaction nghiệp vụ chính.
// Xem docs/07 §2.
export async function record(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ...(input.actorId && { actorId: input.actorId }),
        action: input.action,
        entityType: input.entityType,
        entityId: String(input.entityId),
        ...(input.before !== undefined && {
          before: input.before as Prisma.InputJsonValue,
        }),
        ...(input.after !== undefined && {
          after: input.after as Prisma.InputJsonValue,
        }),
        ...(input.ipAddress && { ipAddress: input.ipAddress }),
      },
    });
  } catch (err) {
    logger.error(
      "Ghi audit log thất bại:",
      err instanceof Error ? err.message : err,
    );
  }
}

interface ListAuditParams {
  actorId?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export async function list({
  actorId,
  entityType,
  from,
  to,
  page,
  limit,
}: ListAuditParams) {
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
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}
