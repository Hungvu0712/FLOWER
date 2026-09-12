import { prisma } from "../config/prisma";
import { logger } from "../shared/logger/logger";
import { emailService } from "../modules/core/email/email.service";
import { specialDateReminderTemplate } from "../modules/core/email/email.templates";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Luôn tính bằng UTC — giống orders.service.ts (deliveryDate) và specialDates.service.ts — tránh
// lệch ngày do múi giờ server (Asia/Saigon, UTC+7).
function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Ngày dịp lễ (chỉ tháng-ngày của `date`) SẮP TỚI gần nhất tính từ `today` — năm nay nếu chưa qua
// trong năm nay, năm sau nếu đã qua. Cạm bẫy đã biết: 29/2 ở năm không nhuận sẽ lùi thành 1/3 (Date.UTC
// tự cuộn qua) — chấp nhận được, hiếm gặp, chưa xử lý riêng cho MVP này.
function nextOccurrence(date: Date, today: Date): Date {
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const thisYear = new Date(Date.UTC(today.getUTCFullYear(), month, day));
  return thisYear >= today ? thisYear : new Date(Date.UTC(today.getUTCFullYear() + 1, month, day));
}

// Chạy hằng ngày (xem jobs/index.ts) — với mỗi `special_dates`, nhắc đúng vào ngày
// (ngày dịp lễ sắp tới - remindDaysBefore) == hôm nay. `lastRemindedYear` chống gửi trùng nếu job
// chạy bù nhiều lần trong đúng ngày cần nhắc (vd server restart) — xem docs/modules/domain-special-dates.md.
export async function sendSpecialDateReminders(): Promise<void> {
  const today = todayUtcMidnight();

  const specialDates = await prisma.specialDate.findMany({
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });

  let sentCount = 0;
  for (const sd of specialDates) {
    const occurrence = nextOccurrence(sd.date, today);
    const remindOn = new Date(occurrence.getTime() - sd.remindDaysBefore * MS_PER_DAY);
    if (remindOn.getTime() !== today.getTime()) continue;

    const occurrenceYear = occurrence.getUTCFullYear();
    if (sd.lastRemindedYear === occurrenceYear) continue; // đã nhắc cho lượt dịp này rồi

    await emailService
      .sendEmail({
        to: sd.user.email,
        subject: `Nhắc lịch: ${sd.label}`,
        html: specialDateReminderTemplate({
          fullName: sd.user.fullName,
          label: sd.label,
          daysBefore: sd.remindDaysBefore,
        }),
        type: "special_date_reminder",
      })
      .catch(() => {}); // gửi email là best-effort, không chặn cập nhật lastRemindedYear ở dưới

    await prisma.specialDate.update({
      where: { id: sd.id },
      data: { lastRemindedYear: occurrenceYear },
    });
    sentCount++;
  }

  logger.info(
    `[sendSpecialDateReminders] Đã gửi ${sentCount}/${specialDates.length} email nhắc lịch sinh nhật/kỷ niệm.`,
  );
}
