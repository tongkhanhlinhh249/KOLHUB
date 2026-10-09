# User story chính — Tạo chiến dịch Booking KOL và mời KOL

| Mục | Giá trị |
|---|---|
| **Sản phẩm** | KOL Hub |
| **Tài liệu đầy đủ** | `docs/nghiep-vu/tao-chien-dich-booking-kol.md` — mã BR/EC và "Mục" trỏ về tài liệu này |
| **Phiên bản** | v0.1 rút gọn · 08/10/2026 |

Bản này chỉ giữ các story chính: **6 story PO** (trải nghiệm người dùng, dùng để thiết kế và nghiệm thu) và **6 story Dev** (triển khai). Luồng chi tiết, quy tắc, thông báo lỗi xem ở tài liệu nghiệp vụ.

## Cách chấm điểm

Ba chỉ số chấm theo thang **1 · 2 · 3 · 5 · 8 · 13 · 20**, so tương đối trong từng bộ:

| Chỉ số | Câu hỏi khi chấm |
|---|---|
| **User Value** | Nhãn hàng được lợi bao nhiêu khi story xong? |
| **Time Critical** | Chậm thì mất gì? Có chặn story khác hoặc phải có ngày ra mắt không? |
| **Risk / Opportunity** | Làm sớm giảm rủi ro gì (dữ liệu sai, booking sai) hoặc mở ra cơ hội gì? |

**Story point:** PO tính theo Product Designer mid-level, Dev theo dev mid-level; 1 point ≈ nửa ngày công. **WSJF** = (User Value + Time Critical + Risk / Opportunity) ÷ Story point, càng cao càng nên làm trước.

## Story PO (xếp theo WSJF)

| Mã | Story | Point | User Value | Time Critical | Risk / Opp. | WSJF | Prototype |
|---|---|---|---|---|---|---|---|
| PO-04 | Chọn chiến dịch còn hạn khi mời KOL | 2 | 13 | 13 | 8 | 17.0 | Chưa làm (đang hiện cả chiến dịch quá hạn) |
| PO-01 | Tạo chiến dịch Booking với form tối giản | 3 | 20 | 13 | 8 | 13.7 | Đã làm |
| PO-06 | Xem kết quả sau khi mời | 1 | 5 | 3 | 3 | 11.0 | Đã có |
| PO-02 | Tính năng nâng cao gập sẵn | 2 | 8 | 5 | 3 | 8.0 | Đã làm |
| PO-05 | Mời nhiều KOL một lúc từ thư viện KOL | 3 | 13 | 5 | 5 | 7.7 | Chưa làm (mới có ở Danh sách đã lưu) |
| PO-03 | Đăng chiến dịch Booking lên Sàn | 2 | 5 | 3 | 5 | 6.5 | Đã làm |
| | **Tổng** | **13** | | | | | |

### PO-01 · Tạo chiến dịch Booking với form tối giản

**[US] Là Nhãn hàng, tôi muốn tạo chiến dịch Booking chỉ với tên, hạng mục, brief, ngân sách và thời gian, để có chiến dịch mời KOL trong vài phút mà không phải lướt qua 16 đầu mục.**

- **AC chính:** Form chỉ còn khối Nội dung cần làm (hạng mục + brief) và Ngân sách và thời gian; không còn ô chọn nền tảng riêng; brief bắt buộc khi đăng.
- **Tham chiếu:** Mục 2 · BR-02…BR-08 · **Prototype:** Đã làm

### PO-02 · Tính năng nâng cao gập sẵn

**[US] Là Nhãn hàng, tôi muốn các tuỳ chọn ít dùng được gộp vào một khối gập có dòng tóm tắt, để form gọn nhưng vẫn biết chiến dịch đang thiết lập thế nào.**

- **AC chính:** Khối gập mặc định, hiện tóm tắt (Riêng tư · Đàm phán · Duyệt nháp · Hợp đồng); có lỗi bên trong thì tự mở.
- **Tham chiếu:** Mục 3 · BR-10, BR-14, BR-15 · **Prototype:** Đã làm

### PO-03 · Đăng chiến dịch Booking lên Sàn

**[US] Là Nhãn hàng, tôi muốn đưa chiến dịch Booking lên Sàn khi cần, để vừa mời KOL vừa nhận thêm đề xuất từ KOL/MCN khác.**

- **AC chính:** Chọn Trên Sàn mới hiện Hạn ứng tuyển, Lĩnh vực, Điều kiện tham gia, Câu hỏi khảo sát; Riêng tư không lưu điều kiện và khảo sát.
- **Tham chiếu:** Mục 3 · BR-11…BR-13 · **Prototype:** Đã làm

### PO-04 · Chọn chiến dịch còn hạn khi mời KOL

**[US] Là Nhãn hàng, tôi muốn bấm Mời ở thư viện KOL là thấy ngay các chiến dịch Booking còn hạn của mình để chọn, để không mời nhầm vào chiến dịch đã hết hạn.**

- **AC chính:** Danh sách chỉ gồm Booking riêng Bản nháp/Đang mở/Đang chạy, ngày kết thúc chưa qua, sắp hết hạn lên đầu kèm "còn N ngày"; chưa có chiến dịch thì có nút Tạo chiến dịch.
- **Tham chiếu:** Mục 4 · BR-17, BR-18 · EC-11 · **Prototype:** Chưa làm (đang hiện cả chiến dịch quá hạn)

### PO-05 · Mời nhiều KOL một lúc từ thư viện KOL

**[US] Là Nhãn hàng, tôi muốn tick nhiều KOL trong thư viện KOL rồi mời một lần, để không phải mở từng hồ sơ để mời.**

- **AC chính:** Ô chọn trên thẻ và dòng KOL; thanh thao tác "Mời X KOL vào chiến dịch"; chỉ chọn KOL, không chọn kênh hay MCN.
- **Tham chiếu:** Mục 4 · BR-19, BR-20 · **Prototype:** Chưa làm (mới có ở Danh sách đã lưu)

### PO-06 · Xem kết quả sau khi mời

**[US] Là Nhãn hàng, tôi muốn biết KOL nào đã nhận lời mời và KOL nào bị bỏ qua vì sao, để xử lý tiếp mà không phải đoán.**

- **AC chính:** Màn kết quả tách lời mời mới, lời mời được bổ sung KOL, KOL bị bỏ qua kèm lý do; có nút Xem chiến dịch.
- **Tham chiếu:** Mục 4 · BR-24 · EC-10 · **Prototype:** Đã có

## Story Dev (xếp theo WSJF)

| Mã | Story | Point | User Value | Time Critical | Risk / Opp. | WSJF | Prototype |
|---|---|---|---|---|---|---|---|
| DEV-01 | Quy tắc đăng chiến dịch Booking | 3 | 13 | 13 | 13 | 13.0 | Đã làm, có test |
| DEV-04 | Chỉ mời được vào chiến dịch còn hạn | 3 | 13 | 13 | 13 | 13.0 | Chưa làm |
| DEV-06 | Mời hàng loạt: định tuyến, gom và bỏ qua | 5 | 20 | 20 | 13 | 10.6 | Có ở prototype, cần làm thật |
| DEV-02 | Form Booking rút gọn và khối Tính năng nâng cao | 5 | 20 | 13 | 5 | 7.6 | Đã làm |
| DEV-03 | Điều kiện và khảo sát chỉ khi đăng lên Sàn | 2 | 3 | 2 | 8 | 6.5 | Đã làm, có test |
| DEV-05 | Chọn nhiều KOL ở thư viện KOL | 5 | 13 | 5 | 5 | 4.6 | Chưa làm |
| | **Tổng** | **23** | | | | | |

### DEV-01 · Quy tắc đăng chiến dịch Booking

**[US] Là hệ thống KOL Hub, tôi muốn chặn đăng chiến dịch Booking khi thiếu brief và tự lấy nền tảng theo hạng mục, để mọi lời mời gửi đi đều có đủ thông tin cho KOL làm việc.**

- **AC chính:** Brief trống → 4803 brief khi đăng và khi sửa chiến dịch đang mở; nền tảng = tập nền tảng của hạng mục; Tuyển nhiều KOL không đổi.
- **Tham chiếu:** BR-03, BR-04, BR-06 · EC-01, EC-02 · **Prototype:** Đã làm, có test

### DEV-02 · Form Booking rút gọn và khối Tính năng nâng cao

**[US] Là Nhãn hàng, tôi muốn form Booking chỉ hiện trường bắt buộc và gộp phần còn lại vào khối nâng cao, để tạo chiến dịch nhanh.**

- **AC chính:** Bố cục theo mục 2–3; lỗi hiện đúng ô, cuộn tới ô lỗi; lỗi trong khối nâng cao thì tự mở khối; Tuyển nhiều KOL giữ form đầy đủ.
- **Tham chiếu:** BR-02, BR-10, BR-14, BR-15 · **Prototype:** Đã làm

### DEV-03 · Điều kiện và khảo sát chỉ khi đăng lên Sàn

**[US] Là hệ thống KOL Hub, tôi muốn bỏ điều kiện tham gia và câu hỏi khảo sát khi chiến dịch Riêng tư, để không lưu dữ liệu không có tác dụng.**

- **AC chính:** Riêng tư: lưu rỗng regions, target, survey; Trên Sàn: lưu như cũ.
- **Tham chiếu:** BR-12, BR-13 · **Prototype:** Đã làm, có test

### DEV-04 · Chỉ mời được vào chiến dịch còn hạn

**[US] Là Nhãn hàng, tôi muốn hộp mời chỉ liệt kê và chỉ cho mời vào chiến dịch còn hạn, để không tạo booking cho chiến dịch đã hết thời gian chạy.**

- **AC chính:** Lọc ngày kết thúc chưa qua ở danh sách và chặn ở inviteKols (4802); xếp sắp hết hạn lên đầu, hiện "còn N ngày".
- **Tham chiếu:** BR-18 · EC-12 · **Prototype:** Chưa làm

### DEV-05 · Chọn nhiều KOL ở thư viện KOL

**[US] Là Nhãn hàng, tôi muốn chọn nhiều KOL ngay trong thư viện KOL và mời một lần, để mời hàng loạt không phải lưu vào danh sách trước.**

- **AC chính:** Ô chọn ở chế độ Thẻ và Bảng, giữ lựa chọn khi đổi trang/bộ lọc, thanh thao tác dùng lại BulkBar; truyền nhiều KOL vào hộp mời.
- **Tham chiếu:** BR-19, BR-20 · **Prototype:** Chưa làm

### DEV-06 · Mời hàng loạt: định tuyến, gom và bỏ qua

**[US] Là hệ thống KOL Hub, tôi muốn xử lý một lượt mời nhiều KOL theo đúng quy tắc định tuyến KOL/MCN, để mỗi KOL nhận đúng một lời mời qua đúng người.**

- **AC chính:** Tự gán kênh hợp lệ còn hạn; KOL giữ kênh MCN → lời mời tới MCN; gom vào lời mời đang chờ của MCN; bỏ qua KOL đã mời/không hiển thị kèm lý do; hết hạn sau 7 ngày.
- **Tham chiếu:** BR-20…BR-27 · EC-08…EC-10 · **Prototype:** Có ở prototype, cần làm thật

## Ghi chú

- **Phần đã làm trên prototype** (PO-01…03, DEV-01…03) vẫn giữ trong backlog vì bản thật phải làm lại; cột Prototype giúp team biết chỗ nào đã có mẫu để tham khảo.
- **Nên làm trước:** PO-04 và DEV-04 (chiến dịch còn hạn). Chưa làm thì Nhãn hàng vẫn mời được vào chiến dịch đã hết thời gian chạy.
- **Thứ tự làm thực tế Dev:** DEV-01 → DEV-02, DEV-03 → DEV-06 → DEV-04 → DEV-05. DEV-06 có WSJF thấp hơn DEV-01, DEV-04 nhưng là nền của mọi lời mời nên làm sớm ở bản thật.
- **Còn chờ chốt** (ảnh hưởng điểm): ngân sách có bắt buộc không; có tách lối vào "Booking KOL" và "Tuyển nhiều KOL" không; có cho giá riêng từng KOL trong một lượt mời không. Nếu cho giá riêng, DEV-06 và PO-05 tăng khoảng 2–3 point.
