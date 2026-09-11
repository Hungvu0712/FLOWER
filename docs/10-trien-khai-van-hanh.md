# 10 · Triển khai & vận hành

Từ máy dev tới production: các môi trường, cách triển khai, CI/CD, backup, giám sát và xử lý sự cố.

Đọc kèm: [09 · Môi trường & biến cấu hình](09-moi-truong-va-bien-cau-hinh.md) ·
[07 · Bảo mật §8](07-bao-mat.md).

> **Trạng thái**: hiện dự án mới chạy ở **development**. Phần staging/production dưới đây là
> **thiết kế đề xuất** kèm cấu hình mẫu đã kiểm chứng về mặt cú pháp, chưa triển khai thật.
> Theo dõi tiến độ ở [`CHECKLIST.md`](../CHECKLIST.md) mục *Phase 7*.

---

## 1. Ba môi trường

```mermaid
flowchart LR
    subgraph DEV["🖥️ Development"]
        D1["FE: next dev :3000<br/>BE: tsx watch :4000"]
        D2[("Neon<br/>branch dev")]
        D3["Cloudinary flower-dev"]
        D4["Email: SMTP"]
        D5["❌ Cron TẮT"]
    end

    subgraph STG["🧪 Staging"]
        S1["FE: Vercel preview<br/>BE: Render/Railway"]
        S2[("Neon<br/>branch staging")]
        S3["Cloudinary flower-staging"]
        S4["Email: Resend"]
        S5["✅ Cron BẬT"]
    end

    subgraph PRD["🚀 Production"]
        P1["FE: Vercel<br/>BE: VPS + Docker"]
        P2[("Postgres<br/>VPS/Neon prod")]
        P3["Cloudinary flower-prod"]
        P4["Email: Resend"]
        P5["✅ Cron + Backup"]
    end

    DEV -->|"merge → main"| STG
    STG -->|"tag release"| PRD

    style DEV fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style STG fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style PRD fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
```

| | Development | Staging | Production |
|---|---|---|---|
| **Mục đích** | Viết code | Nghiệm thu, demo cho khách | Người dùng thật |
| **Frontend** | `next dev` local | Vercel (preview) | Vercel hoặc VPS |
| **Backend** | `tsx watch` local | Render / Railway | VPS + Docker + reverse proxy |
| **Database** | Neon branch dev | Neon branch staging | Neon prod hoặc Postgres tự quản lý |
| **Dữ liệu** | Seed + rác test | Giống production về cấu trúc, dữ liệu giả | Dữ liệu thật |
| **Cron** | ❌ | ✅ | ✅ + backup |
| **Ai truy cập** | Dev | Dev + khách hàng | Công khai |

---

## 2. Development

Xem [00 · Bắt đầu](00-bat-dau.md). Tóm tắt:

```bash
# Terminal 1
cd backend && npm run dev      # :4000

# Terminal 2
cd frontend && npm run dev     # :3000
```

Không cần Docker. Database dùng Neon (cloud), file dùng Cloudinary (cloud).

---

## 3. Chuẩn bị trước khi lên production

Checklist bắt buộc — **không bỏ qua mục nào**:

- [ ] **Secret riêng cho production**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`
      sinh mới, khác hoàn toàn dev/staging
- [ ] `NODE_ENV=production` (bật cookie `secure`) + `RUN_JOBS=true` trên **đúng 1 instance/worker**
      (bật cron — xem [docs/09 §5](09-moi-truong-va-bien-cau-hinh.md), `OPS-01`)
- [ ] `FRONTEND_URL` trỏ đúng domain thật (HTTPS)
- [ ] `NEXT_PUBLIC_API_URL` trỏ đúng API thật (HTTPS) — và **build lại** frontend sau khi đổi
- [ ] Tài khoản/folder Cloudinary riêng cho production
- [ ] `EMAIL_PROVIDER=resend` + domain đã verify DKIM/SPF/DMARC
- [ ] `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` đặt giá trị thật **trước** khi seed
- [ ] Đăng nhập lần đầu bằng super_admin và **đổi mật khẩu ngay**
- [ ] HTTPS + HSTS + redirect HTTP → HTTPS ở reverse proxy
- [ ] Database user riêng cho ứng dụng (không phải superuser), cổng DB không mở ra internet
- [ ] `pg_dump` có sẵn trong PATH của tiến trình chạy cron
- [ ] Kiểm chứng backup **và thử khôi phục** ít nhất một lần
- [ ] Giám sát `/health` bằng uptime monitor
- [ ] `npm run lint && npm run typecheck && npm test` xanh ở cả hai bên

---

## 4. Triển khai — phương án A: nền tảng quản lý (nhanh nhất)

Phù hợp giai đoạn đầu, ít lưu lượng, không muốn quản trị máy chủ.

```mermaid
flowchart LR
    U[Người dùng] --> V["Vercel<br/>Next.js frontend"]
    V -->|"/api/v1/*"| R["Render / Railway<br/>Express backend"]
    R --> N[("Neon Postgres")]
    R --> CD[("Cloudinary")]
    R --> RS["Resend"]

    style V fill:#fce7f3,stroke:#be185d,stroke-width:2px,color:#831843
    style R fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
```

**Frontend (Vercel)**

```
Framework Preset : Next.js
Root Directory   : frontend
Build Command    : npm run build
Environment      : NEXT_PUBLIC_API_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

**Backend (Render / Railway)**

```
Root Directory   : backend
Build Command    : npm ci && npx prisma generate && npm run build
Start Command    : npx prisma migrate deploy && npm start
Health Check     : /health
Environment      : toàn bộ biến ở docs/09 (dùng phần Secrets của nền tảng)
                    + RUN_JOBS=true (chỉ 1 instance — xem OPS-01, docs/09 §5)
```

> Nền tảng cho scale tự động lên **nhiều instance** khi tải cao — nếu bật scale, đổi `RUN_JOBS=true`
> chỉ ở **một** instance cố định (không để scale tự động nhân bản nó), hoặc tách một service cron
> riêng chạy `RUN_JOBS=true` cùng image nhưng không nhận traffic, hoặc chuyển sang phương án B.

> `prisma migrate deploy` (không phải `migrate dev`) — chỉ **áp** migration đã commit, không tự sinh
> migration mới và không hỏi tương tác.

**Ưu / nhược**

| Ưu | Nhược |
|---|---|
| Triển khai trong ~30 phút | Chi phí tăng nhanh khi lưu lượng lớn |
| Tự động HTTPS, tự động scale | Ít kiểm soát hạ tầng |
| Không phải quản trị máy chủ | Cold start ở gói miễn phí (cron có thể không chạy đúng giờ) |

---

## 5. Triển khai — phương án B: VPS + Docker (khi scale)

```mermaid
flowchart TB
    U[Người dùng] -->|HTTPS 443| CADDY["Caddy / Nginx<br/>reverse proxy + TLS"]
    CADDY -->|"hoaxinh.vn"| FE["Container: frontend<br/>next start :3000"]
    CADDY -->|"api.hoaxinh.vn"| BE["Container: backend<br/>node dist/server.js :4000<br/>RUN_JOBS=false (mặc định)"]
    BE --> PG[("Container: postgres:16<br/>volume pgdata")]
    BE --> CD[("Cloudinary<br/>ảnh + backup")]
    WK["Container: worker<br/>node dist/server.js<br/>RUN_JOBS=true — KHÔNG expose port<br/>1 replica DUY NHẤT"] --> PG
    WK -.->|"cron 2 ngày/lần<br/>pg_dump"| CD

    style CADDY fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style PG fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    style WK fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

`backend` và `worker` chạy **cùng image** (cùng `Dockerfile` ở §5.1) — khác nhau duy nhất ở biến môi
trường `RUN_JOBS` và việc `worker` không nhận traffic từ Caddy (chỉ chạy nền). Nhờ vậy scale
`backend` lên bao nhiêu replica tuỳ ý (`docker compose up --scale backend=3`) mà cron vẫn chỉ chạy ở
đúng 1 nơi — xem `OPS-01` ở [docs/12](12-danh-gia-va-de-xuat.md).

### 5.1. `backend/Dockerfile` (đề xuất)

```dockerfile
# --- Giai đoạn build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# --- Giai đoạn chạy ---
FROM node:22-alpine
WORKDIR /app
# pg_dump cho job backup (jobs/backupDatabase.job.ts) — thiếu là backup luôn thất bại
RUN apk add --no-cache postgresql-client
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force
COPY --from=builder /app/dist ./dist
# Chạy bằng user không phải root (SECURITY.md §8)
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
```

### 5.2. `frontend/Dockerfile` (đề xuất)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* được NHÚNG lúc build → phải truyền vào ở bước này, không phải lúc chạy
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["npm", "start"]
```

### 5.3. `docker-compose.yml` (đề xuất, đặt ở thư mục gốc)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    # KHÔNG publish cổng ra ngoài — chỉ container trong mạng nội bộ truy cập được
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      retries: 5

  backend:
    build: ./backend
    restart: unless-stopped
    env_file: ./backend/.env
    environment:
      RUN_JOBS: "false" # API nhận traffic — KHÔNG chạy cron, tránh trùng khi scale nhiều replica
    depends_on:
      postgres: { condition: service_healthy }
    command: sh -c "npx prisma migrate deploy && node dist/server.js"
    expose: ["4000"]
    # Scale khi cần: docker compose up --scale backend=3 — an toàn vì cron chỉ ở service `worker`

  # docs/12 OPS-01 — cùng image với `backend`, tách riêng CHỈ để chạy cron (dọn token, backup DB, dọn
  # file mồ côi). KHÔNG expose port, KHÔNG nhận traffic, và LUÔN giữ đúng 1 replica — 2 replica trở lên
  # sẽ chạy backup/dọn file trùng lặp y hệt vấn đề mà việc tách worker này giải quyết.
  worker:
    build: ./backend
    restart: unless-stopped
    env_file: ./backend/.env
    environment:
      RUN_JOBS: "true"
    depends_on:
      postgres: { condition: service_healthy }
      backend: { condition: service_started } # chờ backend chạy migrate deploy trước
    command: node dist/server.js
    deploy:
      replicas: 1

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
    restart: unless-stopped
    depends_on: [backend]
    expose: ["3000"]

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on: [frontend, backend]

volumes:
  pgdata:
  caddy_data:
```

### 5.4. `Caddyfile` (đề xuất)

Caddy tự xin và gia hạn chứng chỉ TLS từ Let's Encrypt — không phải cấu hình certbot thủ công.

```
hoaxinh.vn {
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    reverse_proxy frontend:3000
}

api.hoaxinh.vn {
    encode gzip zstd
    header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    reverse_proxy backend:4000
}
```

> Backend đã có `helmet` đặt security header ở tầng ứng dụng; reverse proxy bổ sung HSTS
> (chỉ có tác dụng khi phục vụ qua HTTPS thật).

### 5.5. Lệnh triển khai

```bash
git pull origin main
docker compose build
docker compose up -d
docker compose logs -f backend      # theo dõi khởi động + migrate
docker compose exec backend npx prisma migrate status
```

Seed **chỉ chạy một lần** khi khởi tạo hệ thống:

```bash
docker compose exec backend npx tsx prisma/seed/core.seed.ts
docker compose exec backend npx tsx prisma/seed/domain.seed.ts
```

---

## 6. CI/CD — GitHub Actions (đề xuất)

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test          # 602 test, không cần database

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test          # 120 test
      - run: npm run build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:4000
```

**E2E trong CI** (workflow riêng, chạy khi merge vào `main` — chậm hơn nên không chạy mỗi push):

```yaml
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: flower_test
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
        ports: ["5432:5432"]
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/flower_test
      JWT_ACCESS_SECRET: ci-access-secret-khong-dung-that
      JWT_REFRESH_SECRET: ci-refresh-secret-khong-dung-that
      FRONTEND_URL: http://localhost:3000
      NEXT_PUBLIC_API_URL: http://localhost:4000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npx prisma migrate deploy && npm run seed:core && npm run seed:domain
        working-directory: backend
      - run: npm run build && (npm start &) && npx wait-on http://localhost:4000/health
        working-directory: backend
      - run: npm ci && npx playwright install --with-deps chromium && npm run test:e2e
        working-directory: frontend
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

**Chặn merge** khi CI đỏ: GitHub → Settings → Branches → Branch protection rule cho `main` →
*Require status checks to pass*.

**Quét secret bị commit nhầm** (khuyến nghị): thêm bước `gitleaks` hoặc `trufflehog` vào workflow —
xem [07 · Bảo mật §8](07-bao-mat.md).

---

## 7. Backup & khôi phục

```mermaid
flowchart LR
    CRON["node-cron trong tiến trình backend<br/>chỉ chạy khi NODE_ENV=production"] -->|"0 3 */2 * *"| DUMP["pg_dump --format=custom<br/>--compress=9"]
    DUMP --> ENC{"BACKUP_ENCRYPTION_<br/>PUBLIC_KEY đã cấu hình?"}
    ENC -->|Có| CRYPT["Mã hoá RSA + AES-256-GCM<br/>(khoá riêng KHÔNG ở server)"]
    ENC -->|Không — chỉ log cảnh báo| UP
    CRYPT --> UP["upload → Cloudinary<br/>resource_type: raw<br/>backups/db-<timestamp>.dump[.enc]"]
    CRON -->|"30 3 */2 * *"| CLEAN["Xoá backup > 30 ngày<br/>(lặp qua next_cursor)"]
    CRON -->|"0 4 */10 * *"| ORPHAN["Xoá file mồ côi<br/>(không còn file_usages, > 24h)"]

    style CRON fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style CRYPT fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

| Job | Lịch | Việc |
|---|---|---|
| `backupDatabase` | ~2 ngày/lần, 03:00 | `pg_dump --compress=9` → mã hoá (nếu có khoá) → Cloudinary (`resource_type: "raw"`, prefix `backups/`) |
| `cleanupOldBackups` | ~2 ngày/lần, 03:30 | Xoá backup cũ hơn 30 ngày (lặp hết mọi trang qua `next_cursor`) |
| `cleanupOrphanFiles` | ~10 ngày/lần, 04:00 | Xoá file Cloudinary (`resource_type: "image"`) không còn ai dùng |

### Khôi phục từ backup

```bash
# 1. Tải bản backup từ Cloudinary (qua Media Library hoặc gọi Admin API resource_type=raw)

# 2a. Nếu tên file có hậu tố .enc (đã mã hoá) — GIẢI MÃ TRƯỚC, chạy OFFLINE bằng khoá RIÊNG
#     (khoá riêng không bao giờ nằm trên server — xem docs/09 §3.4b):
npm run decrypt-backup -- db-2026-09-11T03-00-00-000Z.dump.enc backup-private.pem db-2026-09-11.dump

# 2b. Khôi phục vào database TRỐNG
pg_restore --clean --if-exists --no-owner \
  --dbname "$DATABASE_URL" db-2026-09-11.dump

# 3. Kiểm tra
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"
```

> ⚠️ **Backup chưa từng thử khôi phục là backup không tồn tại.** Lên lịch diễn tập khôi phục vào
> staging **mỗi quý** và ghi kết quả vào [`CHECKLIST.md`](../CHECKLIST.md). Diễn tập với backup đã
> mã hoá PHẢI thử luôn bước giải mã bằng khoá riêng thật — một khoá riêng bị hỏng/thất lạc chỉ lộ ra
> đúng lúc cần khôi phục thật là quá muộn.

### Hạn chế đã biết của cơ chế hiện tại

| Hạn chế | Ảnh hưởng | Hướng khắc phục |
|---|---|---|
| Cron chạy **trong tiến trình backend** | Chạy nhiều instance → backup trùng lặp; instance chết → không backup | Tách thành container `worker` riêng (chỉ 1 replica), hoặc dùng cron của hệ điều hành — [docs/12 OPS-01](12-danh-gia-va-de-xuat.md) |
| `*/2` trên trường ngày-trong-tháng | Đếm lại từ ngày 1 mỗi tháng, khoảng cách không đều tuyệt đối | Chạy hằng ngày + so mốc thời gian lần chạy trước lưu trong DB |
| Backup chung tài khoản Cloudinary với ảnh công khai (khác `resource_type`, nhưng cùng tài khoản/quyền API) | Bề mặt rủi ro rộng hơn cần thiết | Tài khoản Cloudinary riêng cho backup, API key quyền hẹp — **chưa làm, việc vận hành ngoài phạm vi thay đổi code** (xem [docs/12 OPS-02](12-danh-gia-va-de-xuat.md)) |

> ✅ **Nén + mã hoá backup đã xử lý** (`docs/12 OPS-02`, 11/09/2026) — `pg_dump --compress=9` +
> mã hoá RSA/AES-256-GCM khi có `BACKUP_ENCRYPTION_PUBLIC_KEY`. Dòng "chưa nén, chưa mã hoá" trước
> đây ở bảng này đã được gỡ.

---

## 8. Giám sát

| Hạng mục | Cách làm | Trạng thái |
|---|---|:---:|
| **Uptime** | Trỏ UptimeRobot / BetterStack vào `GET /health` (60 giây/lần) | ⬜ |
| **Log tập trung** | Đổi `shared/logger/logger.ts` sang `pino` + gửi tới Grafana Loki / Axiom / Better Stack | ⬜ |
| **Cảnh báo bất thường** | Nhiều 401/403 liên tiếp, nhiều đăng nhập thất bại, đơn hàng tăng đột biến | ⬜ |
| **Trace request** | Header `X-Request-Id` đã có sẵn — yêu cầu người báo lỗi gửi kèm ID này | ✅ |
| **Lỗi ứng dụng** | Sentry (bắt cả frontend lẫn backend) | ⬜ |
| **Sức khoẻ database** | Dashboard Neon, hoặc `pg_stat_statements` khi tự quản lý | ⬜ |

**Tra log theo một request cụ thể** khi khách báo lỗi:

```bash
docker compose logs backend | grep "<X-Request-Id khách gửi>"
```

---

## 9. Xử lý sự cố production

| Triệu chứng | Kiểm tra trước tiên | Xử lý |
|---|---|---|
| API trả 500 hàng loạt | `docker compose logs backend --tail=200` | Tìm dòng `Unhandled error`, lấy `X-Request-Id` để lần theo |
| Không ai đăng nhập được | Cấu hình `login_method_settings` | Có chốt chặn ≥ 1 phương thức; nếu DB bị sửa tay thì bật lại trực tiếp trong DB |
| Người dùng bị đăng xuất hàng loạt | `JWT_ACCESS_SECRET` có bị đổi? | Khôi phục giá trị cũ nếu đổi nhầm |
| Lỗi CORS sau khi đổi domain | `FRONTEND_URL` | Cập nhật rồi restart backend |
| Ảnh không hiển thị | `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET`, `publicId` có khớp không | So `files.url` trong DB (là `secure_url` Cloudinary trả về) với URL truy cập thật |
| Email không gửi được | `SELECT * FROM email_logs WHERE status='failed' ORDER BY sent_at DESC LIMIT 20;` | Đọc cột `error` |
| Không có backup mới | Log cron, `pg_dump` có trong PATH? | Cài `postgresql-client` vào image |
| Đơn hàng chậm vào dịp lễ | Chỉ số DB, số kết nối | Tăng pool, thêm index, cân nhắc cache |

### Quay lui (*rollback*)

```bash
git checkout <tag-hoặc-commit-ổn-định>
docker compose build && docker compose up -d
```

> ⚠️ **Migration database không tự quay lui.** Nếu bản phát hành có migration phá vỡ tương thích,
> phải khôi phục từ backup. Vì vậy: **viết migration tương thích ngược** — thêm cột nullable trước,
> điền dữ liệu, rồi mới ràng buộc `NOT NULL` ở bản phát hành sau.

---

## 10. Đề xuất cho giai đoạn cao điểm (14/2, 8/3, 20/10)

Đặc thù ngành hoa: lưu lượng dồn vào vài ngày trong năm.

| Việc | Thời điểm | Ghi chú |
|---|---|---|
| Chạy test tải (k6/Artillery) mô phỏng cao điểm | Trước **2 tuần** | Tìm điểm nghẽn khi còn kịp sửa |
| Tăng số instance backend | Trước **3 ngày** | Nhớ tách cron ra khỏi các instance nhân bản |
| Kiểm tra ràng buộc tồn kho, chống *race condition* | Trước **1 tuần** | `UPDATE ... WHERE stock >= quantity` — xem [07 · Bảo mật §7](07-bao-mat.md) |
| Backup thủ công thêm một bản | Trước **1 ngày** | Ngoài lịch cron tự động |
| Trực giám sát | Trong ngày cao điểm | Theo dõi tỉ lệ lỗi + độ trễ |
| Kiểm tra hạn mức gửi email | Trước **3 ngày** | Resend có giới hạn theo gói |
