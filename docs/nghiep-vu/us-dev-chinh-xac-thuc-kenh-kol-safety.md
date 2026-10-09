# User story chính cho Dev — Xác thực kênh bằng KOL Safety

| Mục | Giá trị |
|---|---|
| **Sản phẩm** | KOL Hub |
| **Tài liệu đầy đủ** | Nghiệp vụ: `docs/nghiep-vu/xac-thuc-kenh-kol-safety.md` · US design: `us-xac-thuc-kenh-kol-safety.md` · US dev chi tiết (23 story, API, task FE/BE): `us-dev-xac-thuc-kenh-kol-safety.md` |
| **Phiên bản** | v0.2 rút gọn · 08/10/2026 |

Bản này chỉ giữ 12 story chính để đưa vào backlog. API, task FE/BE, mã lỗi và quy tắc chi tiết xem ở bản US dev chi tiết theo cột "Gồm".

## Cách chấm điểm

Ba chỉ số chấm theo thang **1 · 2 · 3 · 5 · 8 · 13 · 20**, so tương đối giữa các story trong bộ này:

| Chỉ số | Câu hỏi khi chấm |
|---|---|
| **User Value** | Người dùng (KOL, MCN, Nhãn hàng, Admin) được lợi bao nhiêu khi story này xong? |
| **Time Critical** | Chậm thì mất gì? Story có chặn story khác, hay phải xong đúng ngày ra mắt không? |
| **Risk / Opportunity** | Làm sớm giảm được rủi ro gì (tích hợp, dữ liệu, pháp lý) hoặc mở ra cơ hội gì? |

**Story point** theo dev mid-level, 1 point ≈ nửa ngày công. **WSJF** = (User Value + Time Critical + Risk / Opportunity) ÷ Story point; càng cao càng nên làm sớm, trong giới hạn phụ thuộc kỹ thuật.

## Bảng chấm điểm (xếp theo WSJF)

| Mã | Story | Story point | User Value | Time Critical | Risk / Opportunity | Cost of Delay | WSJF |
|---|---|---|---|---|---|---|---|
| DEV-07 | Nhãn hàng thấy dấu xác thực theo kênh | 3 | 20 | 8 | 8 | 36 | 12.0 |
| DEV-11 | Chuyển dữ liệu kênh đã xác thực hiện có | 3 | 3 | 13 | 13 | 29 | 9.7 |
| DEV-01 | Mô hình dữ liệu và máy trạng thái kênh | 5 | 3 | 13 | 20 | 36 | 7.2 |
| DEV-08 | Chặn kênh không hợp lệ trong booking | 3 | 5 | 5 | 8 | 18 | 6.0 |
| DEV-04 | Nhận kết quả quét từ KOL Safety | 8 | 8 | 13 | 13 | 34 | 4.2 |
| DEV-12 | Gỡ Khiên An toàn và Badge cấp tài khoản | 3 | 2 | 5 | 3 | 10 | 3.3 |
| DEV-09 | Gia hạn kênh mỗi 3 tháng | 5 | 8 | 3 | 5 | 16 | 3.2 |
| DEV-03 | Xác thực kênh qua KOL Safety | 13 | 13 | 13 | 13 | 39 | 3.0 |
| DEV-02 | Hỗ trợ Instagram | 8 | 8 | 5 | 8 | 21 | 2.6 |
| DEV-06 | Admin duyệt chủ sở hữu kênh | 8 | 8 | 8 | 5 | 21 | 2.6 |
| DEV-05 | Quản lý kênh: trạng thái, tiến độ, nội dung chưa đạt | 13 | 13 | 8 | 5 | 26 | 2.0 |
| DEV-10 | Hết hạn, nhắc gia hạn và thông báo | 8 | 5 | 5 | 3 | 13 | 1.6 |
| | **Tổng** | **80** | | | | | |

**Lưu ý thứ tự làm:** WSJF chỉ xếp theo giá trị trên công sức. DEV-07 đứng đầu nhưng cần DEV-01, DEV-03, DEV-04, DEV-06 xong trước mới có kênh để hiện dấu. Thứ tự làm thực tế: DEV-01 → DEV-11 → DEV-03 và DEV-04 → DEV-05, DEV-06 → DEV-07, DEV-08 → phần còn lại.

## User story

### DEV-01 · Mô hình dữ liệu và máy trạng thái kênh

**[US] Là hệ thống KOL Hub, tôi muốn lưu trạng thái xác thực KOL Safety và phiên quét của từng kênh theo một máy trạng thái duy nhất, để mọi màn hình và API đọc cùng một nguồn sự thật.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 5 | 3 | 13 | 20 | 7.2 |

- **AC chính:** Có trạng thái Chờ xác thực KOL Safety, phiên quét và nội dung quét; mọi chuyển trạng thái đi qua một service, có unit test.
- **Gồm:** DEV-01 (bản chi tiết)

### DEV-02 · Hỗ trợ Instagram

**[US] Là KOL/MCN có kênh Instagram, tôi muốn thêm, xác thực và dùng kênh Instagram trong chiến dịch như các nền tảng khác, để không bị loại khỏi sàn chỉ vì nền tảng.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 8 | 8 | 5 | 8 | 2.6 |

- **AC chính:** Nhận diện link instagram.com; Instagram có ở mọi bộ lọc nền tảng, hạng mục chiến dịch và xác minh link bài đăng.
- **Gồm:** DEV-02 (bản chi tiết)

### DEV-03 · Xác thực kênh qua KOL Safety

**[US] Là KOL/MCN, tôi muốn xem quy tắc, cam đoan rồi bấm một nút để sang KOL Safety quét đúng N nội dung gần nhất của kênh, để được xác thực kênh mà không phải đăng ký lại hay tự chọn nội dung.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 13 | 13 | 13 | 13 | 3.0 |

- **AC chính:** Chặn khi kênh chưa đủ N nội dung hoặc chưa cam đoan; chốt danh sách N nội dung 7 ngày; mở KOL Safety bằng token dùng một lần.
- **Gồm:** DEV-04, DEV-09, DEV-11 (bản chi tiết)

### DEV-04 · Nhận kết quả quét từ KOL Safety

**[US] Là hệ thống KOL Hub, tôi muốn nhận kết quả quét từng nội dung qua webhook và đối soát được khi lỡ, để tiến độ và trạng thái kênh luôn đúng.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 8 | 8 | 13 | 13 | 4.2 |

- **AC chính:** Kiểm chữ ký, chống xử lý trùng; đủ N/N đạt thì kênh sang Chờ duyệt; có nút Làm mới và job đối soát.
- **Gồm:** DEV-05, DEV-06 (bản chi tiết)

### DEV-05 · Quản lý kênh: trạng thái, tiến độ, nội dung chưa đạt

**[US] Là KOL/MCN có nhiều kênh, tôi muốn thấy trạng thái, tiến độ x/N, hạn của từng kênh và lý do từng nội dung chưa đạt, để biết kênh nào cần xử lý và sửa gì.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 13 | 13 | 8 | 5 | 2.0 |

- **AC chính:** Thêm kênh vào trạng thái chờ KOL Safety; 7 tab có số đếm; badge 9 trạng thái; lý do hiện nguyên văn từ KOL Safety.
- **Gồm:** DEV-07, DEV-08, DEV-10 (bản chi tiết)

### DEV-06 · Admin duyệt chủ sở hữu kênh

**[US] Là Admin vận hành, tôi muốn duyệt các kênh đã đạt KOL Safety và đánh giá Đạt hoặc Cần bổ sung, để cấp dấu xác thực cho đúng chủ sở hữu.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 8 | 8 | 8 | 5 | 2.6 |

- **AC chính:** Hàng chờ xếp chờ lâu nhất trước; Cần bổ sung bắt buộc lý do; Đạt thì cấp dấu 3 tháng; sửa ảnh không phải quét lại, sửa link thì phải quét lại.
- **Gồm:** DEV-13, DEV-14 (bản chi tiết)

### DEV-07 · Nhãn hàng thấy dấu xác thực theo kênh

**[US] Là Nhãn hàng, tôi muốn thấy dấu xác thực, hạn và phạm vi kiểm tra trên từng kênh, để chọn đúng kênh an toàn và tự đánh giá rủi ro phần không được kiểm tra.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 3 | 20 | 8 | 8 | 12.0 |

- **AC chính:** Tìm kiếm và hồ sơ công khai chỉ dùng kênh còn hạn; tooltip ghi rõ chỉ kiểm tra 3 phút đầu; không lộ kết quả từng nội dung.
- **Gồm:** DEV-18 (bản chi tiết)

### DEV-08 · Chặn kênh không hợp lệ trong booking

**[US] Là KOL/MCN, tôi muốn chỉ chọn được kênh còn hạn khi ứng tuyển hoặc nhận lời mời và thấy lý do kênh bị khoá, để không bị báo lỗi lúc gửi.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 3 | 5 | 5 | 8 | 6.0 |

- **AC chính:** Kiểm kênh hợp lệ ở mọi điểm dùng kênh (KOLHUB-4809); kênh không hợp lệ hiện khoá kèm lý do.
- **Gồm:** DEV-21 (bản chi tiết)

### DEV-09 · Gia hạn kênh mỗi 3 tháng

**[US] Là KOL/MCN, tôi muốn gia hạn kênh bằng một lần quét lại N nội dung gần nhất, để giữ dấu thêm 3 tháng mà không phải chờ Admin.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 5 | 8 | 3 | 5 | 3.2 |

- **AC chính:** Mở gia hạn khi còn ≤ 14 ngày hoặc đã hết hạn; đạt thì hạn mới nối tiếp hạn cũ; trượt khi còn hạn thì giữ dấu tới hạn cũ.
- **Gồm:** DEV-15 (bản chi tiết)

### DEV-10 · Hết hạn, nhắc gia hạn và thông báo

**[US] Là KOL/MCN, tôi muốn được báo khi kênh đạt, được duyệt, cần bổ sung, sắp hết hạn hoặc đã gia hạn, để xử lý kịp mà không phải vào kiểm tra liên tục.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 8 | 5 | 5 | 3 | 1.6 |

- **AC chính:** Job hằng ngày chuyển Hết hạn, nhắc ở 14 · 7 · 1 ngày, không gửi trùng; 5 loại thông báo trong app và email.
- **Gồm:** DEV-12, DEV-16 (bản chi tiết)

### DEV-11 · Chuyển dữ liệu kênh đã xác thực hiện có

**[US] Là hệ thống KOL Hub, tôi muốn chuyển các kênh đang có dấu sang quy tắc mới theo phương án đã chốt, để không kênh nào bị mất dấu bất ngờ khi ra mắt.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 3 | 3 | 13 | 13 | 9.7 |

- **AC chính:** Có dry-run báo cáo số kênh bị ảnh hưởng; chạy lại an toàn. Phương án tạm: giữ dấu tới hạn cũ.
- **Gồm:** DEV-03 (bản chi tiết)

### DEV-12 · Gỡ Khiên An toàn và Badge cấp tài khoản

**[US] Là hệ thống KOL Hub, tôi muốn gỡ phần Khiên An toàn, bật/tắt KOL Safety và Badge cấp tài khoản của R7, để không còn hai cơ chế xác thực chồng nhau.**

| Story point | User Value | Time Critical | Risk / Opportunity | WSJF |
|---|---|---|---|---|
| 3 | 2 | 5 | 3 | 3.3 |

- **AC chính:** Gỡ màn, menu, API, mã lỗi 4510–4514; link cũ chuyển về Quản lý kênh.
- **Gồm:** DEV-23 (bản chi tiết)

## Đã lược khỏi bản này

| Story chi tiết | Lý do lược | Point |
|---|---|---|
| DEV-17 Khối Kênh đã xác thực ở Tổng quan hồ sơ | Tiện ích, không chặn luồng chính | 3 |
| DEV-19 Kênh hết hạn trong Danh sách đã lưu | Nhỏ, gộp khi làm DEV-07 | 1 |
| DEV-20 Cảnh báo nháp dài hơn 3 phút | Phụ thuộc điểm chưa chốt (nháp có quét KOL Safety không) | 2 |
| DEV-22 Lọc kênh sắp hết hạn theo KOL (MCN) | Tiện ích cho MCN, làm sau | 2 |
| C-01, C-02, C-03 Stub KOL Safety, kiểm thử E2E, dự phòng | Việc chung của team, không phải story | 11 |

Story point bản rút gọn được làm tròn lên số Fibonacci khi gộp nhiều story chi tiết (ví dụ DEV-03 gộp 5 + 5 + 2 = 12 → 13), nên tổng không khớp từng số với bản chi tiết.
