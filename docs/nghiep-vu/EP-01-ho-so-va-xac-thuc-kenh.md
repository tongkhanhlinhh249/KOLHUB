# EP\-01 — Hồ sơ KOL/MCN và xác thực kênh

## Mục tiêu và căn cứ

**Epic statement:** Là KOL/MCN, tôi muốn hoàn thiện hồ sơ và xác thực từng kênh để chứng minh chính chủ/quyền quản lý, đáp ứng kiểm tra nội dung KOL Safety và đủ điều kiện tham gia cơ hội hợp tác trên KOLHUB\.

Dấu xác thực kết hợp hai điều kiện: chính chủ/quyền quản lý hợp lệ và đạt kiểm tra nội dung Safety\. Kết quả xác thực trên KOLHUB được đồng bộ sang KOLGOV\. Phạm vi chứng minh nội dung phải gắn với những nội dung và thời lượng thực sự được kiểm tra; không diễn đạt thành bảo đảm toàn bộ kênh không có vi phạm\.

Tài liệu này trình bày đầy đủ phạm vi, luồng xử lý, quy tắc và tiêu chí nghiệm thu của Epic, có thể sử dụng độc lập\. Người đọc không cần tra tài liệu gốc hoặc lịch sử trao đổi để hiểu yêu cầu\.

Quy ước trạng thái yêu cầu:

- **Đã thống nhất:** quyết định sản phẩm đã được xác nhận\.

- **Quy tắc cơ sở:** yêu cầu nghiệp vụ đang được sử dụng trong phạm vi đặc tả này\.

- **Đề xuất:** phương án được đưa ra để phê duyệt, chưa phải yêu cầu bắt buộc\.

- **Cần xác nhận:** quyết định còn thiếu được mô tả ngay tại nội dung liên quan\. Không tự chọn phương án khi triển khai\.

### Thuật ngữ

## Phạm vi

### Trong Epic

1. Hoàn thiện, xem và cập nhật hồ sơ KOL/MCN; gửi hồ sơ và xử lý yêu cầu bổ sung\.

2. Thêm, sửa, bật/tắt hiển thị kênh; nhận diện nền tảng và định danh kênh\.

3. Xác minh chính chủ/quyền quản lý kênh\.

4. Tích hợp KOL Safety để lấy danh sách, quét, nhận kết quả và cấp dấu\.

5. Xử lý nội dung bị gỡ/sửa, quét lại và tái sử dụng kết quả hợp lệ\.

6. Gia hạn, hết hạn, tạm ngừng và khôi phục dấu; ghi nhận khiếu nại\.

7. Đồng bộ hồ sơ/kết quả xác thực với KOLGOV\.

8. Cung cấp điều kiện kênh cho các phân hệ tìm kiếm, ứng tuyển và booking\.

9. Thông báo, lịch sử xử lý và công cụ Admin phục vụ các nghiệp vụ trên\.

### Ngoài Epic

- Tạo/đăng chiến dịch, sàn chiến dịch, tuyển chọn, hợp đồng, thanh toán và nghiệm thu\.

- Xây dựng mô hình chấm nội dung, ví/token, nạp tiền và định giá quét của Safety\.

- Quét bản nháp chiến dịch: cần đặc tả riêng, không được suy ra từ dấu xác thực kênh\.

- Thiết kế hệ thống phân quyền nhân viên nội bộ MCN đầy đủ; MVP cần vai trò được ủy quyền quản lý kênh nhưng cơ chế chi tiết phải chốt\.

## Vai trò và quyền

**Đề xuất bắt buộc về quyền dữ liệu:** máy chủ kiểm tra quyền với mọi thao tác; đổi ID trong yêu cầu không được truy cập hồ sơ, báo cáo hoặc ảnh chứng minh của người khác\. Đồng bộ chỉ gửi các trường được hai bên thống nhất; không mặc định gửi toàn bộ giấy tờ định danh\.

## Hồ sơ và dữ liệu kênh

### 4\.1\. Hồ sơ KOL/MCN — đề xuất phạm vi tối thiểu

Không công khai mặc định số điện thoại, email, giấy tờ và ảnh chứng minh\. Trường công khai cần được chỉ rõ trên form\. Cần xác nhận danh sách trường bắt buộc khi gửi hồ sơ, việc có yêu cầu kênh đạt Safety trước khi gửi hay không, và trường hợp sửa thông tin nhận diện phải duyệt lại\.

### 4\.2\. Dữ liệu kênh tối thiểu

## Backlog user story và tiêu chí nghiệm thu

Tiêu chí nghiệm thu được mô tả trực tiếp ở từng user story\. Với nội dung ghi “cần xác nhận” hoặc “đề xuất”, phải phê duyệt chính sách trước khi nghiệm thu; không dùng đề xuất như quyết định đã chốt\.

## Luồng nghiệp vụ

### 6\.1\. Hồ sơ và thêm kênh

1. Người dùng đăng nhập, chọn hồ sơ KOL hoặc MCN theo loại tài khoản hiện có\.

2. Nhập thông tin, lưu nháp; hệ thống chỉ rõ trường chưa hợp lệ\.

3. Thêm kênh bằng URL và ảnh chứng minh quản lý\.

4. Hệ thống nhận diện nền tảng, chuẩn hóa URL, lấy mã kênh nếu khả dụng và kiểm tra trùng\.

5. Gửi hồ sơ/quyền quản lý xét duyệt\. Cần xác nhận hồ sơ có phải đạt Safety trước khi gửi không và Admin duyệt quyền trước hay sau quét; đề xuất duyệt quyền trước để giảm nguy cơ trả phí quét cho kênh không chứng minh được quyền quản lý\.

6. Admin duyệt hoặc yêu cầu bổ sung kèm lý do; người dùng sửa và gửi lại\.

Duyệt hồ sơ không tự cấp dấu Safety\. Một kênh chưa đủ N nội dung không được coi là không đạt nội dung; phải hiển thị thiếu điều kiện\.

### 6\.2\. Xác thực kênh lần đầu

1. KOL/MCN chọn kênh và bấm Xác thực\.

2. Hiển thị điều kiện, phạm vi quét, hướng dẫn và thông tin chuyển sang Safety; đề xuất ô cam đoan: “Tôi hiểu phạm vi kiểm tra và chịu trách nhiệm về toàn bộ nội dung trên kênh”; nội dung và tính bắt buộc cần phê duyệt\.

3. Tại thời điểm bắt đầu quét, hệ thống lấy N nội dung mới nhất trong phạm vi được hỗ trợ\.

4. Nếu thiếu N hoặc không lấy được dữ liệu: hiển thị đúng nguyên nhân, không cấp kết quả Đạt giả định\.

5. Safety thực hiện quét từng nội dung, xử lý token và trả kết quả\.

6. KOLHUB nhận kết quả, hiển thị tiến độ\. Có bài sửa/gỡ thì đi luồng 6\.3\.

7. Khi N/N đạt và quyền quản lý được duyệt, cấp dấu theo mốc hiệu lực được chốt; gửi yêu cầu đồng bộ KOLGOV\.

8. Nếu mới đạt một điều kiện, tiếp tục hiển thị phần còn thiếu\. Thứ tự kiểm tra quyền quản lý và quét Safety chưa được chốt\. Đề xuất duyệt quyền trước; chỉ khóa thiết kế thứ tự màn hình sau khi được phê duyệt\.

### 6\.3\. Bài bị gỡ, chỉnh sửa hoặc thay đổi danh sách — đã chốt

1. Phát hiện/xác nhận bài bị gỡ; cập nhật danh sách N nội dung mới nhất\.

2. Đối chiếu từng bài trong danh sách mới với kết quả đã có\.

3. Chỉ tái sử dụng nếu đồng thời: bài còn trong danh sách; nội dung không thay đổi; kết quả còn hiệu lực\.

4. Bài mới, bài sửa hoặc không xác định được đã thay đổi hay chưa: phải quét\.

5. Bài đã gỡ không được tính là một bài Đạt và không tự giảm N\.

6. Nếu sau cập nhật còn ít hơn N: thông báo số còn thiếu, chưa cấp dấu\.

7. Nếu có kết quả cũ gửi về cho bài không còn thuộc danh sách: lưu lịch sử, không tính vào kết quả hiện tại\.

Ví dụ: TikTok có 20 bài, 18 đạt và 2 không đạt\. Người dùng gỡ 2 bài; hệ thống lấy lại 20 bài mới nhất\. Chỉ khi 18 bài cũ vẫn nằm trong danh sách, không đổi và kết quả còn hiệu lực mới được dùng lại; 2 bài thay thế cần quét\. Không mặc định luôn tái sử dụng được đúng 18 bài\.

### 6\.4\. Gia hạn — không có trạng thái gia hạn riêng

1. Người dùng bắt đầu đợt quét gia hạn khi kênh nằm trong thời gian cho phép\. Đề xuất mở trước hạn 14 ngày; thời điểm mở cần phê duyệt\. Kênh đã hết hạn có thể yêu cầu xác thực lại\.

2. Lấy N nội dung mới nhất tại thời điểm quét; áp dụng cùng quy tắc phạm vi và cập nhật danh sách\.

3. Trong lúc chưa quét đủ/hết token/lỗi kỹ thuật, dấu đang còn hạn vẫn được giữ tới hạn cũ\.

4. Nếu có nội dung không đạt, chuyển xử lý theo mức độ và cơ chế Safety; không tự đình chỉ mọi trường hợp\.

5. Đủ điều kiện: cập nhật hiệu lực\. Cần chốt tính 3 tháng lịch hay 90 ngày, nối tiếp hạn cũ hay tính từ ngày gia hạn và có duyệt lại quyền quản lý hay không\.

6. Đến hạn mà chưa đủ điều kiện gia hạn: chuyển Hết hạn, loại khỏi điều kiện nhận booking mới\.

7. Kênh Hết hạn có thể thực hiện lại quy trình; chỉ khôi phục dấu khi đạt đủ điều kiện\.

### 6\.5\. Vi phạm, tạm ngừng và khôi phục

- Kết quả không đạt phải có nguyên nhân và nguồn kết quả; Safety phụ trách đánh giá nội dung\.

- Vi phạm đã được xác nhận thuộc diện đình chỉ: chuyển Tạm ngừng và chặn booking mới\.

- Không để một sự kiện “quét đạt” tự động ghi đè quyết định đình chỉ còn hiệu lực\.

- Đề xuất chuyển khiếu nại kết quả nội dung tới Safety và khiếu nại quyền quản lý tới Admin KOLHUB\. Cần xác nhận đầu mối, thời gian phản hồi, thẩm quyền và điều kiện giải quyết trước khi vận hành\.

- Khôi phục cần quyết định xử lý hợp lệ và kiểm tra các điều kiện còn lại\. Nếu hạn đã qua thì không tự khôi phục thành Đã xác thực\.

- Booking đang thực hiện cần chuyển phân hệ booking xử lý theo chính sách; Epic này không tự hủy/hoàn tiền\.

### 6\.6\. Đổi URL và chuyển quyền quản lý — đã chốt một phần

- Cùng mã kênh nền tảng: cập nhật URL, giữ kết quả xác thực\.

- Kênh khác: xác thực lại cho kênh mới; không chuyển dấu cũ sang kênh mới\.

- Chuyển người/đơn vị quản lý: kiểm tra lại quyền quản lý; cần xác nhận dấu được giữ hay tạm ngừng trong thời gian kiểm tra quyền của chủ thể mới\.

- Không lấy được mã cố định: chưa đủ cơ sở kết luận cùng kênh\. Đề xuất Admin kiểm tra liên kết cũ–mới; chưa được PO phê duyệt\.

- Mọi thay đổi giữ lịch sử để booking cũ vẫn tham chiếu đúng kênh đã chốt\.

## Quy tắc xác thực và phạm vi quét

### Bảng đội Safety cần xác nhận trước khi khóa phạm vi

Nội dung không truy cập được: ghi nhận riêng, không coi là Đạt hoặc vi phạm\. Chưa có chính sách bỏ qua/thay thế thì không tự bỏ qua để đủ N\. Cần chốt thứ tự theo thời gian đăng gốc hay thời gian sửa, bài ghim, repost và nội dung đồng tác giả\.

## Trạng thái và điều kiện sử dụng

Các trạng thái kênh được định nghĩa đầy đủ dưới đây\. Không thêm “Đang gia hạn” vào trạng thái dấu\.

Thứ tự Chờ duyệt và Chờ Safety phụ thuộc quyết định duyệt quyền quản lý trước hay sau quét; phải xác nhận trước khi khóa sơ đồ trạng thái\. Không gộp kết quả duyệt hồ sơ tài khoản vào trạng thái kênh\. Với hồ sơ tài khoản, đề xuất các trạng thái: Bản nháp → Chờ duyệt → Đã duyệt hoặc Cần bổ sung; bổ sung rồi gửi lại về Chờ duyệt\. Bộ trạng thái hồ sơ và tác động khi sửa thông tin nhận diện cần phê duyệt\.

**Điều kiện kênh được sử dụng:** Đã xác thực \+ chưa hết hạn \+ đang hoạt động \+ thuộc quyền quản lý hợp lệ \+ đúng nền tảng chiến dịch\. Máy chủ kiểm tra lại tại thao tác có ràng buộc, không chỉ khóa nút trên giao diện\.

- Tìm kiếm KOL chỉ hiển thị KOL có ít nhất một kênh đủ điều kiện; không được hiểu thành điều kiện xem sàn chiến dịch\.

- Kênh hết hạn không được chọn cho ứng tuyển/nhận lời mời/chốt mới; cần xác nhận bước nào được coi là chốt booking và cách xử lý booking đang thực hiện\.

- Danh sách đã lưu giữ KOL và cập nhật trạng thái mới\.

- Đề xuất giữ kênh hết hạn trong màn quản lý riêng của chủ tài khoản để có thể gia hạn; phạm vi ẩn cần được xác nhận là danh sách công khai, không phải màn quản lý riêng\.

## Yêu cầu màn hình và thông báo

UX writing đề xuất:

- Thiếu nội dung: “Kênh cần ít nhất \{N\} nội dung đủ điều kiện\. Hiện tìm thấy \{M\}/\{N\}\.”

- Lỗi lấy dữ liệu: “Chưa lấy được nội dung kênh\. Vui lòng thử lại\.”

- Nội dung không đạt: “\{X\} nội dung chưa đạt tiêu chí KOL Safety\. Xem kết quả để xử lý\.”

- Quét lỗi: “\{X\} nội dung chưa kiểm tra được\. Đây chưa phải kết luận vi phạm\.”

- Hết hạn: “Xác thực kênh đã hết hạn\. Hoàn tất kiểm tra để tiếp tục tham gia chiến dịch bằng kênh này\.”

- Chú thích dấu: “Đã xác minh quyền quản lý và đạt kiểm tra KOL Safety trên \{N\} nội dung thuộc danh sách ngày \{date\}\. Video được kiểm tra tối đa 3 phút đầu\. Hiệu lực đến \{expiry\}\.”

- Đồng bộ chưa thành công: “Chưa đồng bộ được kết quả sang KOLGOV\.” Không thông báo đã xác thực trên KOLGOV khi chưa có xác nhận\.

Sự kiện thông báo: yêu cầu bổ sung, quyền quản lý được duyệt, đủ điều kiện cấp dấu, sắp hết hạn, hết hạn, tạm ngừng, kết quả khiếu nại/khôi phục và kết quả đồng bộ cần người dùng xử lý\. Đề xuất nhắc trước hạn 14, 7 và 1 ngày; gửi trong ứng dụng và email\. SMS chưa xác định là bắt buộc\. Lịch gửi, kênh gửi và nội dung phải được phê duyệt\.

## Hợp đồng tích hợp và dữ liệu — đề xuất kỹ thuật để hai đội thống nhất

Không yêu cầu trạng thái gia hạn riêng trên sản phẩm\. Tuy nhiên phải có mã yêu cầu/đợt quét để phân biệt lần đầu, lần gia hạn và kết quả gửi lại\.

Yêu cầu xử lý:

1. Nhận kết quả có xác thực nguồn; kiểm tra đúng kênh, đợt quét, danh sách và lần quét\.

2. Sự kiện gửi lặp không cấp dấu/gia hạn/gửi thông báo nhiều lần\.

3. Kết quả cũ đến muộn không ghi đè kết quả mới hoặc áp vào kênh đã thay đổi\.

4. Có cơ chế hỏi lại Safety theo ID yêu cầu; không chỉ theo URL kênh\.

5. Khi phát sinh thay đổi trong lúc đang quét, kết quả chỉ tính cho danh sách/phiên bản phù hợp\.

6. Thao tác đồng bộ KOLGOV thử lại không tạo hồ sơ trùng\. Có kiểm soát thứ tự để kết quả “còn hạn” cũ không ghi đè “tạm ngừng” mới\.

7. Không thu thập mật khẩu Safety hoặc nền tảng mạng xã hội trong KOLHUB; đăng nhập liên kết cần giao thức hai bên xác nhận\.

8. Chính sách thời gian lưu giấy tờ, ảnh, báo cáo và nhật ký cần được xác định trước vận hành; không tự đặt thời hạn trong Epic này\.

## Ma trận ngoại lệ và kiểm thử nghiệp vụ

## Phân kỳ và điều kiện hoàn tất

### Thứ tự bàn giao triển khai

1. **Nền tảng hồ sơ/kênh:** US\-01–04; chốt danh mục trường và quyền, định danh kênh\.

2. **Xác thực lần đầu:** US\-05–08 và US\-13; tích hợp Safety phải bắt đầu sớm\.

3. **Duy trì hiệu lực:** US\-09–11, các kiểm tra điều kiện cho chiến dịch\.

4. **Đồng bộ và vận hành:** US\-12, US\-14, kiểm thử xuyên hệ thống\. Thiết kế kết nối KOLGOV bắt đầu song song từ đầu, không chờ hoàn thành UI\.

### Definition of Done

- Các quyết định ảnh hưởng phần phát hành đã được PO phê duyệt và cập nhật vào đặc tả\.

- Hoàn tất UI người dùng và Admin, bao gồm tải dữ liệu, rỗng, lỗi, không đủ điều kiện và hết hạn\.

- Hợp đồng dữ liệu Safety/KOLGOV được xác nhận; kiểm thử tích hợp thực tế hoặc môi trường kiểm thử được hai đội cung cấp\.

- Vượt các trường hợp QA áp dụng, đặc biệt kết quả gửi lặp/đến muộn, đổi kênh, đình chỉ và hết hạn\.

- Cấp dấu/điều kiện chiến dịch được kiểm tra phía máy chủ; có nhật ký và phân quyền\.

- Có đầu mối hỗ trợ và cách xử lý lỗi đồng bộ/khiếu nại\.

- Nếu có dấu cũ 365 ngày: phải có chính sách chuyển đổi trước phát hành; không tự chuyển toàn bộ thành 3 tháng hoặc thu hồi hàng loạt\.

