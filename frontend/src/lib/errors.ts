import { AxiosError } from 'axios';

// Backend luôn trả lỗi dạng { success: false, message, code } (xem shared/response, shared/middleware/errorHandler.ts) —
// hàm này lấy đúng message đó thay vì hiện chung 1 câu chung chung cho mọi lỗi.
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
