---
description: Tiến độ thực tế của dự án, cập nhật hai tuần một lần.
---

# 3. Tiến độ dự án

> **Cập nhật lần cuối: 09/09/2026** · Lần cập nhật tiếp theo: 23/09/2026

---

## 3.1. Tóm tắt

| Chỉ số | Giá trị |
|---|---|
| Giai đoạn hiện tại | **Phase 5 — Xây dựng nghiệp vụ bán hàng** |
| Hoàn thành tổng thể | **~40%** |
| Nền tảng kỹ thuật | ✅ Đã xong và đã kiểm thử |
| Nghiệp vụ bán hàng | 🟡 Mới có phần danh mục |
| Số bài kiểm thử tự động đang chạy | **466** (backend 365 · giao diện 101) + ~30 kịch bản mô phỏng người dùng |
| Dự kiến bản dùng thử (MVP) | **Cuối tháng 12/2026** |
| Dự kiến bản hoàn chỉnh | **Cuối tháng 2/2027** |

---

## 3.2. Bảy giai đoạn

```mermaid
flowchart LR
    P1["1️⃣ Nền tảng<br/>kỹ thuật<br/>✅ XONG"] --> P2["2️⃣ Đăng nhập<br/>& tài khoản<br/>✅ XONG"]
    P2 --> P3["3️⃣ Phân quyền<br/>nhân viên<br/>✅ XONG"]
    P3 --> P4["4️⃣ Hạ tầng<br/>ảnh · email<br/>🟡 ĐANG LÀM"]
    P4 --> P5["5️⃣ Nghiệp vụ<br/>bán hoa<br/>🟡 ĐANG LÀM"]
    P5 --> P6["6️⃣ Kiểm thử<br/>& chất lượng<br/>🟡 ĐANG LÀM"]
    P6 --> P7["7️⃣ Đưa lên<br/>máy chủ thật<br/>⬜ CHƯA"]

    style P1 fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style P2 fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style P3 fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style P4 fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style P5 fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style P6 fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style P7 fill:#f3f4f6,stroke:#4b5563,stroke-width:2px,color:#1f2937
```

| Giai đoạn | Nội dung | Trạng thái | Hoàn thành |
|---|---|:---:|---|
| 1 — Nền tảng kỹ thuật | Khung hệ thống, chuẩn xử lý lỗi, cấu hình | ✅ | 08/2026 |
| 2 — Đăng nhập & tài khoản | 3 cách đăng nhập, quản lý phiên, quản lý thiết bị | ✅ | 08/2026 |
| 3 — Phân quyền | Vai trò, quyền hạn, nhật ký thao tác | ✅ | 09/2026 |
| 4 — Hạ tầng | Lưu trữ ảnh, gửi email, tác vụ tự động | 🟡 80% | 09/2026 |
| 5 — Nghiệp vụ bán hoa | Sản phẩm, giỏ hàng, đơn hàng, thanh toán | 🟡 10% | 12/2026 |
| 6 — Kiểm thử & chất lượng | Kiểm thử tự động, rà soát bảo mật | 🟡 60% | 01/2027 |
| 7 — Vận hành | Máy chủ, tự động triển khai, giám sát | ⬜ | 02/2027 |

---

## 3.3. Đã làm được gì trong kỳ vừa qua (26/08 – 09/09)

| Việc | Kết quả |
|---|---|
| **Bổ sung 466 bài kiểm thử tự động** | Toàn bộ phần nền tảng nay được kiểm tra tự động mỗi lần sửa code |
| **Bổ sung ~30 kịch bản mô phỏng người dùng thật** | Máy tự mở trình duyệt, đăng nhập, thao tác và kiểm tra kết quả |
| **Viết lại toàn bộ tài liệu kỹ thuật** | 13 tài liệu chính + 7 tài liệu chi tiết theo module, có sơ đồ minh hoạ |
| **Rà soát toàn bộ mã nguồn** | Phát hiện 29 điểm cần cải thiện, đã xếp thứ tự ưu tiên và ước lượng |
| Hoàn thiện quản lý danh mục sản phẩm | Thêm/sửa/xoá danh mục dạng cây, có ảnh |
| Bổ sung phân trang danh sách người dùng | |
| Chuẩn hoá lại tài liệu, gom về một nơi | Bạn đang đọc kết quả của việc này |

### Kết quả rà soát mã nguồn

```mermaid
flowchart LR
    R["Rà soát<br/>toàn bộ mã nguồn"] --> A["🔴 6 điểm quan trọng<br/>cần sửa trước khi<br/>mở cho người dùng thật<br/>≈ 1,5 ngày công"]
    R --> B["🟡 13 điểm<br/>cải thiện chất lượng<br/>≈ 5 ngày công"]
    R --> C["🟢 10 điểm<br/>tối ưu thêm<br/>≈ 3 ngày công"]

    style A fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style B fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style C fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

**Về 6 điểm quan trọng**: đây là các lỗ hổng liên quan tới phiên đăng nhập — ví dụ *đổi mật khẩu
xong nhưng thiết bị cũ vẫn đăng nhập được*. Hiện chưa gây rủi ro vì hệ thống chưa mở cho người dùng
thật, và đã được lên lịch xử lý ngay đầu kỳ tới (chỉ mất khoảng 1,5 ngày). Chi tiết kỹ thuật có
trong tài liệu nội bộ của đội phát triển.

> Đây là kết quả của việc **chủ động rà soát**, không phải sự cố phát sinh. Tìm ra sớm khi hệ thống
> chưa có người dùng thật là thời điểm tốt nhất để sửa.

---

## 3.4. Kế hoạch kỳ tới (09/09 – 23/09)

| Việc | Ước lượng | Kết quả bạn sẽ thấy |
|---|---|---|
| Sửa 6 điểm quan trọng từ đợt rà soát | 1,5 ngày | Không thấy trực tiếp — an toàn hơn |
| Thiết lập kiểm tra tự động khi nộp code | 2 ngày | Chất lượng ổn định hơn theo thời gian |
| **Xây dựng module Sản phẩm** (thêm/sửa/xoá, nhiều ảnh — không quản lý tồn kho vì hoa tươi làm theo đơn) | 6 ngày | **Có thể bắt đầu nhập sản phẩm thật vào hệ thống** |
| Màn hình tra cứu nhật ký thao tác | 1 ngày | Xem được ai đã làm gì trên hệ thống |

**Mốc quan trọng cuối kỳ**: bạn có thể đăng nhập vào khu quản trị và **nhập thử sản phẩm thật** —
lần đầu tiên hệ thống chứa dữ liệu của cửa hàng thay vì dữ liệu mẫu.

---

## 3.5. Lộ trình tới khi ra mắt

```mermaid
gantt
    title Lộ trình từ nay tới bản hoàn chỉnh
    dateFormat YYYY-MM-DD
    axisFormat %m/%Y

    section Nghiệp vụ bán hàng
    Sản phẩm & biến thể          :active, p1, 2026-09-09, 21d
    Giỏ hàng                     :p2, after p1, 14d
    Đơn hàng + chọn ngày giờ giao :crit, p3, after p2, 21d
    Thanh toán online            :p4, after p3, 14d

    section Giao diện khách hàng
    Trang danh sách & chi tiết SP :p5, after p1, 21d
    Trang thanh toán             :p6, after p3, 14d

    section Hoàn thiện
    Đánh giá · yêu thích         :p7, after p4, 10d
    Khuyến mãi · mã giảm giá     :p8, after p7, 10d
    Blog · nội dung              :p9, after p8, 7d

    section Vận hành
    Đưa lên máy chủ thật         :crit, p10, after p4, 10d
    Kiểm thử nghiệm thu          :p11, after p10, 10d
    🚀 Ra mắt                     :milestone, after p11, 0d
```

### Các mốc chính

| Mốc | Dự kiến | Bạn làm được gì |
|---|---|---|
| **Nhập sản phẩm thật** | Cuối 09/2026 | Đưa danh mục hoa thật vào hệ thống |
| **Xem thử toàn bộ trang bán hàng** | Cuối 10/2026 | Duyệt hoa như khách hàng thật |
| **Đặt thử một đơn hàng đầu-cuối** | Cuối 11/2026 | Kiểm tra luồng đặt hoa + chọn giờ giao |
| **Bản dùng thử (MVP) trên máy chủ thật** | Cuối 12/2026 | Mời người quen dùng thử, thu phản hồi |
| **Bản hoàn chỉnh** | Cuối 02/2027 | Mở bán chính thức |

> ⚠️ **Lưu ý về mốc thời gian**: các mốc trên giả định 3 điều — (1) không phát sinh yêu cầu mới ngoài
> phạm vi, (2) các mục ở [Trao đổi & quyết định](07-trao-doi.md) được chốt đúng hạn, (3) đội phát
> triển duy trì nhân sự như hiện tại. Rủi ro làm chậm tiến độ được liệt kê tại
> [Rủi ro & phương án](05-rui-ro.md).

---

## 3.6. Điều cần bạn hỗ trợ

| Việc | Cần trước ngày | Vì sao |
|---|---|---|
| Chốt cổng thanh toán (VNPay / Momo / cả hai) | **30/09/2026** | Thủ tục đăng ký với nhà cung cấp mất 2–4 tuần |
| Cung cấp tên miền (domain) | **30/09/2026** | Cần để gửi email không bị vào thư mục spam |
| Cung cấp danh sách sản phẩm mẫu (10–20 loại hoa, có ảnh) | **15/10/2026** | Để dựng và kiểm thử trang bán hàng bằng dữ liệu thật |
| Chốt chính sách giao hàng (khu vực, phí, khung giờ) | **31/10/2026** | Ảnh hưởng trực tiếp tới thiết kế phần đặt hàng |

Chi tiết từng mục: [Trao đổi & quyết định](07-trao-doi.md).
