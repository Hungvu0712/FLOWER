# 🔒 Bảo mật hệ thống (Security)

Tài liệu này liệt kê các rủi ro bảo mật cần xử lý cho website bán hoa và biện pháp phòng ngừa cụ thể theo từng tầng (auth, API, database, thanh toán, hạ tầng). Tham khảo cùng [README.md](README.md) (tổng quan), [ARCHITECTURE.md](ARCHITECTURE.md) (kiến trúc), [DATABASE.md](DATABASE.md) (schema & RBAC).

---

## 1. Xác thực (Authentication)

Hệ thống hỗ trợ 3 phương thức đăng nhập (email/password, Google OAuth, magic link) — schema chi tiết ở [DATABASE.md §3.2 "Nhóm Xác thực & Phiên đăng nhập"](DATABASE.md).

| Rủi ro | Biện pháp |
|---|---|
| Mật khẩu yếu / lộ mật khẩu | Hash bằng **bcrypt** (cost ≥ 12) hoặc **argon2**; bắt buộc độ dài tối thiểu 8 ký tự khi đăng ký |
| Brute-force đăng nhập | Rate limit theo IP + email (`express-rate-limit`), khoá tạm tài khoản sau 5 lần sai (kèm cooldown tăng dần), captcha (reCAPTCHA/hCaptcha) sau vài lần thất bại |
| Đánh cắp session/token | Access token JWT **thời gian sống ngắn** (15 phút), refresh token lưu ở **httpOnly, Secure, SameSite=Strict cookie** (không lưu localStorage — tránh XSS đánh cắp token) |
| Refresh token bị lộ | Refresh token **rotation**: mỗi lần dùng để cấp access token mới thì phát hành refresh token mới, thu hồi token cũ (set `sessions.revoked_at`); chỉ lưu `refresh_token_hash`, không lưu token thô |
| **Magic link bị lộ/đoán được** | Token magic link sinh ngẫu nhiên đủ dài (≥ 32 byte), chỉ lưu `token_hash` (sha256) trong DB, **hết hạn ngắn** (~15 phút), **dùng 1 lần** (set `used_at` ngay khi verify — verify lần 2 phải fail), gửi qua Resend với rate limit theo email (chống spam yêu cầu magic link liên tục) |
| Chiếm quyền tài khoản admin/nhân viên | Bắt buộc **2FA (TOTP)** cho các vai trò `super_admin`, `admin` trở lên |
| OAuth Google bị giả mạo callback | Dùng `state` param chống CSRF, xác thực domain redirect_uri whitelist |
| Email/số điện thoại giả khi đăng ký | Xác thực email (verification link) trước khi cho đặt hàng thanh toán online; OTP SMS khi cần |
| **Bị vô hiệu hoá hết phương thức đăng nhập** | Service `login-methods.update` luôn kiểm tra: sau khi áp thay đổi, phải còn **≥ 1** phương thức `is_enabled = true`, nếu không → trả lỗi 400 + cảnh báo rõ ràng trên UI SuperAdmin, không cho lưu |
| Chiếm phiên qua thiết bị bị đánh cắp | Người dùng tự xem danh sách thiết bị (`GET /api/account/sessions`) và **đăng xuất từ xa** từng thiết bị hoặc toàn bộ (revoke `sessions`); nên gửi email cảnh báo khi có đăng nhập từ thiết bị/IP lạ |

---

## 2. Phân quyền & Kiểm soát truy cập (Authorization)

Đã thiết kế RBAC chi tiết ở [DATABASE.md §2](DATABASE.md#2-hệ-thống-vai-trò--phân-quyền-rbac). Về mặt bảo mật cần lưu ý thêm:

- **Không bao giờ tin tưởng kiểm tra quyền ở frontend** — mọi permission check phải lặp lại ở backend (frontend chỉ ẩn UI cho trải nghiệm).
- **Chống IDOR (Insecure Direct Object Reference)**: khi truy vấn `GET /api/orders/:id`, phải kiểm tra `orders.user_id === req.user.id` (trừ khi user có `orders.view_all`) — không chỉ dựa vào việc "biết ID" là được xem.
- **Row-level check cho nhân viên vận hành**: `shipper` chỉ được cập nhật đơn có `order_deliveries.shipper_id = req.user.id`; `florist` chỉ được sửa đơn đang ở trạng thái "đang chuẩn bị".
- **Nguyên tắc đặc quyền tối thiểu (least privilege)**: tài khoản `sales_staff` mặc định không có `products.delete`, `settings.manage`.
- **Quản lý user chỉ thuộc về `super_admin`** (permission `users.manage` chỉ gán cho role này) — service xử lý các API `PATCH /api/superadmin/users/:id/role`, `/block`, `/unblock`, `/reset-password` phải chặn cứng ở tầng service (không chỉ dựa vào middleware `authorize`), với 2 ràng buộc bắt buộc:
  1. `targetUserId !== req.user.id` — không tự đổi role chính mình.
  2. `newRole !== 'super_admin'` — không được nâng bất kỳ ai (kể cả chính mình) lên `super_admin` qua API; tài khoản `super_admin` chỉ tạo được qua seed hoặc thao tác thủ công trực tiếp trên DB.
- **Leo thang quyền qua role tự tạo (shadow super_admin)**: hệ thống cho phép `super_admin` tạo role tuỳ ý — đây là điểm dễ bị lợi dụng nếu không chặn đúng chỗ. API `POST/PATCH /api/superadmin/roles` phải **luôn lọc bỏ** mọi permission có `is_restricted = true` (`users.manage`, `settings.manage`, `roles.manage`) khỏi payload trước khi ghi `role_permissions`, kể cả khi request cố tình gửi kèm — không chỉ ẩn ở UI. Việc kiểm tra này nằm ở tầng service, không tin payload từ client.
- **Reset password bởi SuperAdmin**: sinh mật khẩu ngẫu nhiên đủ mạnh, hash trước khi lưu, gửi bản rõ **duy nhất một lần** qua email (Resend) — không log, không trả về trong response API, không hiển thị lại cho `super_admin`.
- **Audit log** cho hành động nhạy cảm: đổi giá sản phẩm, xoá sản phẩm, đổi role user, block/unblock user, bật/tắt phương thức đăng nhập, hoàn tiền đơn hàng — ghi rõ ai (`changed_by`), khi nào, giá trị trước/sau.

---

## 3. Bảo mật tầng API (Express)

| Hạng mục | Công cụ / cách làm |
|---|---|
| HTTP headers an toàn | `helmet` middleware (CSP, X-Frame-Options, X-Content-Type-Options...) |
| CORS | Whitelist chính xác domain frontend (`origin: process.env.FRONTEND_URL`), không dùng `*` khi có credentials |
| Validate input | `zod` hoặc `joi` validate toàn bộ body/query/params trước khi vào controller — chặn payload rác, giới hạn độ dài chuỗi |
| Chống SQL Injection | Dùng ORM (Prisma) với parameterized query; **không** nối chuỗi SQL thủ công |
| Chống NoSQL/JSON injection | Validate kiểu dữ liệu nghiêm ngặt nếu dùng JSONB trong Postgres |
| Chống XSS | React/Next.js tự escape output; nếu render nội dung blog dạng HTML (`dangerouslySetInnerHTML`) phải sanitize bằng `DOMPurify` (hoặc `isomorphic-dompurify` khi chạy ở Server Component) trước khi lưu/hiển thị |
| CSRF | Nếu dùng cookie cho auth: bật CSRF token cho các request thay đổi state (`csurf` hoặc double-submit cookie pattern) |
| Rate limiting API công khai | Giới hạn `/api/products`, `/api/cart` theo IP để chống scraping/spam bot |
| Giới hạn kích thước request | `express.json({ limit: '1mb' })` tránh payload khổng lồ gây DoS |
| HTTPS bắt buộc | Redirect HTTP→HTTPS, bật HSTS ở production |
| Upload ảnh sản phẩm/avatar | Giới hạn loại file (jpg/png/webp), giới hạn dung lượng, đổi tên file ngẫu nhiên (không dùng tên gốc làm key), upload thẳng lên Cloudflare R2 qua **presigned URL** (không đi qua server ứng dụng), quét virus nếu cho khách upload ảnh review |

---

## 4. Bảo mật thanh toán

- **Không bao giờ lưu số thẻ/CVV trên server của mình** — dùng cổng thanh toán (VNPay/Momo/Stripe) theo mô hình hosted checkout hoặc tokenization, giữ hệ thống ngoài phạm vi PCI DSS.
- **Xác thực webhook**: mọi callback từ cổng thanh toán phải verify chữ ký (HMAC secret key) trước khi cập nhật `payment_status` — chặn giả mạo webhook để "đánh dấu đã thanh toán" khống.
- **Idempotency**: webhook có thể bị gọi lại nhiều lần — dùng `transaction_id` unique để tránh cộng tiền/xử lý đơn hai lần.
- **Đối soát**: log toàn bộ giao dịch thanh toán (amount, status, timestamp) để đối chiếu cuối ngày với cổng thanh toán.
- Với COD: giới hạn giá trị đơn tối đa hoặc yêu cầu xác thực OTP với đơn giá trị lớn để giảm rủi ro đơn ảo/bom hàng.

---

## 5. Bảo mật lưu trữ file & backup (Cloudflare R2)

- **Bucket private**: file/ảnh không public trực tiếp qua R2 endpoint gốc; phục vụ qua custom domain có kiểm soát hoặc signed URL có thời hạn cho nội dung nhạy cảm (vd hoá đơn), ảnh sản phẩm công khai thì dùng CDN cache bình thường.
- **Presigned upload có kiểm soát**: URL presigned chỉ cấp sau khi backend xác thực user, giới hạn `content-type` + kích thước tối đa trong điều kiện ký, và có thời gian hết hạn ngắn (vài phút) — tránh bị lợi dụng upload file tuỳ ý.
- **Dọn file mồ côi (10 ngày/lần)**: cron job xoá file trong `files` không còn `file_usages` tham chiếu và đã quá ngưỡng an toàn (≥ 24h kể từ lúc upload) — vừa tiết kiệm dung lượng, vừa giảm bề mặt tấn công (file rác không ai quản lý). Trước khi xoá cứng trên R2, xoá record DB trong cùng transaction để tránh mất đồng bộ.
- **Backup PostgreSQL lên R2**: `pg_dump` định kỳ **2 ngày/lần**, nén + **mã hoá** trước khi đẩy lên bucket `backups/` riêng (tách khỏi bucket ảnh công khai), giới hạn quyền truy cập bucket này ở mức tối thiểu (chỉ service account backup được ghi/đọc).
- **Retention tự động**: cấu hình lifecycle rule của R2 (hoặc cron job riêng) để **tự xoá backup cũ hơn 1 tháng** — tránh backup tồn đọng vô thời hạn vừa tốn chi phí vừa tăng rủi ro rò rỉ nếu bucket bị lộ.
- **Test khôi phục định kỳ**: backup vô dụng nếu chưa từng thử restore — lên lịch kiểm tra khôi phục thử (staging) theo quý.

---

## 6. Bảo mật dữ liệu & tuân thủ

- **Dữ liệu cá nhân khách hàng** (họ tên, SĐT, địa chỉ) cần tuân thủ **Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân** (Việt Nam):
  - Có trang "Chính sách bảo mật" nêu rõ mục đích thu thập, thời gian lưu trữ.
  - Cho phép khách yêu cầu xoá tài khoản/dữ liệu cá nhân.
  - Xin sự đồng ý (checkbox) khi đăng ký nhận email marketing.
- **Mã hoá dữ liệu nhạy cảm**: số điện thoại, địa chỉ có thể mã hoá ở tầng ứng dụng (application-level encryption) nếu yêu cầu bảo mật cao, hoặc tối thiểu mã hoá ổ đĩa (encryption at rest) ở tầng database (Neon/VPS Postgres đều hỗ trợ encryption at rest).
- **Không log dữ liệu nhạy cảm**: mật khẩu, token (JWT/magic link/reset), số thẻ/OTP không bao giờ được ghi vào log server.
- **Xoá mềm (soft delete)** cho `users`/`products` để vẫn giữ được lịch sử đơn hàng hợp lệ khi dữ liệu gốc bị xoá, nhưng ẩn khỏi truy vấn thông thường.

---

## 7. Bảo mật logic nghiệp vụ (Business Logic Abuse)

| Rủi ro | Biện pháp |
|---|---|
| Lạm dụng mã giảm giá (dùng nhiều lần, chia sẻ mã cá nhân) | Giới hạn `usage_limit` tổng và `usage_limit_per_user`; kiểm tra qua bảng `coupon_usages` trước khi áp dụng |
| Race condition khi nhiều người mua cùng lúc sản phẩm sắp hết hàng | Dùng transaction + `SELECT ... FOR UPDATE` (row lock) khi trừ `stock`, hoặc kiểm tra tồn kho ngay trong câu `UPDATE ... WHERE stock >= quantity` |
| Đơn hàng ảo / spam checkout | Captcha ở bước đặt hàng cho guest, rate limit theo IP/session, xác thực số điện thoại với đơn giá trị cao |
| Sửa giá ở client trước khi gửi đơn | Server **luôn tính lại giá** từ dữ liệu `products`/`product_variants` trong DB tại thời điểm đặt hàng, không tin giá gửi từ frontend |
| Tự ý đổi trạng thái đơn hàng qua API | Validate state machine hợp lệ (vd không cho chuyển thẳng từ "đã đặt" sang "đã giao"), chỉ role có permission tương ứng mới đổi được |

---

## 8. Hạ tầng & DevOps

- **Biến môi trường**: toàn bộ secret (DB URL Neon/VPS, JWT secret, API key cổng thanh toán, R2 access key, `RESEND_API_KEY` hoặc mật khẩu SMTP tuỳ `EMAIL_PROVIDER`) nằm trong `.env`, **không commit vào Git** (`.gitignore` chuẩn ngay từ đầu). Ở production dùng secret manager (AWS Secrets Manager/Doppler/Vault).
- **Database user riêng cho ứng dụng** với quyền hạn tối thiểu (không dùng user chủ/superuser), chỉ mở cổng DB nội bộ (không public ra internet) khi tự quản lý trên VPS.
- **Dependency scanning**: chạy `npm audit` / Dependabot / Snyk định kỳ để phát hiện thư viện có lỗ hổng đã biết.
- **Docker**: build image tối giản (alpine), chạy container với user non-root, không để `node_modules` chứa devDependencies ở production image.
- **CI/CD**: chặn merge nếu có secret bị commit nhầm (dùng `gitleaks`/`trufflehog` trong pipeline).
- **Giám sát & cảnh báo**: log tập trung (vd. cấu hình đơn giản với Winston + một dịch vụ log), cảnh báo khi có nhiều lỗi 401/403 bất thường, nhiều đăng nhập thất bại liên tiếp, hoặc lượng đơn hàng tăng đột biến bất thường (dấu hiệu bot).

---

## 9. Checklist theo từng giai đoạn (map với Roadmap ở README)

**Giai đoạn 1 — MVP**
- [ ] Hash mật khẩu bcrypt, JWT access/refresh cơ bản, session lưu ở `sessions` (device tracking)
- [ ] Magic link: token hash, hết hạn ngắn, dùng 1 lần, rate limit theo email
- [ ] Validate input toàn bộ API (zod)
- [ ] Helmet + CORS whitelist đúng domain
- [ ] RBAC middleware `authenticate` + `authorize`; chặn cứng ràng buộc "không tự đổi role", "không tự nâng super_admin" ở tầng service
- [ ] Presigned URL R2 có kiểm soát content-type/size/thời hạn
- [ ] `.env` không commit, có `.env.example`

**Giai đoạn 2 — Thanh toán**
- [ ] Verify chữ ký webhook thanh toán
- [ ] Idempotency xử lý webhook
- [ ] Rate limit đăng nhập + captcha checkout
- [ ] HTTPS + HSTS ở production
- [ ] API đăng xuất từ xa (`DELETE /api/account/sessions/:id`) hoạt động đúng — không cho revoke session của user khác
- [ ] Validate luôn còn ≥ 1 `login_method` được bật khi SuperAdmin cập nhật cấu hình

**Giai đoạn 3 — Tăng trưởng**
- [ ] Giới hạn coupon per-user, chống race condition tồn kho
- [ ] Audit log cho thao tác admin/superadmin (đổi role, block/unblock, reset password, bật/tắt auth method, tạo/sửa/xoá role)
- [ ] API tạo/sửa role tuỳ ý luôn lọc bỏ permission `is_restricted` khỏi payload ở tầng service (test bằng cách cố tình gửi kèm `users.manage` trong request tạo role)
- [ ] Cron job xoá file mồ côi (10 ngày/lần) chạy đúng, không xoá nhầm file mới upload
- [ ] Cron backup DB → R2 (2 ngày/lần) + retention tự xoá sau 1 tháng hoạt động đúng
- [ ] Trang chính sách bảo mật + cơ chế xoá dữ liệu cá nhân

**Giai đoạn 4 — Mở rộng**
- [ ] 2FA cho tài khoản `super_admin`/`admin`
- [ ] Dependency scanning tự động trong CI
- [ ] Penetration test / security review trước khi scale lớn
- [ ] Khi chuyển DB sang VPS tự quản lý: harden Postgres (user riêng, không public port), cấu hình firewall

---

## 10. Tham khảo

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (Việt Nam)
- PCI DSS (nếu sau này cân nhắc tự xử lý thanh toán thẻ thay vì qua cổng trung gian)
