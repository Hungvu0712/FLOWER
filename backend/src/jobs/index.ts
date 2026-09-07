import cron from 'node-cron';
import { logger } from '../core/logger/logger';
import { cleanupOrphanFiles } from './cleanupOrphanFiles.job';
import { backupDatabase, cleanupOldBackups } from './backupDatabase.job';

// Lưu ý: cú pháp cron 5 trường không diễn tả được "mỗi N ngày" liên tục xuyên tháng — dùng
// `*/N` trên trường ngày-trong-tháng là xấp xỉ đủ tốt cho boilerplate (đếm lại từ ngày 1 mỗi tháng).
// Nếu cần chính xác tuyệt đối, thay bằng lịch chạy hằng ngày + so sánh timestamp lần chạy trước trong DB.
export function registerJobs(): void {
  cron.schedule('0 3 */2 * *', () => backupDatabase()); // ~2 ngày/lần — DATABASE.md §3, SECURITY.md §5
  cron.schedule('30 3 */2 * *', () => cleanupOldBackups()); // dọn backup > 30 ngày, chạy ngay sau backup
  cron.schedule('0 4 */10 * *', () => cleanupOrphanFiles()); // 10 ngày/lần — DATABASE.md §3.3

  logger.info('Cron jobs đã đăng ký: backupDatabase, cleanupOldBackups, cleanupOrphanFiles');
}
