# 09 · Nhận xét học viên & bảng điểm

> Mốc review: commit `bdf8d99` (24/09/2026). Đây là lần review đầu tiên theo bộ chuẩn này, nên chưa
> có điểm lần trước để so sánh.

## 1. Nhìn chung

Đây là một dự án **làm thật**: có khách hàng, có domain, có HTTPS, có backup, có giám sát và
khoảng 1.100 test chạy trong CI. Ở mức độ hoàn thiện này, người thầy không còn nhận xét "code chạy
được chưa". Câu hỏi đúng là: **"hệ thống có hành xử đúng trong các tình huống biên của đời thật
không?"** Và câu trả lời của review này là: *phần lớn là có, trừ những chỗ mà trạng thái thay đổi
theo thời gian (phiên đăng nhập, đơn hàng)*.

## 2. Điểm bạn đã làm tốt

- **Phân tầng backend đúng và nhất quán**: 22 controller đều mỏng, không service nào chạm `req/res`,
  mọi route quản trị có `authorize('permission.code')`. Đây là mức nhiều người đi làm vài năm vẫn
  chưa giữ được.
- **Phân quyền dựa trên dữ liệu tươi**: JWT chỉ chứa `sub`, quyền tra DB mỗi request. Bạn hiểu và
  **ghi lại đánh đổi** (thêm 1 truy vấn, đổi lại quyền có hiệu lực ngay). Đó là tư duy kiến trúc thật.
- **Những chi tiết an toàn khó**, và bạn làm đúng:
  - tăng `usedCount` của coupon bằng `updateMany` có điều kiện (chống race);
  - tiêu thụ token 1 lần một cách nguyên tử;
  - chống dò tài khoản, có comment giải thích vì sao nuốt lỗi gửi mail;
  - tiền lưu `Int` VND, giá luôn lấy từ DB.
- **Frontend tách tầng kỷ luật**: không component nào gọi axios, Zustand chỉ giữ UI state, zero
  `any`, storefront dùng Server Component + `generateMetadata`.
- **Kiểm thử và vận hành vượt yêu cầu**:
  - Testcontainers chạy migration thật;
  - CI kiểm cả cú pháp Mermaid trong tài liệu;
  - worker cron tách khỏi API;
  - Docker non-root;
  - backup có mã hoá AES-256-GCM + RSA.
- **Tự đánh giá nợ kỹ thuật** (`docs/12`) có mã, ưu tiên và ước lượng. Rất hiếm thấy ở dự án học viên.

## 3. Tư duy đúng cần phát huy

- **Ghi lại "vì sao"**: CLAUDE.md, comment và docs đều hướng tới người đọc sau. Hãy giữ thói quen
  này, và rèn thêm kỹ năng **viết ngắn** (xem mục 4.4).
- **YAGNI có ý thức**: tài liệu chủ động ghi "chưa cần Redis", "chỉ tách StorageService khi thực sự
  cần". Bạn biết dừng đúng chỗ.
- **Fail-fast**: `env.ts` validate cả giá trị, có kiểm riêng cho production. Hãy áp dụng tư duy này
  cho mọi cấu hình an toàn còn lại (khoá backup, cờ tắt rate limit).

## 4. Lỗi mang tính hệ thống (lặp lại ở nhiều nơi)

### 4.1. Kiểm chứng chưa đúng điều kiện thật

Lỗi FE-08 (quay lại sai trang sau đăng nhập) đã được sửa **hai lần** và ghi "✅ ĐÃ XỬ LÝ", nhưng lỗi
vẫn còn. Review tái hiện được lỗi, cùng với lỗi header (FE-01), chỉ bằng cách đặt **đúng hai điều
kiện của người dùng thật**:

1. token hết hạn thật (trình duyệt tự xoá cookie);
2. bấm Link (điều hướng phía client).

Ghi chú "không tái hiện được bằng Playwright" trong docs/12 là dấu hiệu kịch bản test chưa mô phỏng
đúng đời thật, chứ không phải lỗi quá hiếm.

> **Cách làm đúng**: trước khi sửa, viết một test **đỏ** tái hiện lỗi. Chỉ ghi "đã xử lý" khi chính
> test đó chuyển xanh. Với lỗi phụ thuộc thời gian, hãy tua thời gian (xoá cookie, rút ngắn TTL qua
> biến môi trường) thay vì chờ.

### 4.2. Một khái niệm mang hai nghĩa

- `sessions.revokedAt` vừa có nghĩa "bị thu hồi" vừa có nghĩa "đã xoay vòng" (SEC-01), nên hệ thống
  không phân biệt được người dùng hợp lệ với kẻ trộm token.
- `useMe().data` vừa là "user hiện tại" vừa là "user lần cuối fetch thành công" (FE-01). Header vì vậy
  vẫn hiện tên sau khi phiên đã chết.
- Trạng thái đơn hàng không có bảng chuyển trạng thái (ERR-05).

> **Kiến thức cần bổ sung**: mô hình hoá **máy trạng thái** (*state machine*). Với mỗi thực thể có
> vòng đời (phiên, đơn hàng, coupon), hãy vẽ `stateDiagram-v2` **trước khi code**: những trạng thái
> nào tồn tại, chuyển nào hợp lệ, và DB phân biệt các trạng thái đó bằng cột nào.

### 4.3. Lặp code khiến các bản sao lệch nhau

`ensureUniqueSlug` có 4 bản sao. Bản trong `products` đã khác bản trong `blog`, và chính sự khác đó
sinh ra DB-02. Chín trang CRUD admin cũng tự sinh lại cùng một khung (FE-03).

> **Cách làm đúng**: lặp **2 lần** thì chấp nhận; tới **lần thứ 3** thì dừng lại gom vào `shared/`.
> Khi dùng AI sinh code, luôn hỏi "đã có helper nào làm việc này chưa?" trước khi chấp nhận một bản
> mới. Ngược lại, **đừng** vội viết `useCrudPage` generic ngay: tách tay 3 trang trước để thấy phần
> nào thật sự chung.

### 4.4. Tài liệu đi nhanh hơn code

Tài liệu rất nhiều. Nhưng README ghi 334 test (thực tế 929); `docs/01` ghi đơn hàng/đánh giá/khuyến
mãi "chưa làm" (đã làm); `core-auth.md` ghi "chưa có reuse detection" (đã có); quick start trỏ tới
file `.env.local.example` không tồn tại. Tài liệu sai còn tệ hơn không có tài liệu, đúng như chính
CLAUDE.md của bạn đã viết.

> **Cách làm đúng**: tài liệu chỉ ghi điều **khó thay đổi** (quyết định, lý do, quy trình); bỏ những
> con số tự thay đổi mỗi tuần (số test). Thêm câu hỏi "tài liệu nào bị ảnh hưởng?" vào mẫu PR. Viết
> comment ngắn: *vì sao* thì giữ lại, *câu chuyện tìm bug* thì đưa vào commit message.

### 4.5. Chỉ validate luồng thuận (*happy path*)

- Coupon: `refine` chỉ đúng khi PATCH gửi đủ `type` + `value`, nên gửi thiếu một trường sẽ làm tổng
  đơn âm (VAL-01).
- Đơn hàng: không bắt buộc biến thể khi sản phẩm có biến thể (ERR-05).
- Sản phẩm: validate occasion **sau khi** đã tạo sản phẩm (DB-03).

> **Cách làm đúng**: với PATCH, validate trên **dữ liệu sau khi merge** với bản ghi hiện tại. Luôn
> validate toàn bộ trước khi ghi, rồi gói phần ghi vào transaction.

### 4.6. Quy trình đưa code vào nhánh chính

Commit "WIP: temporary debug logging" nằm trên `main`. Log đó chạy ở server mỗi request và in object
người dùng (email, quyền) ra console trình duyệt. Branch protection chưa bật.

> **Cách làm đúng**: log chẩn đoán chỉ sống trên nhánh riêng. Bật branch protection, và thêm rule
> ESLint `no-console` để máy chặn giúp bạn.

## 5. Kiến thức còn thiếu — thứ tự nên học bổ sung

1. **Vòng đời phiên và các mẫu bảo mật auth**:
   - refresh token rotation + reuse detection đúng cách (phân biệt xoay vòng với thu hồi, grace window);
   - *account linking* an toàn (pre-hijacking — SEC-03).
   - Tài liệu gợi ý: OWASP ASVS chương V2 và V3.
2. **Ngữ nghĩa của TanStack Query**:
   - dữ liệu được giữ khi lỗi;
   - `isFetchedAfterMount` so với `isSuccess`;
   - `setQueryData` so với `removeQueries`;
   - query key factory và đồ thị invalidate.
3. **Cơ chế cache và điều hướng của Next.js App Router**:
   - Client Cache của trang tĩnh (`staleTimes`);
   - điều hướng mềm (render trước khi URL đổi);
   - vì sao phải dùng `useSearchParams` + `<Suspense>` thay vì `window.location`.
4. **Kiểm thử đúng điều kiện thật**:
   - E2E với trạng thái phụ thuộc thời gian (xoá cookie, TTL ngắn);
   - độ trung thực của test double: mock `$transaction` không rollback, nên cần test DB thật cho
     transaction.
5. **Toàn vẹn dữ liệu**:
   - validate trước khi ghi;
   - partial unique index với xoá mềm;
   - idempotency;
   - enum / CHECK constraint.
6. **Accessibility cơ bản**: `label`/`htmlFor`, `role="dialog"` + focus trap, `aria-live` cho toast,
   `aria-pressed`/`aria-expanded`.
7. **Git workflow**: nhánh tính năng, branch protection, PR checklist.

## 6. Về việc dùng AI

63/64 commit có đồng tác giả Claude. Dùng AI là **điểm cộng về năng suất**: dự án làm được khối
lượng rất lớn trong khoảng 2 tuần. Nhưng các lỗi nặng nhất trong review đều mang dấu vết của việc
**tin kết luận của AI mà chưa kiểm chứng**:

- "đã sửa" nhưng chưa tái hiện;
- helper sinh lại thay vì tái sử dụng;
- tài liệu sinh ra nhưng chưa đối chiếu với code.

Trách nhiệm đọc hiểu, hợp nhất và **chứng minh** vẫn là của người commit. Hãy dùng AI để **viết test
đỏ trước**, không chỉ để viết bản sửa.

## 7. Bảng điểm

| Nhóm | Trọng số | Điểm nhóm (/10) | Đóng góp | Lý do chính |
|---|:---:|:---:|:---:|---|
| Hoàn thành nghiệp vụ | 10 | 8 | 8,00 | Phạm vi rất rộng và **đang chạy production**: storefront, checkout COD chọn ngày giờ giao, đánh giá, coupon, blog, newsletter, nhắc lịch, realtime, dashboard, RBAC, 3 phương thức đăng nhập. Trừ điểm: luồng phiên hết hạn lỗi ngay trước mắt người dùng (FE-01/02); quy tắc đơn hàng còn hở (ERR-05). Thanh toán online đang chờ khách chốt nên không trừ |
| Kiến trúc backend | 15 | 8 | 12,00 | Modular core/domain, controller mỏng, `app`/`server` tách đúng, response chuẩn. Trừ: ARCH-01, ARCH-02 (Medium); BE-01, BE-02 `[CHUẨN]` (tối đa −1); BE-03 |
| Kiến trúc frontend | 15 | 5,5 | 8,25 | Có **2 lỗi High** (FE-01, FE-02) cùng ARCH-03, FE-03, FE-04, FE-06, FE-08, FE-09. Không xuống thấp hơn nhờ phân tầng service/hook rất kỷ luật, Server Component đúng chỗ và zero `any` |
| Bảo mật & phân quyền | 15 | 5 | 7,50 | **3 lỗi High**: SEC-01, SEC-03, SEC-04 (có thể là Critical, chưa đủ dữ liệu) + SEC-02, 05, 06, 07. Giữ ở band 5–6 (không xuống 3–4) vì nền tảng đúng (cookie `httpOnly`, token hash + xoay vòng, RBAC tra DB, IDOR được kiểm, sanitize HTML, env fail-fast), các lỗi sửa được cục bộ, không phải làm lại |
| Database & dữ liệu | 10 | 7 | 7,00 | Tiền `Int`, snapshot giá, FK/onDelete có cân nhắc, migration version hoá, test với DB thật. Trừ: DB-01..04 (Medium), DB-05..07 (Low) |
| Validation & xử lý lỗi | 10 | 5,5 | 5,50 | Zod hai phía, `errorHandler` tập trung, map lỗi Prisma. Trừ: **ERR-01 (High)**, VAL-01, ERR-02..05 (Medium), VAL-03 `[CHUẨN]` |
| Clean Code & quy ước | 10 | 7 | 7,00 | Zero `any`, lint/format/typecheck trong CI, naming nhất quán. Trừ: CODE-01 (log debug trên `main`), CODE-02 (DRY), CODE-03 (SRP); CODE-04..06 (Low) |
| Kiểm thử | 8 | 8 | 6,40 | "Tốt": khoảng 1.100 test, CI, Testcontainers, E2E. Trừ: TEST-01 (luồng phiên phía client), TEST-02 (test khoá hành vi sai, mock không rollback); TEST-03 |
| Tài liệu & vận hành | 7 | 7 | 4,90 | Tài liệu rất dày cho dev và vận hành; Docker, Caddy, Loki, backup. Trừ: DOC-01 (quick start hỏng), DOC-02 (lệch code hệ thống), OPS-01 (không có cổng chặn nhánh chính); DOC-03, OPS-02, OPS-03 |
| **Tổng** | **100** | | **66,55 → 6,75/10** | Làm tròn tới 0,25 |
| Ghi nhận phần vượt yêu cầu | | | **+0,5** | CI 4 job (có E2E + Testcontainers + kiểm Mermaid); triển khai production thật; OpenAPI sinh từ zod; tài liệu tự đánh giá nợ kỹ thuật |
| **Điểm cuối** | | | **7,25/10** | **Xếp loại: Khá** |

**Quy tắc trần**: không áp dụng (0 lỗi Critical đã xác nhận).

**Độ nhạy**: nếu xác nhận production **chưa** cấu hình khoá mã hoá backup, SEC-04 thành Critical. Khi
đó điểm nhóm bảo mật tối đa là 4 (đóng góp 6,00), tổng rubric còn 65,05 → 6,5, cộng 0,5 → **7,0/10**
(vẫn xếp loại Khá).

## 8. Lời kết

Khoảng cách từ **7,25 lên 8,5+** không nằm ở việc viết thêm tính năng. Nó nằm ở **6 lỗi High** (ước
lượng khoảng 2,5 ngày làm ngay theo [08](08-LO-TRINH-CAI-THIEN.md)) và ở thói quen **chứng minh
trước, ghi "đã xử lý" sau**. Nền móng bạn xây đã đủ vững để những sửa đổi đó trở thành cục bộ và an
toàn. Đó là thành quả đáng ghi nhận nhất của dự án này.
