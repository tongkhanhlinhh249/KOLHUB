# KOLHUB — Nghiệp vụ công bố và hiển thị chiến dịch trên sàn

**Phiên bản:** 1.0 — 15/10/2026  
**Phạm vi:** Sau khi Admin duyệt chiến dịch, kết nối EP02 với Sàn chiến dịch và phân hệ ứng tuyển.  
**Người sử dụng:** PO/BA, Product Design, Dev, QA, vận hành.  
**Trạng thái:** Bản đề xuất bàn giao. Các quy tắc bổ sung cho sàn được ghi rõ; không mặc định là chức năng đã triển khai.

## 1. Phân tích và mục tiêu

Chiến dịch do nhãn hàng/Agency tạo là nguồn dữ liệu duy nhất để công bố lên sàn. Không yêu cầu nhãn hàng tạo lại một bài đăng riêng trên sàn hoặc nhập lại brief.

Cần tách ba khái niệm:
- **Được duyệt:** Admin chấp thuận một phiên bản nội dung.
- **Được công bố:** Phiên bản đó trở thành nội dung công khai, có đường dẫn chi tiết.
- **Đang nhận ứng tuyển:** Chiến dịch đáp ứng điều kiện tiếp nhận đơn tại thời điểm thao tác.

Một chiến dịch có thể đã công bố nhưng đã đóng tuyển; khi đó trang chi tiết còn truy cập được, nhưng không còn trong danh sách cơ hội đang tuyển.

**Mục tiêu:** Nhãn hàng được tiếp cận KOL/MCN ngay sau khi chiến dịch được công bố hợp lệ; KOL/MCN xem được thông tin đủ để quyết định và gửi ứng tuyển đúng kênh.

**US tổng quát:** [US] Là nhãn hàng, tôi muốn chiến dịch được Admin duyệt tự động công bố trên Sàn chiến dịch KOLHUB khi đủ điều kiện, để tiếp cận KOL/MCN và nhận đơn ứng tuyển mà không phải đăng lại.

## 2. Phạm vi MVP và ranh giới

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Công bố phiên bản được duyệt, cấp URL, đồng bộ danh sách sàn | Thiết kế và xử lý form tạo chiến dịch |
| Danh sách, tìm kiếm/lọc, trang chi tiết công khai | Thuật toán gợi ý cá nhân hóa, quảng cáo/đẩy top |
| Kiểm tra điều kiện và điều hướng ứng tuyển | Chi tiết thương lượng, chốt booking và thay thế KOL |
| Hiển thị trạng thái đã ứng tuyển theo người dùng | Chat, duyệt nội dung, nghiệm thu, thanh toán |
| Đóng tuyển, hết hạn, cập nhật bản sửa, ẩn/gỡ | Mở lại tuyển sau khi đóng trong MVP |
| Phân quyền công khai/nội bộ, thông báo công bố | Ví, giữ tiền hoặc bảo đảm thanh toán |

EP02 sở hữu dữ liệu và vòng đời chiến dịch. EP04 sở hữu trải nghiệm khám phá trên sàn. Phân hệ ứng tuyển sở hữu đơn, chống trùng và trạng thái đơn. Không sao chép thành các chiến dịch độc lập.

## 3. Vai trò

| Vai trò | Quyền |
|---|---|
| Khách chưa đăng nhập | Đề xuất MVP: xem danh sách và nội dung công khai; đăng nhập để ứng tuyển |
| KOL | Xem, chọn kênh có quyền sử dụng, ứng tuyển khi đủ điều kiện |
| MCN | Xem và ứng tuyển bằng kênh của KOL mình được phép đại diện |
| Nhãn hàng/Agency | Xem bản công khai, quản lý chiến dịch thuộc tổ chức và truy cập danh sách ứng viên |
| Admin | Duyệt đúng phiên bản, ẩn/gỡ, khôi phục theo quyền và ghi lý do |

Tài khoản nhãn hàng không được ứng tuyển bằng vai trò nhãn hàng. Nếu hệ thống cho nhiều vai trò, yêu cầu chuyển đúng vai trò trước khi tiếp tục.

## 4. Điều kiện công bố và nhận ứng tuyển

### 4.1. Công bố lần đầu

Sau khi Admin chọn Duyệt, hệ thống kiểm tra lại:
1. Người duyệt có quyền.
2. Phiên bản được duyệt vẫn là bản đang chờ duyệt; chưa bị rút hoặc thay thế.
3. Tổ chức chủ chiến dịch còn hoạt động, đã xác minh và đáp ứng quyền đại diện thương hiệu.
4. Dữ liệu bắt buộc đầy đủ, lịch hợp lệ, hạn ứng tuyển còn ở tương lai.
5. Chiến dịch chưa hủy và không có quyết định chặn hiển thị.

Đủ điều kiện thì tự công bố; nhãn hàng không cần bấm thêm nút Public. Lưu phiên bản công khai, thời điểm công bố, quyết định duyệt và chuyển trạng thái Đang tuyển.

Nếu hạn đã qua trong lúc chờ duyệt: không công bố, yêu cầu cập nhật thời gian và gửi duyệt lại. Nếu phiên bản đã thay đổi: từ chối duyệt bản cũ và yêu cầu Admin tải lại.

### 4.2. Điều kiện xuất hiện trong danh sách đang tuyển

Chiến dịch phải đồng thời:
- Có phiên bản đã công bố hợp lệ.
- Có trạng thái Đang tuyển.
- Chưa đến hạn ứng tuyển.
- Không bị ẩn/gỡ.
- Không đang tạm ngừng nhận đơn vì duyệt lại điều kiện hợp tác.

### 4.3. Điều kiện gửi đơn

Ngoài điều kiện chiến dịch, kiểm tra thêm người dùng đã đăng nhập, đúng vai trò, có quyền trên kênh, kênh xác thực còn hiệu lực và đáp ứng nền tảng/nhóm đầu việc.

Kiểm tra tại máy chủ ở thời điểm gửi. Card hoặc trang chi tiết đang mở không phải căn cứ cho phép gửi đơn.

## 5. Luồng chính

1. Admin duyệt bản đang chờ.
2. Hệ thống kiểm tra điều kiện công bố.
3. Lưu bản công khai, URL và thời điểm công bố; chuyển Đang tuyển.
4. Cập nhật danh sách/tìm kiếm trên sàn và gửi thông báo cho nhãn hàng.
5. KOL/MCN tìm thấy card và mở chi tiết.
6. Chọn Ứng tuyển.
7. Chưa đăng nhập: đăng nhập xong trở lại đúng chiến dịch.
8. Kiểm tra hồ sơ, quyền sử dụng kênh và điều kiện ứng tuyển.
9. Người dùng chọn kênh/nhóm đầu việc, hoàn thiện thông tin theo form ứng tuyển và xác nhận gửi.
10. Phân hệ ứng tuyển tạo đơn, lưu phiên bản brief tại thời điểm gửi và trả kết quả.
11. Trang hiển thị Đã ứng tuyển hoặc trạng thái theo nhóm; nhãn hàng nhìn thấy đơn trong quản lý ứng viên.

Nếu gửi lỗi, giữ thông tin đã nhập để thử lại và không báo thành công khi chưa tạo đơn.

## 6. Danh sách chiến dịch trên sàn

### 6.1. Nguyên tắc

Sàn phục vụ KOL/MCN tìm cơ hội; khác danh sách quản lý nội bộ phục vụ nhãn hàng xử lý công việc. Không dùng nguyên card quản lý nội bộ cho sàn.

### 6.2. Card công khai

| Thông tin | Quy tắc |
|---|---|
| Ảnh và tên | Ảnh 16:9; tên tối đa hai dòng |
| Nhãn hàng | Tên thương hiệu được quảng bá |
| Nền tảng | Icon/nhãn nền tảng cần hợp tác |
| Quyền lợi | Tiền, sản phẩm/trải nghiệm hoặc kết hợp; tách rõ tiền và quà |
| Hạn ứng tuyển | Ngày kết thúc; đề xuất nhấn Sắp hết hạn khi còn không quá 24 giờ |
| Số KOL cần tuyển | Theo mô hình Booking 1 KOL / nhiều KOL sau khi chốt cách đếm |
| CTA | Xem chiến dịch; vào chi tiết rồi thực hiện ứng tuyển |

Không hiển thị trên card: ngân sách nội bộ, số đơn chưa xử lý, doanh thu, trạng thái booking, dữ liệu vi phạm riêng tư, brief dài hoặc thông tin người ứng tuyển.

Nếu các nhóm có thù lao khác nhau, không cộng thành một mức thu nhập cho mỗi KOL. Đề xuất card ghi “Quyền lợi theo hạng mục”; chi tiết hiển thị từng nhóm cùng đơn vị VND/booking.

### 6.3. Tìm kiếm, lọc và sắp xếp — đề xuất MVP

- Tìm theo tên chiến dịch hoặc thương hiệu.
- Lọc theo nền tảng, ngành hàng, khu vực và loại quyền lợi.
- Có Xóa bộ lọc; các bộ lọc kết hợp phải cho kết quả nhất quán.
- Sắp xếp mặc định Mới nhất theo thời điểm công bố đầu tiên; thêm Sắp hết hạn.
- Sửa nội dung không tự đẩy chiến dịch lên đầu như chiến dịch mới.
- Có phân trang, trạng thái tải, lỗi tải và không có kết quả.
- MVP chưa đưa các tab nháp/chờ duyệt/đã hủy của quản trị lên sàn công khai.

## 7. Trang chi tiết công khai

### 7.1. Thứ tự nội dung

1. Tên, ảnh, nhãn hàng, tổ chức vận hành và trạng thái nhận ứng tuyển.
2. Tóm tắt quyền lợi, nền tảng, số KOL cần tuyển, hạn ứng tuyển.
3. CTA ứng tuyển.
4. Giới thiệu sản phẩm, mục tiêu và brief.
5. Đầu việc theo nhóm/nền tảng, quyền lợi tương ứng và mốc bàn giao.
6. Tiêu chí tham gia, thông điệp bắt buộc, quyền sử dụng nội dung.
7. Tài liệu công khai, địa điểm trải nghiệm và thông tin hỗ trợ.

Không bắt buộc người dùng đọc hết trang mới nhìn thấy CTA. Trên mobile có thể cố định CTA cuối màn hình nhưng không che nội dung.

### 7.2. Quyền lợi và tiêu chí

- Tiền dùng đơn vị VND/booking theo tài liệu EP02; không tự đổi thành VND/người nếu một người có nhiều booking.
- Sản phẩm/trải nghiệm trình bày riêng; không diễn đạt giá trị quà như tiền được nhận.
- Thanh toán ngoài hệ thống theo phạm vi MVP hiện tại; không ghi “đã bảo đảm thanh toán”.
- Follower là tiêu chí nhãn hàng xét thủ công; không tự khóa ứng tuyển bằng chỉ số chưa đủ căn cứ.
- Các điều kiện bắt buộc phải được công khai trước khi người dùng gửi đơn.
- Lịch cho phép tuyển chọn liên tục trước hạn; không bắt buộc đợi kết thúc ứng tuyển mới chọn KOL.

## 8. CTA theo ngữ cảnh

| Ngữ cảnh | CTA/hiển thị | Hành vi |
|---|---|---|
| Khách, chiến dịch còn tuyển | Đăng nhập để ứng tuyển | Đăng nhập rồi quay lại chiến dịch |
| KOL/MCN có kênh phù hợp | Ứng tuyển | Mở luồng chọn kênh/nhóm |
| Chưa có kênh | Thêm kênh để ứng tuyển | Sang quản lý kênh, giữ đường quay lại |
| Kênh chưa xác thực/hết hạn | Xác thực kênh hoặc Gia hạn kênh | Giải thích điều kiện; không cho gửi bằng kênh không hợp lệ |
| Đã có đơn đang hiệu lực cho kênh/nhóm | Xem đơn ứng tuyển | Không tạo đơn trùng |
| Có nhóm khác vẫn ứng tuyển được | Ứng tuyển hạng mục khác | Chỉ hiện lựa chọn còn hợp lệ |
| Hết hạn/đóng tuyển | Đã đóng tuyển | Khóa gửi đơn mới; giữ quyền xem đơn cũ |
| Tạm dừng vì bản sửa | Tạm ngừng nhận ứng tuyển | Giải thích đang cập nhật; không nhận đơn mới |
| Bị ẩn/gỡ/hủy | Chiến dịch không còn khả dụng | Không lộ nội dung/tệp riêng; người tham gia vào khu vực công việc riêng |
| Chủ chiến dịch | Quản lý chiến dịch | Về trang quản lý nội bộ theo quyền |

Nhãn Đã ứng tuyển được xác định theo người dùng/kênh/nhóm, không suy luận chỉ từ việc tài khoản có một đơn trong chiến dịch đa nhóm.

## 9. Booking 1 KOL và Booking nhiều KOL

Yêu cầu mới của sản phẩm: cả hai hình thức đều cho mời và nhận nhiều ứng viên; khác nhau ở số người được chọn.

| Quy tắc | Booking 1 KOL | Booking nhiều KOL |
|---|---|---|
| Số người có thể ứng tuyển | Nhiều | Nhiều |
| Số người được chọn | Tối đa 1 KOL duy nhất toàn chiến dịch | Tối đa số KOL cấu hình |
| Số kênh/đầu việc của người được chọn | Có thể nhiều theo thỏa thuận | Có thể nhiều theo thỏa thuận |
| Tự đóng khi nhiều đơn | Không | Không |
| Đủ người đã chọn | Cảnh báo chủ chiến dịch, không tự đóng | Cảnh báo chủ chiến dịch, không tự đóng |

**Điểm cần đồng bộ trước triển khai:** EP02 gốc tính suất theo booking/kênh/nhóm. Không dùng số suất này làm số KOL duy nhất. Cần chốt định danh KOL được MCN đại diện và thời điểm tính “đã chọn” hay “đã xác nhận”. Giới hạn người và giới hạn booking/nhóm phải được kiểm tra riêng ở tuyển chọn.

Tài liệu này không tự thay đổi quy tắc chống trùng của phân hệ ứng tuyển: một kênh không có nhiều đơn đang hiệu lực cho cùng một nhóm đầu việc.

## 10. Ma trận hiển thị

| Trạng thái/tình huống | Danh sách đang tuyển | URL công khai | Nhận đơn mới |
|---|---|---|---|
| Nháp/Chờ duyệt/Cần bổ sung/Không được duyệt lần đầu | Không | Không công khai | Không |
| Đang tuyển, còn hạn, hiển thị hợp lệ | Có | Bản đã duyệt | Có nếu kênh hợp lệ |
| Đủ số người/booking, chưa đóng và còn hạn | Có | Bản đã duyệt | Có; không được chốt vượt giới hạn |
| Đã đóng tuyển hoặc hết hạn | Không | Giữ bản công khai, nhãn Đã đóng tuyển | Không |
| Hoàn tất | Không | Đề xuất giữ trang lịch sử công khai, nhãn Hoàn tất | Không |
| Đã hủy | Không | Đề xuất trang thông báo không còn khả dụng | Không |
| Bị Admin ẩn/gỡ | Không | Thông báo không còn khả dụng | Không |
| Duyệt sửa điều kiện khi chưa có đơn | Đề xuất tạm loại khỏi danh sách nhận đơn | Giữ bản cũ với thông báo đang cập nhật | Không |
| Duyệt sửa trình bày khi đã có đơn | Có nếu vẫn đủ điều kiện | Bản cũ cho đến khi bản sửa được duyệt | Có |

Không tạo thêm trạng thái nghiệp vụ chỉ để biểu diễn lỗi đồng bộ sàn. Tình trạng đồng bộ là thông tin vận hành riêng.

## 11. Chỉnh sửa sau công bố

- Chỉ bản được duyệt mới hiển thị công khai; không đưa nháp sửa lên sàn.
- Chưa có đơn: thay đổi điều kiện chính phải duyệt lại; tạm ngừng nhận đơn, giữ bản cũ có thông báo đang cập nhật.
- Đã có đơn: khóa thay đổi cam kết trong MVP; chỉ sửa thông tin trình bày không đổi nghĩa sau Admin duyệt. Bản cũ tiếp tục nhận đơn nếu còn hạn.
- Bản sửa được duyệt cập nhật trên cùng URL/ID; không tạo chiến dịch mới.
- Hạn tuyển gốc vẫn có hiệu lực trong quá trình duyệt sửa. Không công bố bản sửa theo cách làm mở lại chiến dịch đã đóng.
- Bản sửa bị từ chối không thay thế bản đang công khai. Đề xuất với trường hợp đã tạm ngừng nhận đơn: giữ tạm ngừng đến khi chủ chiến dịch rút bản sửa hoặc gửi bản hợp lệ; chỉ nhận lại nếu chưa đóng và còn hạn.
- Booking và đơn giữ dấu vết phiên bản áp dụng, không bị ghi đè bởi brief mới.

## 12. Đóng tuyển, hết hạn và ẩn/gỡ

### 12.1. Đóng tuyển thủ công

Chủ chiến dịch có quyền xác nhận đóng tuyển. Ngay khi thành công, chặn đơn mới, cập nhật sàn, giữ đơn/booking đã có và lưu người/thời điểm thao tác.

Thông báo xác nhận: “Đóng tuyển sẽ ngừng nhận đơn mới. Các đơn đã gửi và hợp tác đã xác nhận vẫn được giữ.”

### 12.2. Hết hạn

Thời gian hiện tại bằng hoặc vượt hạn thì chặn gửi đơn tại máy chủ. Job nền cập nhật trạng thái và xóa khỏi danh sách đang tuyển. Không phụ thuộc job để quyết định nhận đơn.

Hiển thị giờ Việt Nam UTC+7; thời điểm hạn có ngày và giờ cụ thể.

### 12.3. Ẩn/gỡ và khôi phục

Admin phải có quyền và ghi lý do. Ẩn/gỡ ngừng nhận đơn, không tự hủy các hợp tác.

Khôi phục không mở lại chiến dịch đã đóng, hết hạn, hoàn tất hoặc đã hủy. Nếu còn Đang tuyển và đủ điều kiện thì mới quay lại danh sách.

### 12.4. Quy tắc giữ nguyên

- Không tự đóng khi đủ đơn.
- Không tự đóng khi đủ booking/người được chọn.
- Không tự hoàn tất khi hết hạn hoặc đến ngày kết thúc dự kiến.
- MVP không mở lại tuyển sau khi đã đóng; cần tạo chiến dịch mới.

## 13. Dữ liệu công khai và nội bộ

| Công khai | Chỉ người có quyền |
|---|---|
| Tên, ảnh, thương hiệu, tổ chức vận hành | Ngân sách tổng nội bộ |
| Brief và tiêu chí công khai | Danh sách ứng viên, quyết định tuyển chọn riêng |
| Quyền lợi từng nhóm, đầu việc và lịch | Bằng chứng đại diện thương hiệu, hồ sơ xác minh |
| Tài liệu được chủ chiến dịch chọn Công khai | Tài liệu chỉ dành cho KOL đã xác nhận booking |
| Thông tin hỗ trợ của tổ chức được phép công khai | Kết quả Safety từng nội dung, thông tin cá nhân riêng |

API công khai chỉ trả các trường được phép; không trả dữ liệu nội bộ rồi ẩn bằng giao diện. Link tệp phải kiểm tra quyền khi truy cập trực tiếp.

## 14. Thông báo và UX writing

| Sự kiện | Người nhận | Nội dung đề xuất |
|---|---|---|
| Công bố thành công | Nhãn hàng/chủ chiến dịch theo quyền | “Chiến dịch [Tên] đã được duyệt và công bố trên sàn.” |
| Hạn đã qua trước khi công bố | Chủ chiến dịch | “Hạn ứng tuyển đã qua. Vui lòng cập nhật thời gian và gửi duyệt lại.” |
| Sắp hết hạn | Chủ chiến dịch | “Chiến dịch [Tên] sẽ hết hạn ứng tuyển sau 24 giờ.” |
| Đã đóng tuyển | Chủ chiến dịch | “Chiến dịch [Tên] đã ngừng nhận ứng tuyển. Bạn vẫn có thể xử lý các đơn đã nhận.” |
| Bị ẩn/gỡ | Chủ chiến dịch | “Chiến dịch [Tên] đã bị ẩn khỏi sàn. Xem lý do và hướng xử lý.” |
| Gửi đơn thành công | Người ứng tuyển | “Đã gửi ứng tuyển. Bạn có thể theo dõi kết quả trong mục Ứng tuyển của tôi.” |

Kết quả duyệt và ẩn/gỡ gửi trong ứng dụng và email theo EP02. Nhắc hạn trước 24 giờ một lần, không nhắc bù nếu công bố sau mốc này. Không gửi trùng cùng sự kiện/phiên bản/người nhận. Không gửi hàng loạt cho mọi KOL khi có chiến dịch mới trong MVP.

## 15. Đồng bộ và xử lý lỗi

- ID chiến dịch là duy nhất giữa quản lý, sàn, trang chi tiết và đơn ứng tuyển.
- Lưu riêng bản đang soạn, bản gửi duyệt và bản công khai.
- Cập nhật sàn và thông báo có cơ chế thử lại; gọi lặp không tạo chiến dịch/URL/đơn trùng.
- Khi bộ nhớ đệm còn dữ liệu cũ, thao tác ứng tuyển vẫn phải đọc điều kiện hiện hành từ máy chủ.
- Kết quả duyệt hoặc sự kiện đồng bộ phiên bản cũ không ghi đè phiên bản mới.
- Nếu danh sách/tìm kiếm chưa cập nhật, có trạng thái đồng bộ để vận hành theo dõi và thử lại; không yêu cầu nhãn hàng đăng chiến dịch lần nữa.
- Lỗi email không hoàn tác việc công bố đã thành công.
- Đề xuất mục tiêu đồng bộ danh sách/tìm kiếm không quá 60 giây trong điều kiện bình thường; đây là SLA đề xuất cần Dev xác nhận. Chặn nhận đơn khi đóng/hết hạn phải có hiệu lực ngay tại máy chủ.
- Khi có thao tác gửi đơn đồng thời với đóng tuyển, xử lý theo thứ tự giao dịch: đơn chỉ được tạo nếu kiểm tra còn tuyển thành công tại thời điểm ghi nhận hợp lệ.

## 16. Tiêu chí nghiệm thu

1. Duyệt đúng phiên bản và đủ điều kiện thì tự công bố một lần, có URL và xuất hiện trên sàn.
2. Duyệt bản đã rút/thay thế hoặc hết hạn không làm công bố chiến dịch.
3. Không cần tạo lại chiến dịch hoặc đăng một bài sàn riêng.
4. Card/chi tiết dùng bản công khai và không lộ dữ liệu nội bộ.
5. Tìm kiếm, lọc, sắp xếp và phân trang nhất quán; không hiện chiến dịch không đủ điều kiện.
6. Khách đăng nhập từ CTA được quay lại đúng chiến dịch.
7. Ứng tuyển kiểm tra vai trò, quyền kênh, xác thực, hạn và chống trùng tại máy chủ.
8. Số đơn, số KOL và số booking không bị đánh đồng.
9. Đóng tuyển, hết hạn hoặc ẩn/gỡ chặn đơn mới dù người dùng đang mở trang cũ.
10. Đơn và booking hiện có không bị xóa do đóng tuyển/ẩn gỡ.
11. Bản sửa chưa duyệt không xuất hiện công khai; bản sửa không ghi đè điều khoản đã chốt.
12. Khôi phục hiển thị không tự mở lại chiến dịch đã đóng hoặc hết hạn.
13. Web/API/lịch xử lý dùng cùng thời điểm hết hạn; UI hiển thị UTC+7.
14. Thử lại đồng bộ và thông báo không tạo dữ liệu trùng.
15. Có trạng thái tải, rỗng, lỗi; gửi thất bại không báo thành công.

## 17. Tình huống kiểm thử trọng tâm

| Tình huống | Kết quả |
|---|---|
| Admin duyệt hai lần | Chỉ một lần công bố, không trùng URL/thông báo |
| Admin mở bản A nhưng nhãn hàng đã rút hoặc thay bản | Chặn duyệt A |
| Hạn qua trong lúc chờ duyệt | Không công bố, yêu cầu cập nhật |
| Card còn trong cache nhưng chiến dịch đã đóng | Gửi đơn bị chặn |
| Hai yêu cầu ứng tuyển trùng kênh/nhóm | Chỉ một đơn hiệu lực |
| Kênh hết hạn giữa lúc mở form và gửi | Chặn, hướng dẫn gia hạn |
| Có kênh khác còn hạn nhưng kênh được chọn hết hạn | Không dùng trạng thái kênh khác để cho qua |
| Đủ một KOL được chọn nhưng chiến dịch chưa đóng | Vẫn nhận đơn theo quy tắc; tuyển chọn không được vượt một người |
| Truy cập thẳng URL tệp nội bộ | Từ chối nếu không có quyền |
| Đang duyệt sửa trình bày, đã có ứng viên | Tiếp tục hiển thị bản cũ và nhận đơn nếu đủ điều kiện |
| Ẩn rồi khôi phục sau hạn tuyển | Không trở lại danh sách đang tuyển |
| Email lỗi nhưng công bố thành công | Giữ công bố, thử gửi email lại |
| Tìm kiếm sàn cập nhật lỗi | Có retry/đối soát, không tạo bản đăng mới |

## 18. Các quyết định cần thống nhất trước triển khai

Các nội dung sau là đề xuất mới hoặc điểm chưa đủ rõ trong tài liệu nguồn:
- Cho khách chưa đăng nhập xem nội dung công khai.
- Bộ lọc MVP, sắp xếp và ngưỡng cảnh báo 24 giờ trên card.
- Cách tính người duy nhất đối với KOL nhiều kênh và MCN; thời điểm tính đã chọn/đã xác nhận.
- Trang Hoàn tất giữ lịch sử công khai, trang Đã hủy chuyển thông báo không khả dụng.
- Cách trở lại nhận đơn khi bản sửa điều kiện bị từ chối nhưng chiến dịch chưa đóng.
- SLA đồng bộ sàn 60 giây.

Các điểm này cần PO/Dev thống nhất khi refinement. Những quy tắc đã có gồm duyệt trước đăng, bảo vệ phiên bản, khóa cam kết khi đã có đơn, đóng theo hạn/thủ công và không mở lại tuyển trong MVP.

## 19. Điều kiện bàn giao hoàn tất

Nghiệm thu nối liền: **Admin duyệt → công bố → xuất hiện trên sàn → xem chi tiết → gửi đơn → nhãn hàng thấy ứng viên** cho cả Booking 1 KOL và Booking nhiều KOL; đồng thời vượt các kiểm thử đóng tuyển, hết hạn, ẩn/gỡ, phân quyền và dữ liệu trùng.

