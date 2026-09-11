import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import * as auditLog from "../audit-log/auditLog.service";

export async function list() {
  return prisma.loginMethodSetting.findMany({ orderBy: { method: "asc" } });
}

// Luôn phải còn >= 1 phương thức bật sau khi áp thay đổi — chặn ở service, không chỉ ở UI.
// Xem docs/07 §1, docs/modules/core-settings.md.
export async function update(
  actorId: string,
  method: string,
  isEnabled: boolean,
  ipAddress?: string,
) {
  const current = await prisma.loginMethodSetting.findMany();
  const target = current.find((m) => m.method === method);
  if (!target) throw new AppError("Phương thức đăng nhập không tồn tại", 404, "NOT_FOUND");

  const enabledAfterChange = current.filter((m) =>
    m.method === method ? isEnabled : m.isEnabled,
  ).length;
  if (enabledAfterChange < 1) {
    throw new AppError(
      "Phải luôn còn ít nhất 1 phương thức đăng nhập được bật",
      400,
      "AT_LEAST_ONE_LOGIN_METHOD_REQUIRED",
    );
  }

  const updated = await prisma.loginMethodSetting.update({
    where: { method },
    data: { isEnabled, updatedBy: actorId },
  });

  await auditLog.record({
    actorId,
    action: "login_method.toggle",
    entityType: "login_method_setting",
    entityId: method,
    before: { isEnabled: target.isEnabled },
    after: { isEnabled },
    ...(ipAddress && { ipAddress }),
  });

  return updated;
}
