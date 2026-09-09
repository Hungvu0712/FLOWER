// Chuyen ten tieng Viet co dau thanh slug URL-safe - dung chung cho moi module domain can slug
// (categories, products, blog...). Dung ma so Unicode (khong go thang ky tu dac biet trong source)
// de tranh rui ro hong encoding qua cac tool chinh sua file trung gian.
const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;
const D_STROKE_LOWER = 0x0111; // chu "d gach ngang" thuong
const D_STROKE_UPPER = 0x0110; // chu "d gach ngang" hoa

function stripDiacritics(value: string): string {
  return Array.from(value.normalize('NFD'))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < COMBINING_MARK_START || code > COMBINING_MARK_END;
    })
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code === D_STROKE_LOWER) return 'd';
      if (code === D_STROKE_UPPER) return 'D';
      return ch;
    })
    .join('');
}

export function slugify(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
