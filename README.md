# 🌸 FLOWER — Website bán hoa trực tuyến (Hoa Xinh)

Website thương mại điện tử bán hoa tươi, cho phép khách đặt hoa và **chọn chính xác ngày giờ giao** —
điểm khác biệt cốt lõi so với thương mại điện tử thông thường.

Đồng thời là **source base tái sử dụng** cho các dự án PERN
(**P**ostgreSQL · **E**xpress · **R**eact · **N**ode) khác.

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript strict · TailwindCSS 4 |
| **Backend** | Node.js · Express 4 · TypeScript strict · Prisma 5 · Zod |
| **Database** | PostgreSQL (Neon khi dev · VPS + Docker khi scale) |
| **Lưu trữ file** | Cloudinary (upload trực tiếp từ trình duyệt bằng chữ ký HMAC) |
| **Email** | Resend (production) · Nodemailer + SMTP (fallback) |
| **Kiểm thử** | Vitest · Supertest · Testing Library · Playwright |

---

## 📚 Tài liệu

**Toàn bộ tài liệu nằm trong [`docs/`](docs/)** — đánh số theo thứ tự nên đọc.

| Bạn là ai | Bắt đầu từ |
|---|---|
| 👨‍💻 **Dev mới tiếp quản dự án** | [`docs/README.md`](docs/README.md) — lộ trình đọc đầy đủ |
| 🚀 **Muốn chạy dự án ngay** | [`docs/00-bat-dau.md`](docs/00-bat-dau.md) — ~30 phút |
| 🏗️ **Muốn hiểu kiến trúc** | [`docs/02-kien-truc-tong-quan.md`](docs/02-kien-truc-tong-quan.md) |
| 🤖 **AI assistant (Claude Code)** | [`CLAUDE.md`](CLAUDE.md) — quy ước làm việc |
| 📊 **Muốn biết tiến độ** | [`CHECKLIST.md`](CHECKLIST.md) |
| 🤝 **Khách hàng / bên liên quan** | [`docs/gitbook/`](docs/gitbook/) — tiến độ, ước lượng, rủi ro |

---

## ⚡ Chạy nhanh

```bash
# Backend — cần Node 20+ và một PostgreSQL (khuyến nghị Neon, có gói miễn phí)
cd backend
npm install
cp .env.example .env          # điền DATABASE_URL + 2 JWT secret — xem hướng dẫn ngay trong file
npx prisma migrate dev
npm run seed:core && npm run seed:domain
npm run dev                   # → http://localhost:4000

# Frontend
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                   # → http://localhost:3000
```

Đăng nhập bằng tài khoản seed: `superadmin@example.com` / `ChangeMe123!` — **đổi mật khẩu ngay**.

Gặp lỗi? Xem bảng xử lý sự cố ở [`docs/00-bat-dau.md §7`](docs/00-bat-dau.md).

---

## 🧪 Kiểm thử

```bash
cd backend  && npm test     # 334 test — KHÔNG cần database
cd frontend && npm test     # 101 test
cd frontend && npm run test:e2e   # ~30 kịch bản Playwright — cần BE + FE + DB thật
```

Chi tiết: [`docs/08-kiem-thu.md`](docs/08-kiem-thu.md).

---

## 🗂️ Cấu trúc repository

```
FLOWER/
├── CLAUDE.md              # quy ước làm việc (AI + dev)
├── CHECKLIST.md           # theo dõi tiến độ — cập nhật mỗi PR
├── .gitbook.yaml          # cấu hình sync docs/gitbook/ → GitBook
│
├── docs/                  # 📚 TOÀN BỘ tài liệu
│   ├── 00 → 12            #    tài liệu kỹ thuật, đánh số theo thứ tự đọc
│   ├── modules/           #    chi tiết từng module (7 file)
│   └── gitbook/           #    tài liệu cho khách hàng (7 trang)
│
├── backend/               # Express API — xem docs/03-backend.md
│   ├── src/
│   │   ├── shared/        # 🔧 hạ tầng: errors · middleware · response · logger · utils
│   │   ├── modules/core/  # 🔧 auth · users · roles · permissions · settings · files · email · audit-log
│   │   ├── modules/domain/# 🌸 categories (+ products, orders... sẽ thêm)
│   │   ├── routes/v1/     #    gom router → /api/v1/*
│   │   └── jobs/          # 🔧 cron: backup DB · dọn file mồ côi
│   ├── prisma/            #    schema (core nửa trên, domain nửa dưới) + seed
│   └── tests/             #    unit + integration
│
├── frontend/              # Next.js — xem docs/04-frontend.md
│   ├── src/
│   │   ├── app/           #    App Router: (storefront) (auth) (dashboard) account 403
│   │   ├── features/      #    core/ + domain/ — mỗi feature = service + hooks
│   │   ├── components/    #    ui/ layout/ admin/ shell/
│   │   ├── lib/ store/    #    axios · jwt · errors · zustand
│   │   └── proxy.ts       #    chặn route sớm (Next.js 16, tên cũ: middleware.ts)
│   ├── tests/             #    unit + component
│   └── e2e/               #    Playwright
│
└── scripts/               # công cụ phụ trợ (kiểm tra cú pháp Mermaid)
```

### 🔧 Core vs 🌸 Domain

Đây là quyết định kiến trúc quan trọng nhất của repo:

| | Định nghĩa | Ví dụ |
|---|---|---|
| 🔧 **Core** | Không phụ thuộc nghiệp vụ — **copy nguyên** khi sang dự án PERN khác | Auth, RBAC, files, email, audit log, settings |
| 🌸 **Domain** | Đặc thù shop hoa — viết mới cho từng dự án | Categories, products, cart, orders, payments |

Bắt đầu dự án mới = copy phần core, xoá phần domain, đổi `.env`.
**Không dòng code core nào phải sửa.** Chi tiết: [`docs/02 §2`](docs/02-kien-truc-tong-quan.md).

---

## 📈 Trạng thái

| Phase | Nội dung | Trạng thái |
|:---:|---|:---:|
| 1–3 | Foundation · Authentication · RBAC | ✅ |
| 4 | Infrastructure (Cloudinary, email, jobs) | 🟡 80% |
| 5 | Domain — nghiệp vụ shop hoa | 🟡 10% |
| 6 | Quality — testing, tài liệu | 🟡 60% |
| 7 | Production — Docker, CI/CD, monitoring | ⬜ |

**Tổng thể ~40%.** Chi tiết từng hạng mục + nợ kỹ thuật: [`CHECKLIST.md`](CHECKLIST.md).

> ⚠️ **Trước khi mở cho người dùng thật**: còn 6 hạng mục 🔴 bắt buộc (~11 giờ) liên quan tới bảo mật
> phiên đăng nhập — xem [`docs/12-danh-gia-va-de-xuat.md §2`](docs/12-danh-gia-va-de-xuat.md).

---

## 🤝 Đóng góp

Đọc [`CLAUDE.md`](CLAUDE.md) trước. Tóm tắt:

- Tài liệu và comment viết bằng **tiếng Việt**, giữ nguyên thuật ngữ kỹ thuật tiếng Anh kèm chú thích
- Sơ đồ **luôn dùng Mermaid**, theo bảng màu chuẩn (tương thích dark mode)
- Mọi thay đổi logic phải có **test**
- Trước khi commit: `npm run lint && npm run typecheck && npm test` ở cả hai bên
