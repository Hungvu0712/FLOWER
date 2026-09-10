# 09 · Môi trường & biến cấu hình

Ý nghĩa từng biến `.env`, cách lấy giá trị, và hệ quả khi cấu hình sai.

File mẫu có đầy đủ chú thích ngay tại chỗ:
- [`backend/.env.example`](../backend/.env.example)
- [`frontend/.env.local.example`](../frontend/.env.local.example)

---

## 1. Nguyên tắc

```mermaid
flowchart TD
    START([Khởi động backend]) --> ENV["src/config/env.ts<br/>đọc process.env"]
    ENV --> CHECK{"Đủ biến BẮT BUỘC?<br/>DATABASE_URL<br/>JWT_ACCESS_SECRET<br/>JWT_REFRESH_SECRET"}
    CHECK -->|Thiếu| FAIL["❌ throw ngay lúc khởi động<br/>'Missing required environment variable: X'<br/>Tiến trình DỪNG"]
    CHECK -->|Đủ| DEFAULT["Áp giá trị mặc định<br/>cho biến tuỳ chọn"]
    DEFAULT --> RUN([✅ Server chạy])

    style FAIL fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style RUN fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

**Fail-fast** (*hỏng sớm*): thiếu biến bắt buộc thì server **dừng ngay lúc khởi động** với thông điệp
rõ ràng, thay vì chạy được rồi lỗi mập mờ giữa chừng một request nào đó lúc 2 giờ sáng.

| Quy tắc | Chi tiết |
|---|---|
| **Không commit `.env`** | Đã có trong `.gitignore`. Chỉ commit `.env.example` |
| **Mỗi môi trường một bộ secret** | dev / staging / production dùng JWT secret, bucket R2, DB khác nhau |
| **`.env.example` luôn đủ mọi biến** | Kể cả biến tuỳ chọn — người mới không phải đọc code để biết có biến gì |
| **Đổi biến trong code → cập nhật `.env.example` ngay trong cùng PR** | Xem [11 · Quy trình §5](11-quy-trinh-phat-trien.md) |
| **Production dùng secret manager** | Doppler / Vault / AWS Secrets Manager / biến môi trường của nền tảng hosting — không phải file `.env` trên đĩa |

---

## 2. Backend — bảng tra nhanh

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|:---:|---|---|
| `DATABASE_URL` | ✅ | — | Chuỗi kết nối PostgreSQL |
| `NODE_ENV` | | `development` | Chi phối cookie `secure` và việc đăng ký cron |
| `PORT` | | `4000` | Cổng API |
| `FRONTEND_URL` | | `http://localhost:3000` | CORS whitelist + link trong email reset password |
| `LOG_LEVEL` | | `info` | `error` / `warn` / `info` / `debug` |
| `JWT_ACCESS_SECRET` | ✅ | — | Khoá ký access token |
| `JWT_REFRESH_SECRET` | ✅ | — | Khoá dự phòng (refresh hiện dùng token ngẫu nhiên) |
| `JWT_ACCESS_EXPIRES_IN` | | `5m` | Hạn access token |
| `JWT_REFRESH_EXPIRES_IN` | | `30d` | ⚠️ Hiện **chưa có tác dụng** — giá trị 30 ngày hard-code trong `config/env.ts` |
| `COOKIE_SECRET` | | `dev-only-secret` | Khoá ký cookie — **bắt buộc đổi ở production** |
| `GOOGLE_CLIENT_ID` | tính năng | `""` | `audience` khi verify Google ID token |
| `R2_ACCOUNT_ID` | tính năng | `""` | Dựng endpoint R2 |
| `R2_ACCESS_KEY_ID` | tính năng | `""` | 🔑 Secret |
| `R2_SECRET_ACCESS_KEY` | tính năng | `""` | 🔑 Secret |
| `R2_BUCKET` | tính năng | `""` | Tên bucket (ảnh **và** backup) |
| `R2_PUBLIC_URL` | tính năng | `""` | Tiền tố URL công khai của file |
| `EMAIL_PROVIDER` | | `smtp` | `resend` \| `smtp` |
| `EMAIL_FROM` | | `no-reply@example.com` | Địa chỉ người gửi |
| `RESEND_API_KEY` | tính năng | `""` | 🔑 Secret — khi `EMAIL_PROVIDER=resend` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | tính năng | `""` / `587` | 🔑 `SMTP_PASS` là secret |
| `MAGIC_LINK_TTL_MINUTES` | | `15` | Hạn magic link (phút) |
| `MAGIC_LINK_BASE_URL` | | `http://localhost:3000/magic-link/verify` | Trang frontend xử lý magic link |
| `PASSWORD_RESET_TTL_MINUTES` | | `30` | Hạn link đặt lại mật khẩu (phút) |
| `SUPER_ADMIN_EMAIL` | seed | `superadmin@example.com` | Tài khoản super_admin đầu tiên |
| `SUPER_ADMIN_PASSWORD` | seed | `ChangeMe123!` | ⚠️ **Bắt buộc đổi trước khi seed production** |

---

## 3. Hướng dẫn lấy giá trị

### 3.1. `DATABASE_URL`

| Môi trường | Cách lấy |
|---|---|
| **Dev (khuyến nghị)** | [neon.tech](https://neon.tech) → tạo project miễn phí → Dashboard → *Connection string* → chọn **Prisma** → copy |
| **Dev (local)** | Cài PostgreSQL → `postgresql://postgres:matkhau@localhost:5432/flower` |
| **Production VPS** | Tạo **user riêng cho ứng dụng** với quyền tối thiểu — **không** dùng user `postgres`/superuser |

Managed Postgres (Neon, Supabase, Railway) hầu hết bắt buộc `?sslmode=require` ở cuối chuỗi.

> **Lỗi thường gặp**: `P1001 Can't reach database server` = sai chuỗi kết nối, hoặc Neon free tier đang
> *sleep* (lần gọi đầu mất vài giây để đánh thức).

### 3.2. JWT & Cookie secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Chạy **3 lần** để có 3 giá trị khác nhau cho `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`.

| Hệ quả khi làm sai | Chi tiết |
|---|---|
| Dùng chung secret giữa dev và production | Token sinh ở dev dùng được ở production — lỗ hổng nghiêm trọng |
| Đổi `JWT_ACCESS_SECRET` ở production | Mọi access token đang lưu hành bị vô hiệu — người dùng bị đăng xuất hàng loạt (dùng có chủ đích khi cần thu hồi khẩn cấp) |
| Để `COOKIE_SECRET` mặc định ở production | Cookie có chữ ký bị giả mạo được |

### 3.3. `GOOGLE_CLIENT_ID`

```mermaid
flowchart LR
    A["console.cloud.google.com<br/>tạo project"] --> B["APIs & Services<br/>→ OAuth consent screen"]
    B --> C["Credentials → Create<br/>OAuth client ID<br/>loại: Web application"]
    C --> D["Authorized JavaScript origins:<br/>http://localhost:3000<br/>https://domain-that.vn"]
    D --> E["Copy Client ID<br/>xxxxx.apps.googleusercontent.com"]
    E --> F1["backend/.env<br/>GOOGLE_CLIENT_ID"]
    E --> F2["frontend/.env.local<br/>NEXT_PUBLIC_GOOGLE_CLIENT_ID"]

    style F1 fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    style F2 fill:#fce7f3,stroke:#be185d,stroke-width:2px,color:#831843
```

- **Hai giá trị phải giống hệt nhau.** Backend verify ID token với `audience = GOOGLE_CLIENT_ID`;
  lệch nhau → mọi lần đăng nhập Google đều trả `401 INVALID_GOOGLE_TOKEN`.
- **Không cần Client Secret** — dự án verify *ID token*, không dùng luồng redirect.
- Client ID là thông tin **công khai** theo thiết kế của Google, an toàn khi nhúng vào bundle frontend.

### 3.4. Cloudflare R2

```mermaid
flowchart TD
    A["dash.cloudflare.com → R2"] --> B["Create bucket<br/>flower-dev / flower-staging / flower-prod"]
    B --> C["Manage R2 API Tokens<br/>→ Create API Token<br/>quyền: Object Read & Write"]
    C --> D["Copy Access Key ID<br/>+ Secret Access Key<br/>⚠️ secret chỉ hiện MỘT LẦN"]
    B --> E["Bucket → Settings<br/>→ Public Development URL<br/>hoặc gắn custom domain"]
    A --> F["Account ID: góc phải Dashboard<br/>hoặc trong URL"]

    D --> ENV["R2_ACCESS_KEY_ID<br/>R2_SECRET_ACCESS_KEY"]
    E --> ENV2["R2_PUBLIC_URL<br/>(không có / ở cuối)"]
    F --> ENV3["R2_ACCOUNT_ID"]
    B --> ENV4["R2_BUCKET"]

    style D fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
```

> **Tách bucket theo môi trường.** Dev và production dùng chung bucket là công thức để một lượt
> `cleanupOrphanFiles` ở dev xoá mất ảnh production.
>
> Bucket này chứa **cả ảnh lẫn backup database** (prefix `backups/`). Với production, cân nhắc
> bucket riêng cho backup với quyền chặt hơn — xem [07 · Bảo mật §5](07-bao-mat.md).

### 3.5. Email

```mermaid
flowchart TD
    Q{"Đã sở hữu domain riêng<br/>và cấu hình được DNS?"}
    Q -->|Có| RESEND["EMAIL_PROVIDER=resend"]
    Q -->|Chưa| SMTP["EMAIL_PROVIDER=smtp"]

    RESEND --> R1["resend.com → Domains → Add Domain"]
    R1 --> R2["Thêm bản ghi SPF · DKIM · DMARC<br/>vào DNS của domain"]
    R2 --> R3["Chờ verify (vài phút → vài giờ)"]
    R3 --> R4["API Keys → Create → re_xxxxx<br/>→ RESEND_API_KEY"]
    R4 --> R5["EMAIL_FROM phải dùng<br/>ĐÚNG domain đã verify"]

    SMTP --> S1["Gmail: bật xác minh 2 bước"]
    S1 --> S2["myaccount.google.com/apppasswords<br/>tạo App Password 16 ký tự"]
    S2 --> S3["SMTP_HOST=smtp.gmail.com<br/>SMTP_PORT=587<br/>SMTP_USER=email của bạn<br/>SMTP_PASS=App Password"]
    S3 --> S4["⚠️ Dễ vào spam<br/>⚠️ Giới hạn ~500 email/ngày"]

    style R5 fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style S4 fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
```

| Điểm dễ sai | Hậu quả |
|---|---|
| Dùng `EMAIL_FROM` với domain **chưa verify** trên Resend | Mọi email bị từ chối (`email_logs.status = failed`) |
| Dùng mật khẩu Gmail thường thay vì **App Password** | SMTP xác thực thất bại |
| Không dùng App Password vì chưa bật xác minh 2 bước | Google không cho tạo App Password |

**Cách kiểm tra khi khách báo không nhận được email**: xem bảng `email_logs`
(`status`, `error`, `sent_at`) — mọi lần gửi đều được ghi lại, kể cả thất bại.

### 3.6. `FRONTEND_URL` ↔ `NEXT_PUBLIC_API_URL`

Hai biến này là **hai chiều của cùng một kết nối**, dễ cấu hình lệch:

```mermaid
flowchart LR
    FE["Frontend<br/>https://hoaxinh.vn"] -->|"gọi API tới<br/>NEXT_PUBLIC_API_URL"| BE["Backend<br/>https://api.hoaxinh.vn"]
    BE -->|"CORS chỉ chấp nhận origin<br/>FRONTEND_URL"| FE

    style FE fill:#fce7f3,stroke:#be185d,stroke-width:2px,color:#831843
    style BE fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
```

| Môi trường | `FRONTEND_URL` (backend) | `NEXT_PUBLIC_API_URL` (frontend) |
|---|---|---|
| Dev | `http://localhost:3000` | `http://localhost:4000` |
| Staging | `https://staging.hoaxinh.vn` | `https://api-staging.hoaxinh.vn` |
| Production | `https://hoaxinh.vn` | `https://api.hoaxinh.vn` |

> `NEXT_PUBLIC_API_URL` **không** bao gồm `/api/v1` — frontend tự nối tiền tố đó vào từng lời gọi.
>
> Sai `FRONTEND_URL` → trình duyệt báo lỗi CORS và **cookie không được gửi kèm**, biểu hiện là
> "đăng nhập xong bị đăng xuất ngay".

---

## 4. Frontend — lưu ý về `NEXT_PUBLIC_`

```mermaid
flowchart TD
    A["Biến trong .env.local"] --> B{"Tên bắt đầu bằng<br/>NEXT_PUBLIC_ ?"}
    B -->|Có| C["🌐 NHÚNG VÀO BUNDLE JAVASCRIPT<br/>gửi tới mọi trình duyệt<br/>Ai mở DevTools cũng đọc được"]
    B -->|Không| D["🔒 Chỉ dùng được ở phía server<br/>(Server Component, Route Handler)"]

    C --> E["✅ Được: API URL, Google Client ID,<br/>khoá công khai, feature flag"]
    C --> F["❌ TUYỆT ĐỐI KHÔNG:<br/>API key riêng, mật khẩu,<br/>JWT secret, DB URL"]

    style C fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style F fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style D fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

Giá trị `NEXT_PUBLIC_*` được **thay thế lúc build**, không phải lúc chạy — đổi biến thì phải
**build lại**, restart không đủ.

---

## 5. Bảng cấu hình theo môi trường

| Biến | Development | Staging | Production |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | `production` |
| `DATABASE_URL` | Neon (branch dev) | Neon (branch staging) | Neon prod / VPS Postgres |
| `FRONTEND_URL` | `http://localhost:3000` | `https://staging.…` | `https://hoaxinh.vn` |
| `LOG_LEVEL` | `debug` | `info` | `info` |
| JWT/Cookie secret | Giá trị dev | **Khác dev** | **Khác staging** |
| `R2_BUCKET` | `flower-dev` | `flower-staging` | `flower-prod` |
| `EMAIL_PROVIDER` | `smtp` | `resend` | `resend` |
| `SUPER_ADMIN_PASSWORD` | Tuỳ ý | Mạnh | **Mạnh + đổi ngay sau seed** |
| Cron jobs | ❌ không chạy | ✅ chạy | ✅ chạy |
| Cookie `secure` | ❌ (cho phép http) | ✅ | ✅ |

> Cron **chỉ đăng ký khi `NODE_ENV=production`** (`server.ts`). Muốn thử backup/dọn file ở dev,
> tạm đặt `NODE_ENV=production` — nhưng nhớ trỏ `DATABASE_URL`/`R2_BUCKET` vào tài nguyên dev.

---

## 6. Xử lý sự cố cấu hình

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `Missing required environment variable: X` | Thiếu biến bắt buộc | Copy lại từ `.env.example`, điền `X` |
| `P1001 Can't reach database server` | Sai `DATABASE_URL`, thiếu `sslmode=require`, hoặc Neon đang sleep | Kiểm tra chuỗi kết nối, thử lại sau vài giây |
| Lỗi CORS trên trình duyệt | `FRONTEND_URL` ≠ origin thật của frontend | Sửa `FRONTEND_URL` cho khớp chính xác (kể cả cổng) |
| Đăng nhập xong bị đăng xuất ngay | Cookie không được gửi kèm | Kiểm tra `FRONTEND_URL` + `NEXT_PUBLIC_API_URL`; ở production phải dùng HTTPS vì cookie `secure` |
| `401 INVALID_GOOGLE_TOKEN` | `GOOGLE_CLIENT_ID` hai bên lệch nhau | Đặt lại cho giống hệt, build lại frontend |
| Email không tới | Chưa cấu hình / domain chưa verify | Kiểm tra `email_logs.error` |
| Ảnh upload xong không hiển thị | `R2_PUBLIC_URL` sai hoặc bucket chưa mở public | Kiểm tra URL trong bản ghi `files.url` |
| `pg_dump: command not found` | Thiếu binary trên máy chạy cron | Cài `postgresql-client` (chỉ ảnh hưởng production) |
| Đổi `NEXT_PUBLIC_*` mà không có tác dụng | Giá trị nhúng lúc build | Build lại frontend, không chỉ restart |
