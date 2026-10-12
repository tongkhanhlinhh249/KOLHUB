# EP-02 — Tạo, đăng và quản lý chiến dịch

**Sản phẩm:** KOLHUB  
**Phiên bản:** 1.1 — 12/10/2026  
**Ưu tiên:** P0 — cung cấp chiến dịch cho sàn và làm cơ sở tuyển chọn, triển khai hợp tác.  
**Người sử dụng tài liệu:** PO/BA, Product Design, Dev, QA, vận hành.  
**Trạng thái:** Bản bàn giao áp dụng các phương án MVP tại mục 13 theo yêu cầu cập nhật. Các lựa chọn được diễn giải trực tiếp trong toàn bộ tài liệu.

## 1. Mục tiêu Epic

**Là Nhãn hàng/Agency, tôi muốn tạo, đăng và quản lý chiến dịch trên KOLHUB để công khai nhu cầu hợp tác, thu hút KOL/MCN phù hợp và kiểm soát quá trình tuyển chọn.**

KOLHUB có sàn hiển thị danh sách chiến dịch. Chiến dịch được tạo tại phân hệ quản lý, đáp ứng điều kiện đăng và còn mở tuyển mới xuất hiện trong danh sách cơ hội đang nhận ứng tuyển trên sàn.

Tài liệu này mô tả độc lập nghiệp vụ tạo và quản lý chiến dịch. Không yêu cầu người đọc tra tài liệu khác để hiểu điều kiện và luồng xử lý. Những phần ứng tuyển, tuyển chọn, booking, duyệt nội dung và thanh toán chỉ được xác định ranh giới tích hợp, không triển khai chi tiết trong Epic này.

### Cơ sở áp dụng

Áp dụng phương án kiểm duyệt trước đăng, tuyển theo suất booking/kênh, tuyển liên tục, đóng tuyển thủ công hoặc khi hết hạn, chưa mở lại tuyển trong MVP và giữ trang công khai sau đóng tuyển. Các thay đổi quan trọng sau đăng phải qua kiểm duyệt; khi đã có ứng viên thì khóa thay đổi cam kết.

Các mục trước đây chưa có phương án đủ cụ thể được quy định thành mặc định MVP trong bản này: hỗ trợ tiền cố định, sản phẩm/trải nghiệm hoặc kết hợp; thanh toán ngoài hệ thống; mỗi nhóm đầu việc gắn một nền tảng và cho phép ứng tuyển riêng; tiêu chí follower do nhãn hàng xét; xác minh tổ chức là điều kiện gửi đăng. Đây là quy tắc của phiên bản bàn giao, không phải mô tả năng lực hệ thống đã triển khai.

### Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Chủ chiến dịch | Nhãn hàng/Agency có quyền tạo và quản lý chiến dịch |
| Nhãn hàng được quảng bá | Thương hiệu/sản phẩm xuất hiện trong chiến dịch; có thể khác tổ chức Agency đang vận hành |
| Sàn chiến dịch | Khu vực công khai danh sách cơ hội hợp tác để KOL/MCN khám phá |
| Đơn ứng tuyển | Yêu cầu tham gia của KOL/MCN, gắn với chiến dịch và kênh ứng tuyển |
| Booking | Thỏa thuận hợp tác được xác nhận giữa chủ chiến dịch và KOL/MCN |
| Đầu việc bàn giao | Nội dung hoặc kết quả KOL cần hoàn thành, ví dụ một video TikTok |
| Đóng tuyển | Ngừng nhận ứng tuyển mới; không tự kết thúc các booking đang thực hiện |

## 2. Phạm vi và ranh giới

### Trong Epic

1. Tạo chiến dịch và lưu bản nháp.
2. Nhập thông tin thương hiệu, brief, nền tảng, yêu cầu KOL, quyền lợi, đầu việc và thời gian.
3. Xem trước nội dung sẽ hiển thị trên sàn.
4. Gửi đăng và theo dõi kết quả xét duyệt  trước đăng.
5. Công bố chiến dịch lên sàn khi đủ điều kiện.
6. Xem danh sách chiến dịch của tổ chức, tìm kiếm/lọc và xem tổng quan từng chiến dịch.
7. Chỉnh sửa theo trạng thái, đóng tuyển, yêu cầu hủy và chuyển sang hoàn tất khi đủ điều kiện.
8. Lưu lịch sử thay đổi, thông báo liên quan và dữ liệu cho các phân hệ tiếp theo.

### Ngoài Epic

| Nghiệp vụ | Ranh giới bàn giao |
|---|---|
| Sàn khám phá chiến dịch | Epic này cung cấp dữ liệu và điều kiện hiển thị; tìm kiếm/lọc phía KOL và bố cục sàn thuộc phân hệ sàn |
| Hồ sơ và xác thực kênh | Epic này lưu yêu cầu nền tảng/đối tượng; phân hệ xác thực cung cấp trạng thái hợp lệ của kênh |
| Ứng tuyển | Tiếp nhận/rút đơn, chống trùng và theo dõi đơn thuộc phân hệ ứng tuyển |
| Tuyển chọn và chốt booking | Chủ chiến dịch chuyển sang danh sách ứng viên; quyết định chọn, từ chối và xác nhận hợp tác thuộc phân hệ tuyển chọn |
| Triển khai và nghiệm thu | Quản lý bài nháp, link đăng, giao nhận sản phẩm và nghiệm thu nằm ở phân hệ triển khai |
| Thanh toán | Không tạo ví, giữ tiền hoặc thanh toán trong Epic này; chỉ khai quyền lợi và ngân sách theo mô hình thanh toán ngoài hệ thống |
| Quản trị sàn | Màn duyệt/ẩn/gỡ của Admin thuộc phạm vi vận hành; Epic này định nghĩa yêu cầu đầu vào và trạng thái phản hồi |

## 3. Vai trò và phân quyền

| Vai trò | Quyền |
|---|---|
| Nhãn hàng | Tạo và quản lý chiến dịch thuộc tổ chức mình; gửi đăng, sửa, đóng tuyển và xem tổng quan |
| Agency | Tạo và quản lý chiến dịch thay mặt nhãn hàng; ghi rõ thương hiệu được quảng bá và tổ chức vận hành |
| Thành viên tổ chức được phân quyền | Thao tác theo quyền xem, chỉnh sửa hoặc gửi đăng được cấp; không mặc định mọi thành viên đều có quyền |
| Admin vận hành | Duyệt, yêu cầu bổ sung hoặc từ chối đăng; ẩn/gỡ khi có lý do; lưu lịch sử quyết định |
| KOL/MCN | Chỉ đọc nội dung công khai của chiến dịch trên sàn; không chỉnh sửa brief hoặc xem ngân sách nội bộ |

**Điều kiện tài khoản:** người đã đăng nhập và có quyền trong tổ chức được tạo/lưu nháp. Chỉ tổ chức có hồ sơ được Admin xác minh và tài khoản đang hoạt động mới được gửi đăng. Người quản lý tổ chức có quyền gửi đăng, đóng tuyển và yêu cầu hủy; người được cấp quyền chỉnh sửa được soạn nháp. Agency phải khai thương hiệu được quảng bá và cung cấp bằng chứng được phép đại diện khi gửi đăng để Admin kiểm tra. Không yêu cầu hồ sơ tổ chức đạt KOL Safety như kênh của KOL.

**Nguyên tắc bắt buộc về quyền:** máy chủ kiểm tra quyền trên từng chiến dịch; sửa ID trên đường dẫn hoặc yêu cầu không cho phép truy cập chiến dịch tổ chức khác. Admin không tự thay đổi cam kết của nhãn hàng mà không có lịch sử và thẩm quyền được duyệt.

## 4. Cấu trúc form tạo chiến dịch — phạm vi MVP

Chia thành 4 bước để giảm tải nhập liệu: **Thông tin chung → Yêu cầu và quyền lợi → Thời gian và hướng dẫn → Xem trước và gửi đăng**. Cho phép lưu nháp ở mọi bước; chỉ kiểm tra đầy đủ trường bắt buộc khi gửi đăng.

### 4.1. Thông tin chung

| Trường | Khi gửi đăng | Quy tắc và mục đích |
|---|---|---|
| Tên chiến dịch | Bắt buộc | 10–120 ký tự sau khi bỏ khoảng trắng đầu/cuối; mô tả rõ cơ hội hợp tác |
| Nhãn hàng được quảng bá | Bắt buộc | Khai tên nhãn hàng và căn cứ đại diện; Admin kiểm tra quyền sử dụng khi duyệt; Agency không tự được coi là chủ thương hiệu |
| Tổ chức vận hành | Hệ thống xác định | Lấy từ tổ chức đang thao tác, không cho đổi để chuyển quyền sở hữu tùy ý |
| Ảnh đại diện chiến dịch | Bắt buộc | JPG/PNG/WebP, tối đa 10 MB; ảnh xem trước thống nhất tỉ lệ card 16:9 |
| Lĩnh vực/ngành hàng | Bắt buộc | Chọn danh mục quản trị dùng chung; không nhập tự do gây trùng bộ lọc |
| Sản phẩm/dịch vụ | Bắt buộc | Tên và mô tả sản phẩm/dịch vụ cần quảng bá |
| Mô tả ngắn | Bắt buộc | Tối đa 300 ký tự; dùng trên card và đầu trang chi tiết |
| Mục tiêu chiến dịch | Bắt buộc | Tối đa 2.000 ký tự; mô tả kết quả kỳ vọng; không tự biến kỳ vọng thành KPI cam kết của từng KOL |
| Brief chi tiết | Bắt buộc | Tối đa 20.000 ký tự; bối cảnh, thông điệp, yêu cầu nội dung và kết quả bàn giao; hỗ trợ trình bày có cấu trúc |
| Tài liệu tham khảo | Không bắt buộc | Link HTTPS hoặc tệp PDF/JPG/PNG/WebP, tối đa 10 MB/tệp và 5 tệp/chiến dịch; chọn Công khai hoặc Chỉ KOL đã xác nhận booking; mặc định tài liệu đính kèm là nội bộ |

chưa đưa bình luận, lượt lưu và chỉ số tăng trưởng vào form tạo chiến dịch. Những dữ liệu này do hệ thống ghi nhận sau khi chiến dịch hoạt động.

### 4.2. Yêu cầu KOL và đầu việc

| Trường | Khi gửi đăng | Quy tắc và mục đích |
|---|---|---|
| Nền tảng | Bắt buộc | TikTok, Facebook, Instagram, YouTube; chỉ mở nền tảng đã hỗ trợ xuyên suốt xác thực–ứng tuyển–nộp bài |
| Đối tượng tham gia | Bắt buộc | KOL cá nhân, MCN hoặc cả hai; MCN gửi ứng tuyển riêng theo từng kênh có quyền quản lý hợp lệ |
| Số lượng cần tuyển | Bắt buộc | Số nguyên dương theo từng nhóm đầu việc; 1 suất = 1 booking cho 1 kênh trong nhóm đó; tổng số suất là tổng các nhóm, không phải số người duy nhất |
| Lĩnh vực nội dung phù hợp | Không bắt buộc | Chọn nhiều từ danh mục dùng chung |
| Khu vực | Bắt buộc chọn | Toàn quốc hoặc danh sách khu vực; phân biệt nơi KOL cư trú với nơi cần trực tiếp trải nghiệm |
| Yêu cầu kênh | Có sẵn | Kênh tham gia phải đáp ứng xác thực và điều kiện hoạt động tại thao tác ứng tuyển/chốt theo quy tắc trong tài liệu nền tảng |
| Ngưỡng người theo dõi | Không bắt buộc | Số nguyên không âm; là tiêu chí để nhãn hàng xét thủ công, không tự chặn ứng tuyển bằng dữ liệu follower |
| Tiêu chí lựa chọn khác | Không bắt buộc | Kinh nghiệm, phong cách, chất lượng nội dung; không tự tạo điều kiện chặn nếu không có dữ liệu kiểm chứng |
| Danh sách đầu việc | Ít nhất một | Mỗi dòng gồm nền tảng, định dạng, số lượng, mô tả yêu cầu tối đa 3.000 ký tự, mốc bàn giao |
| Yêu cầu bắt buộc về nội dung | Theo chiến dịch | Thông điệp, hashtag, gắn thẻ, nội dung cần tránh, yêu cầu thời lượng; phải hiển thị trước khi KOL ứng tuyển |
| Quyền sử dụng nội dung | Cần khai rõ nếu yêu cầu | Phạm vi sử dụng lại, thời hạn, kênh sử dụng và độc quyền nếu có; không mặc định nhãn hàng có quyền sử dụng vô hạn |

**Chiến dịch đa nền tảng:** mỗi nhóm đầu việc gắn một nền tảng và có số suất, quyền lợi, deadline riêng. KOL/MCN ứng tuyển từng nhóm bằng một kênh phù hợp, không bắt buộc nhận cả gói đa nền tảng. Một kênh có thể ứng tuyển nhiều nhóm nếu phù hợp nhưng không có nhiều đơn đang hiệu lực cho cùng nhóm. Mỗi booking tương ứng một kênh và một nhóm đầu việc; booking có thể chứa nhiều sản phẩm bàn giao. Điều kiện chống trùng được thực hiện tại phân hệ ứng tuyển.

### 4.3. Quyền lợi và ngân sách

MVP hỗ trợ ba loại quyền lợi: tiền, sản phẩm/trải nghiệm và kết hợp. Quyền lợi khai theo từng nhóm đầu việc. KOLHUB ghi nhận thỏa thuận; việc thanh toán được thực hiện ngoài hệ thống, không thu, giữ hoặc chi tiền trong phạm vi MVP.

| Trường | Quy tắc |
|---|---|
| Loại quyền lợi | Chọn một trong ba loại: tiền, sản phẩm/trải nghiệm hoặc kết hợp |
| Thù lao | Nhập số tiền cố định cho một booking/kênh của nhóm đầu việc; MVP không dùng khoảng giá hoặc luồng nhận báo giá |
| Đơn vị tiền | VND; số nguyên dương khi quyền lợi có tiền; không dùng số 0 thay cho quyền lợi sản phẩm |
| Đơn vị thù lao | Hiển thị VND/booking; quyền lợi bao gồm toàn bộ đầu việc trong nhóm, không nhân thêm theo số sản phẩm bàn giao |
| Sản phẩm/trải nghiệm | Mô tả quyền lợi, số lượng và điều kiện nhận; không coi giá trị sản phẩm là tiền mặt được trả |
| Chi phí phát sinh | Nêu bên chịu phí vận chuyển, đi lại hoặc các khoản khác nếu có |
| Điều kiện nhận quyền lợi | Mô tả mốc bàn giao/nghiệm thu làm căn cứ và thời gian chi trả dự kiến |
| Ngân sách tổng nội bộ | Không bắt buộc; chỉ người có quyền trong tổ chức và Admin phụ trách xem; không đưa lên sàn trong MVP |

Phải phân biệt ngân sách nội bộ của chiến dịch với quyền lợi từng KOL. Không hiển thị lời hứa “đã bảo đảm thanh toán” khi chưa có cơ chế thu/giữ tiền thực tế.

Nếu chiến dịch yêu cầu giao sản phẩm, Epic này chỉ ghi điều kiện và quyền lợi. Địa chỉ người nhận, giao hàng và xác nhận nhận hàng thuộc luồng triển khai; không thu thập địa chỉ cá nhân công khai trong form chiến dịch.

### 4.4. Thời gian và hướng dẫn

| Trường | Quy tắc |
|---|---|
| Hạn ứng tuyển | Bắt buộc, phải ở tương lai khi gửi đăng và khi công bố |
| Thời gian dự kiến công bố kết quả | Khai nếu có; không sớm hơn hạn ứng tuyển nếu khai một mốc công bố kết quả cuối cùng; các đợt tuyển sớm vẫn được phép |
| Hạn nộp nháp | Theo đầu việc; phải đủ logic với thời gian xác nhận hợp tác |
| Khoảng thời gian đăng bài | Ngày/giờ bắt đầu không sau kết thúc; phải phù hợp quy trình duyệt nháp |
| Thời gian dự kiến hoàn tất | Không sớm hơn mốc bàn giao cuối cùng |
| Địa điểm trải nghiệm | Bắt buộc nếu yêu cầu tham dự trực tiếp; có hướng dẫn thời gian và chi phí liên quan |
| Thông tin hỗ trợ | dùng đầu mối tổ chức hoặc kênh liên hệ trên hệ thống; tránh công khai thông tin cá nhân không cần thiết |

Múi giờ hiển thị thống nhất là giờ Việt Nam (UTC+7), lưu thời điểm chuẩn trong hệ thống. Hạn ứng tuyển phải có giờ cụ thể; khi thời gian hiện tại bằng hoặc vượt hạn thì ngừng nhận đơn mới. Cho phép tuyển liên tục trước khi hết hạn. Hạn nộp nháp/đăng bài của từng booking phải còn khả thi tại thời điểm xác nhận; nếu các mốc đã qua thì không được xác nhận booking mới dù chiến dịch chưa đóng tuyển.

## 5. Trạng thái chiến dịch — mô hình áp dụng

Phân biệt **tình trạng tuyển/triển khai** và **khả năng xuất hiện trên sàn**. Ẩn khỏi sàn không tự hủy các booking đã chốt.

| Trạng thái | Ý nghĩa | Hiển thị trên sàn | Thao tác chính của chủ chiến dịch |
|---|---|---|---|
| Bản nháp | Chưa gửi đăng | Không | Sửa, xem trước, gửi đăng, xóa nháp |
| Chờ duyệt | Đã gửi và chờ Admin kiểm tra | Không | Xem nội dung; rút về nháp trước khi Admin quyết định |
| Cần bổ sung | Admin yêu cầu chỉnh sửa có lý do | Không | Sửa, gửi lại |
| Không được duyệt | Nội dung không được chấp thuận đăng | Không | Xem lý do; Sửa và gửi lại nếu không có hạn chế tài khoản/nội dung được Admin ghi rõ |
| Đang tuyển | Đã được công bố, còn nhận đơn | Có trong danh sách mở tuyển | Xem ứng viên, sửa trong phạm vi cho phép, đóng tuyển |
| Đã đóng tuyển | Không nhận đơn mới; còn tuyển chọn/triển khai | Không nằm trong danh sách mở tuyển | Xử lý đơn đã nhận, theo dõi triển khai |
| Hoàn tất | Mọi hợp tác đã được xử lý xong theo điều kiện hoàn tất | Không nằm trong danh sách mở tuyển | Xem lịch sử và kết quả |
| Đã hủy | Dừng chiến dịch theo quyết định hợp lệ | Không nằm trong danh sách mở tuyển | Xem lý do và lịch sử |

**Kiểm duyệt trước đăng:** bắt buộc trong MVP. Admin kiểm tra tổ chức, quyền đại diện nhãn hàng, nội dung và điều kiện hợp tác trước khi công bố. Chờ duyệt, Cần bổ sung và Không được duyệt đều được sử dụng. Chiến dịch Không được duyệt có thể được sửa để gửi lại, trừ khi tài khoản bị khóa hoặc nội dung thuộc phạm vi cấm được Admin nêu rõ.

**Ẩn/gỡ bởi Admin:** là quyết định kiểm soát hiển thị kèm lý do, không thay thế trạng thái nghiệp vụ. Chiến dịch bị ẩn/gỡ không nhận đơn mới; trang công khai hiển thị thông báo không còn khả dụng, không tiết lộ tài liệu nội bộ. Người đã tham gia vẫn truy cập phần công việc của mình theo quyền. Admin chỉ khôi phục sau khi lý do xử lý đã được giải quyết; nếu hạn tuyển đã qua hoặc chiến dịch đã đóng, khôi phục không mở lại tuyển.

**Chuyển trạng thái chính:** Bản nháp → Chờ duyệt → Đang tuyển hoặc Cần bổ sung/Không được duyệt. Cần bổ sung → Chờ duyệt sau khi gửi lại. Đang tuyển → Đã đóng tuyển khi hết hạn hoặc chủ chiến dịch đóng sớm. Đã đóng tuyển → Hoàn tất khi đủ điều kiện; việc hủy cần qua kiểm tra các nghĩa vụ đang tồn tại.

Không tự chuyển sang Hoàn tất chỉ vì hết hạn ứng tuyển hoặc đến ngày kết thúc dự kiến.

## 6. Luồng nghiệp vụ

### 6.1. Tạo và lưu nháp

1. Người dùng có quyền chọn “Tạo chiến dịch”.
2. Hệ thống khởi tạo bản nháp thuộc tổ chức đang thao tác.
3. Người dùng nhập thông tin theo các nhóm form.
4. Bấm “Lưu nháp”: cho phép thiếu trường bắt buộc khi đăng, nhưng chặn dữ liệu không hợp lệ đã nhập và tệp không được phép.
5. Hiển thị kết quả lưu; chỉ báo thành công khi máy chủ đã lưu.
6. Khi rời form còn thay đổi chưa lưu, cảnh báo để tránh mất dữ liệu. Tự lưu là cải tiến có thể bổ sung, không mặc định thuộc MVP.

### 6.2. Xem trước và gửi đăng

1. Người dùng bấm “Xem trước”; hiển thị card và trang chi tiết theo dữ liệu đã nhập, đánh dấu nội dung còn thiếu.
2. Bấm “Gửi đăng”; hệ thống kiểm tra quyền và toàn bộ trường bắt buộc, lịch, quyền lợi, đầu việc, ảnh và điều kiện tài khoản.
3. Nếu lỗi: giữ dữ liệu, đưa người dùng tới trường/nhóm lỗi; không chỉ hiển thị thông báo chung.
4. Nếu hợp lệ: lưu phiên bản gửi duyệt và chuyển Chờ duyệt theo quy trình kiểm duyệt bắt buộc.
5. Nút gửi không tạo nhiều yêu cầu khi người dùng bấm lặp hoặc mạng gửi lại.

### 6.3. Duyệt và công bố

1. Admin mở bản đã gửi, kiểm tra thông tin thương hiệu, brief, quyền lợi, thời gian và mức độ đầy đủ.
2. Admin chọn Duyệt, Cần bổ sung hoặc Không được duyệt; hai kết quả sau bắt buộc lý do.
3. Trước khi công bố, hệ thống kiểm tra lại hạn ứng tuyển và điều kiện tài khoản. Hạn đã qua thì yêu cầu chủ chiến dịch cập nhật, không đăng chiến dịch đã hết tuyển.
4. Duyệt hợp lệ: chuyển Đang tuyển, ghi thời điểm công bố và cung cấp dữ liệu cho sàn.
5. Thông báo kết quả cho chủ chiến dịch; nội dung hiển thị phải khớp phiên bản được duyệt.
6. Chủ chiến dịch sửa yêu cầu bổ sung, xem trước và gửi lại.

Admin kiểm duyệt nội dung đăng sàn, không tự bảo đảm khả năng chi trả của nhãn hàng nếu chưa có cơ chế kiểm tra tài chính tương ứng.

### 6.4. Quản lý sau đăng

1. Chủ chiến dịch xem danh sách chiến dịch của tổ chức, lọc theo trạng thái hoặc tìm tên.
2. Mở chi tiết để xem brief, hạn tuyển, quyền lợi, số đơn đã nhận và số booking đã xác nhận.
3. Chuyển sang phân hệ ứng viên hoặc triển khai từ các nút tương ứng.
4. Chỉnh sửa theo ma trận mục 7; không thay đổi âm thầm cam kết đã áp dụng cho ứng viên/booking.
5. Đóng tuyển thủ công hoặc tự động khi hết hạn. Đơn đã gửi vẫn được giữ và tiếp tục xử lý.

### 6.5. Hủy và hoàn tất

- Bản nháp chưa gửi có thể xóa sau xác nhận. Các chiến dịch đã có lịch sử gửi duyệt/ứng tuyển không xóa vật lý bằng thao tác người dùng.
- Chiến dịch chưa có booking: cho hủy kèm lý do, thông báo cho ứng viên bị ảnh hưởng; giữ lịch sử đơn.
- Chiến dịch có booking: không hủy trực tiếp để bỏ nghĩa vụ. Chuyển yêu cầu xử lý hủy tới phân hệ booking/vận hành và chốt phương án từng booking trước.
- Hoàn tất khi không còn mở tuyển, không còn đơn cần xử lý và các booking đã đạt trạng thái kết thúc hợp lệ; nếu có nghĩa vụ thanh toán hoặc tranh chấp còn mở thì phải được xử lý theo quy tắc trong tài liệu trước khi đánh dấu hoàn tất toàn bộ.
- Người quản lý tổ chức được đánh dấu hoàn tất sau khi hệ thống kiểm tra các điều kiện trên; Admin có quyền hỗ trợ và phải ghi lý do. Chiến dịch không tuyển được KOL được hoàn tất sau khi đóng tuyển và xử lý xong mọi đơn, ghi kết quả “Không phát sinh hợp tác”, không tạo booking giả. Nếu nghĩa vụ thanh toán ngoài hệ thống còn mở, chưa được đánh dấu hoàn tất.

## 7. Quy tắc chỉnh sửa và bảo vệ cam kết

| Thời điểm | Phạm vi chỉnh sửa | Cách xử lý |
|---|---|---|
| Bản nháp/Cần bổ sung | Toàn bộ trường người dùng được phép nhập | Kiểm tra lại khi gửi đăng |
| Chờ duyệt | Không chỉnh trực tiếp phiên bản đang được xét | rút về nháp trước khi sửa; Admin không duyệt được phiên bản đã rút |
| Đang tuyển, chưa có đơn | Cho sửa; thay đổi điều kiện chính cần duyệt lại  | Tạm ngừng nhận đơn mới trong thời gian xét bản sửa; giữ bản công khai cũ với thông báo đang cập nhật. Duyệt xong và còn hạn thì nhận đơn lại; đây không phải thao tác mở lại chiến dịch đã đóng tuyển |
| Đang tuyển, đã có đơn | Chỉ sửa nội dung trình bày không làm thay đổi quyền lợi/nghĩa vụ | Sửa thù lao, nền tảng, số lượng đầu việc, tiêu chí bắt buộc hoặc rút ngắn hạn phải qua luồng điều chỉnh riêng; khóa trong MVP |
| Đã có booking | Không ghi đè các điều kiện đã chốt của booking | Booking lưu bản điều khoản tại lúc xác nhận; thay đổi phải được các bên chấp thuận tại luồng booking |
| Đã đóng tuyển | Xem và theo dõi; mở lại tuyển là hành động riêng | MVP không mở lại tuyển; tạo chiến dịch mới nếu cần tuyển đợt khác |
| Hoàn tất/Đã hủy | Không sửa thông tin nghiệp vụ đã cam kết | Giữ lịch sử; sửa sai hành chính do Admin xử lý có lý do |

Sau khi đã có đơn, chỉ cho sửa ảnh đại diện, tên/mô tả giới thiệu không đổi ý nghĩa hợp tác và thông tin hỗ trợ. Bản sửa vẫn được Admin kiểm tra trước khi công khai; bản cũ tiếp tục nhận đơn vì điều kiện hợp tác không thay đổi. Khóa số suất, nền tảng, đầu việc, quyền lợi, tiêu chí bắt buộc, quyền sử dụng và các mốc thời gian. Không coi sửa mô tả là thay đổi nhỏ nếu thêm nghĩa vụ hoặc đổi quyền lợi; Admin phải từ chối bản sửa đó. Hạn tuyển gốc vẫn có hiệu lực trong lúc duyệt bản sửa.

## 8. Quy tắc hiển thị, đóng tuyển và số lượng

1. Chỉ chiến dịch đã được phép công bố, còn mở tuyển và không bị ẩn/gỡ mới xuất hiện trong danh sách cơ hội đang tuyển.
2. Hết hạn phải chặn ứng tuyển ở máy chủ, kể cả card cũ còn xuất hiện do bộ nhớ đệm hoặc người dùng đang mở trang.
3. Đóng tuyển sớm cần xác nhận hành động; không tự từ chối toàn bộ đơn đã gửi và không hủy booking.
4. Số đơn ứng tuyển khác số KOL được chọn, số booking xác nhận và số suất tuyển. Các chỉ số phải ghi đúng tên.
5. không tự đóng tuyển khi đủ số đơn; nhãn hàng có thể cần nhiều ứng viên để lựa chọn.
6. Đủ số booking xác nhận thì cảnh báo chủ chiến dịch, không tự đóng tuyển. Không xác nhận booking vượt số suất của từng nhóm; phân hệ tuyển chọn kiểm tra đồng thời để tránh vượt suất. Chủ chiến dịch đóng thủ công hoặc hệ thống đóng khi hết hạn.
7. Trang đã đóng tuyển cần hiển thị rõ không nhận đơn mới. Trang vẫn công khai với nhãn Đã đóng tuyển, vô hiệu hóa CTA ứng tuyển và không nằm trong danh sách đang tuyển; các tệp nội bộ tiếp tục bị giới hạn quyền.
8. Kênh KOL hết hạn xác thực không tự làm chiến dịch của nhãn hàng biến mất; ảnh hưởng được xử lý ở đơn ứng tuyển/booking tương ứng.

## 9. User story và tiêu chí nghiệm thu

| ID | User story | Tiêu chí nghiệm thu | Ưu tiên |
|---|---|---|---|
| US-01 | Là Nhãn hàng/Agency, tôi muốn tạo chiến dịch để công bố nhu cầu hợp tác. | Đúng quyền tổ chức; có đủ nhóm thông tin; ID duy nhất; không gán nhầm quyền sở hữu khi Agency khai nhãn hàng. | P0 |
| US-02 | Là người tạo chiến dịch, tôi muốn lưu nháp để hoàn thiện sau. | Lưu được khi thiếu trường đăng; tải lại đúng dữ liệu; báo lỗi lưu; cảnh báo khi rời form chưa lưu. | P0 |
| US-03 | Là chủ chiến dịch, tôi muốn khai yêu cầu KOL và đầu việc để ứng viên hiểu phạm vi hợp tác. | Đầu việc có nền tảng/định dạng/số lượng; phân biệt tiêu chí bắt buộc và ưu tiên; số lượng tuyển có đơn vị rõ. | P0 |
| US-04 | Là chủ chiến dịch, tôi muốn khai quyền lợi để KOL đánh giá cơ hội trước khi ứng tuyển. | Hiển thị đúng loại quyền lợi đã hỗ trợ; tiền có đơn vị và cách tính; ngân sách nội bộ không lộ ngoài dự kiến. | P0 |
| US-05 | Là chủ chiến dịch, tôi muốn đặt các mốc thời gian để kiểm soát tuyển và triển khai. | Hạn tương lai; mốc hợp lý theo loại chiến dịch; hiển thị múi giờ; thời điểm hết hạn được kiểm tra phía máy chủ. | P0 |
| US-06 | Là chủ chiến dịch, tôi muốn xem trước để kiểm tra nội dung công khai. | Card/chi tiết phản ánh dữ liệu; không lộ tài liệu nội bộ; báo phần còn thiếu; bản xem trước không được đưa lên sàn. | P0 |
| US-07 | Là chủ chiến dịch, tôi muốn gửi đăng và nhận kết quả để biết chiến dịch có thể xuất hiện trên sàn. | Kiểm tra đủ điều kiện; không gửi trùng; hiển thị trạng thái/lý do; luồng duyệt bắt buộc trước công bố. | P0 |
| US-08 | Là chủ chiến dịch, tôi muốn sửa yêu cầu bổ sung để đăng lại. | Hiện rõ lý do; cho sửa; gửi lại bản mới; lưu lịch sử phiên bản và phản hồi. | P0 |
| US-09 | Là chủ chiến dịch, tôi muốn xem danh sách chiến dịch để kiểm soát công việc. | Chỉ hiện chiến dịch có quyền; lọc/tìm kiếm; trạng thái, hạn tuyển và số liệu nhất quán; có màn rỗng và lỗi tải. | P0 |
| US-10 | Là chủ chiến dịch, tôi muốn cập nhật chiến dịch mà không làm sai cam kết đã có. | Áp dụng ma trận sửa; bảo vệ phiên bản booking; thao tác trái quyền/trạng thái bị chặn ở máy chủ. | P0 |
| US-11 | Là chủ chiến dịch, tôi muốn đóng tuyển khi không nhận thêm ứng viên. | Có xác nhận; ngừng nhận đơn; giữ đơn/booking cũ; sàn cập nhật trạng thái; ghi thời gian và người đóng. | P0 |
| US-12 | Là chủ chiến dịch, tôi muốn dừng hoặc hoàn tất chiến dịch theo tình trạng thực tế. | Không hủy bỏ qua booking đang chạy; lý do được lưu; hoàn tất không chỉ dựa vào ngày; người quản lý tổ chức quyết định sau khi kiểm tra điều kiện; Admin hỗ trợ có lý do. | P0 |
| US-13 | Là chủ chiến dịch, tôi muốn biết tiến độ tổng quan để chuyển tới công việc cần xử lý. | Hiện đơn nhận được/đơn cần xử lý, booking xác nhận, đầu việc chờ duyệt hoặc hoàn tất nếu có dữ liệu; liên kết đúng phân hệ; không gọi số đơn là số KOL đã tuyển. | P0 |
| US-14 | Là chủ chiến dịch, tôi muốn nhận thông báo về việc đăng và hạn tuyển để xử lý kịp thời. | Thông báo duyệt/bổ sung/từ chối/đóng tuyển/ẩn gỡ; đường dẫn đúng; không gửi lặp; gửi trong ứng dụng; kết quả duyệt/bổ sung/từ chối/ẩn gỡ gửi thêm email; nhắc hạn trước 24 giờ một lần. | P0 |
| US-15 | Là chủ chiến dịch, tôi muốn nhân bản chiến dịch để giảm nhập lại. | Tạo bản nháp mới; không sao chép đơn/booking/quyết định duyệt; yêu cầu kiểm tra lại ngày và quyền lợi. | P1 |

## 10. Yêu cầu màn hình

| Màn hình | Thành phần chính |
|---|---|
| Chiến dịch của tôi/tổ chức | Tạo chiến dịch; tìm tên; lọc trạng thái; tên, thương hiệu, trạng thái, hạn tuyển, ứng viên và booking; phân trang |
| Form tạo/sửa | 4 nhóm thông tin; lưu nháp; tiếp tục/quay lại; lỗi theo trường; cảnh báo rời trang; dữ liệu không mất khi chuyển bước |
| Xem trước | Card sàn và chi tiết; nhãn xem trước; phân biệt thông tin công khai/nội bộ; quay lại sửa/gửi đăng |
| Chi tiết quản lý | Tổng quan, nội dung công khai, phản hồi Admin, chỉ số tiến độ; lối sang ứng viên/booking; lịch sử và hành động theo trạng thái |
| Xác nhận đóng/hủy | Tên chiến dịch, tác động, lý do nếu cần; xác nhận/hủy thao tác |
| Kết quả duyệt | Trạng thái và lý do cụ thể; CTA sửa/gửi lại; không chỉ hiện mã lỗi |

Thông báo giao diện đề xuất:
- “Đã lưu bản nháp.”
- “Vui lòng hoàn thiện các thông tin được đánh dấu trước khi gửi đăng.”
- “Chiến dịch đã được gửi duyệt.”
- “Hạn ứng tuyển đã qua. Vui lòng cập nhật trước khi gửi đăng.”
- “Đóng tuyển sẽ ngừng nhận đơn mới. Các đơn đã gửi và hợp tác đã xác nhận vẫn được giữ.”
- “Chiến dịch đã có hợp tác được xác nhận. Vui lòng xử lý các hợp tác đang thực hiện trước khi hủy.”
- “Nội dung đã được cập nhật bởi người khác. Vui lòng tải lại trước khi lưu.”

## 11. Dữ liệu và tích hợp đề xuất

| Nhóm dữ liệu | Nội dung tối thiểu |
|---|---|
| Định danh/quyền | ID chiến dịch, tổ chức sở hữu, người tạo, người cập nhật, nhãn hàng quảng bá |
| Nội dung | Tên, mô tả, ảnh, lĩnh vực, sản phẩm, brief, tài liệu và quyền xem |
| Tuyển chọn | Nền tảng, đối tượng, khu vực, tiêu chí, số suất và đơn vị đếm |
| Đầu việc | Định dạng, số lượng, nền tảng, mốc, yêu cầu nội dung và quyền sử dụng |
| Quyền lợi | Loại, giá trị, đơn vị, cách tính, điều kiện và phần ngân sách nội bộ |
| Lịch | Hạn ứng tuyển, mốc triển khai, múi giờ hiển thị, thời điểm công bố/đóng tuyển |
| Vòng đời | Trạng thái, quyết định kiểm duyệt, trạng thái hiển thị, người/lý do thay đổi |
| Phiên bản | Phiên bản nội dung, bản gửi duyệt, bản công khai, thời điểm cập nhật |
| Tổng quan | Số đơn/booking/đầu việc lấy từ phân hệ sở hữu; không nhập tay thay dữ liệu thực tế |

Yêu cầu phối hợp:
- Sàn nhận bản công khai và trạng thái còn tuyển; không nhận giấy tờ/tài liệu nội bộ ngoài quyền.
- Ứng tuyển kiểm tra trực tiếp điều kiện còn tuyển; không chỉ tin trạng thái của card.
- Đơn ứng tuyển nên lưu dấu vết phiên bản brief tại thời điểm gửi; booking lưu điều khoản đã xác nhận để bảo vệ cam kết.
- Nhận kết quả duyệt đúng phiên bản; kết quả cũ không được công bố bản đã bị sửa/rút.
- Lưu dữ liệu và phát sinh cập nhật sàn/thông báo có cơ chế thử lại; gửi lặp không tạo chiến dịch hoặc thông báo trùng.
- Kiểm soát cập nhật đồng thời để không ghi đè thay đổi của thành viên khác.
- Tệp tải lên kiểm tra định dạng, dung lượng và quyền đọc; không render nội dung có thể thực thi từ brief/tệp không được phép.

## 12. Tình huống kiểm thử nghiệp vụ

| Tình huống | Kết quả mong đợi |
|---|---|
| Người dùng tổ chức A mở/sửa ID chiến dịch tổ chức B | Từ chối nếu không có quyền |
| Lưu nháp thiếu brief hoặc ảnh | Lưu được; gửi đăng bị chặn và chỉ rõ thiếu gì |
| Nhập số suất bằng 0, số âm hoặc thập phân | Báo lỗi theo quy tắc số nguyên dương |
| Chọn nền tảng không có đầu việc tương ứng | Yêu cầu bổ sung hoặc bỏ nền tảng trước khi đăng |
| Chiến dịch nhiều nền tảng nhưng không rõ ứng tuyển một phần hay cả gói | Chưa đủ thông tin để gửi đăng theo mô hình nhóm đầu việc trong tài liệu |
| Tiền thù lao có khoảng min lớn hơn max | MVP chỉ có thù lao cố định; API từ chối cấu hình khoảng tiền |
| Xem trước chiến dịch có ngân sách/tệp nội bộ | Không hiển thị phần nội bộ trên bản công khai |
| Bấm gửi đăng nhiều lần hoặc mạng gửi lại | Một yêu cầu hợp lệ, không tạo bản trùng |
| Hạn ứng tuyển qua trong khi chờ duyệt | Không công bố chiến dịch hết hạn; yêu cầu cập nhật |
| Admin duyệt phiên bản đã được rút/sửa | Từ chối quyết định cũ, yêu cầu tải lại |
| Hai người lưu thay đổi đồng thời | Không âm thầm ghi đè; yêu cầu xử lý xung đột |
| Đổi thù lao sau khi có ứng viên | Bị chặn hoặc qua quy trình điều chỉnh đã duyệt; không âm thầm áp vào đơn cũ |
| Hết hạn nhưng KOL còn mở trang ứng tuyển | Máy chủ chặn đơn mới |
| Đóng tuyển khi có đơn đang chờ | Giữ đơn, ngừng nhận mới, cho phép tiếp tục xét đơn |
| Đủ số đơn nhưng chưa đủ booking | Không tự đóng theo số đơn trong phương án |
| Có booking đang thực hiện rồi yêu cầu hủy | Chuyển xử lý nghĩa vụ, không xóa/hủy trực tiếp |
| Đến ngày kết thúc dự kiến nhưng còn việc chưa nghiệm thu | Không tự chuyển Hoàn tất |
| Admin ẩn chiến dịch đang tuyển | Ngừng nhận đơn mới; giữ dữ liệu hợp tác và quyền truy cập hợp lệ |
| Gia hạn thời gian tuyển/mở lại sau đóng | Bị chặn trong MVP; không mở lại hoặc gia hạn hạn tuyển sau khi đã đóng |
| Kênh KOL hết hạn xác thực | Xử lý ở ứng tuyển/booking; không đổi trạng thái toàn chiến dịch vô lý |
| Thông báo hoặc cập nhật sàn bị lỗi | Có cơ chế thử lại; dữ liệu giao dịch vẫn nhất quán |
| Chiến dịch không tuyển được người | Xử lý kết thúc có lý do theo quy tắc trong tài liệu; không tạo kết quả nghiệm thu giả |

## 13. Phương án MVP áp dụng

| Nội dung | Quy tắc áp dụng |
|---|---|
| Điều kiện tạo/gửi đăng | Người có quyền được lưu nháp sau đăng nhập; tổ chức phải được xác minh để gửi đăng. Quản lý tổ chức gửi đăng/đóng tuyển/hủy; người biên soạn chỉ chỉnh nháp. Agency cung cấp căn cứ đại diện thương hiệu. |
| Kiểm duyệt | Admin duyệt trước đăng. Bổ sung/từ chối phải có lý do; kết quả gắn đúng phiên bản. |
| Quyền lợi | Tiền cố định, sản phẩm/trải nghiệm hoặc kết hợp; khai theo nhóm đầu việc. Thù lao VND/booking, không báo giá hoặc khoảng tiền trong MVP. |
| Thanh toán | Thanh toán ngoài hệ thống; KOLHUB chỉ ghi thỏa thuận và trạng thái do phân hệ đối soát quản lý, không bảo đảm/thu/giữ/chi tiền. |
| Số suất | Một suất là một booking của một kênh trong một nhóm đầu việc; không đồng nghĩa một người duy nhất. Có thể có nhiều sản phẩm bàn giao trong cùng booking. |
| Đa nền tảng | Mỗi nhóm gắn một nền tảng. Ứng tuyển từng nhóm, không bắt buộc nhận cả gói đa nền tảng. |
| Follower | Nhãn hàng xét thủ công; không tự chặn bởi chỉ số chưa được xác minh đáng tin cậy. |
| Tuyển liên tục | Cho xét/chọn trước hạn ứng tuyển, với lịch bàn giao còn khả thi tại lúc chốt. |
| Sửa sau đăng | Chưa có đơn: thay đổi điều kiện cần duyệt lại và tạm ngừng nhận đơn. Có đơn: khóa cam kết, chỉ sửa trình bày không đổi nghĩa sau Admin duyệt. Booking giữ bản điều khoản đã xác nhận. |
| Đủ suất | Cảnh báo khi đủ booking, không tự đóng; không cho chốt vượt suất. Chủ chiến dịch chủ động đóng; hết hạn luôn tự đóng. |
| Mở lại tuyển | Chưa hỗ trợ MVP; tạo chiến dịch mới để tuyển đợt khác. |
| Hủy/hoàn tất | Quản lý tổ chức yêu cầu; có booking phải xử lý nghĩa vụ trước. Hoàn tất khi hết việc/đơn/nghĩa vụ mở; không có KOL thì ghi Không phát sinh hợp tác. |
| Trang đóng tuyển | Giữ công khai, gắn nhãn Đã đóng tuyển, khóa CTA; bỏ khỏi danh sách đang tuyển. |
| Giới hạn dữ liệu | Tên 10–120 ký tự; mô tả ngắn tối đa 300; brief tối đa 20.000; mô tả mỗi đầu việc tối đa 3.000; ảnh JPG/PNG/WebP tối đa 10 MB; tài liệu PDF/JPG/PNG/WebP tối đa 5 tệp, 10 MB/tệp; link HTTPS. |
| Thông báo | Trong ứng dụng cho mọi sự kiện quan trọng; email cho kết quả duyệt/bổ sung/từ chối/ẩn gỡ. Nhắc trước hạn 24 giờ một lần nếu chiến dịch đang tuyển; không nhắc bù nếu thời điểm công bố đã vượt mốc nhắc. Không dùng SMS trong MVP. |
| Múi giờ | Hiển thị giờ Việt Nam UTC+7; lưu thời điểm chuẩn; hiện tại bằng hoặc vượt hạn là hết tuyển. |

Các giá trị giới hạn là cấu hình của phiên bản MVP. Khi thay đổi chính sách phải cập nhật đồng thời form, xử lý máy chủ, sàn, thông báo và kiểm thử; không thay đổi âm thầm các booking đã được xác nhận.

## 14. Thứ tự triển khai và điều kiện hoàn tất

### Thứ tự triển khai

1. Thiết lập cấu trúc dữ liệu theo quyền lợi, nhóm đầu việc, số suất và điều kiện đăng trong tài liệu.
2. Làm form, lưu nháp, xem trước và validation.
3. Làm gửi đăng, phản hồi duyệt và kết nối dữ liệu sàn; phối hợp màn Admin vận hành.
4. Làm danh sách quản lý, chỉnh sửa theo trạng thái và đóng tuyển tự động/thủ công.
5. Kết nối chỉ số ứng viên/booking, xử lý yêu cầu hủy/hoàn tất và kiểm thử xuyên phân hệ.

### Điều kiện hoàn tất Epic

- Các chính sách tại mục 13 được áp dụng nhất quán trên giao diện, máy chủ và các phân hệ liên quan.
- Nhãn hàng/Agency có thể tạo nháp, xem trước, gửi đăng và theo dõi kết quả.
- Chiến dịch công bố đúng phiên bản, đúng điều kiện và hiển thị trên sàn.
- Máy chủ kiểm tra quyền, trạng thái và hạn tuyển; không chỉ dựa vào UI.
- Các thao tác sửa/đóng/hủy không phá vỡ dữ liệu đơn và cam kết booking.
- Có trạng thái tải, rỗng, lỗi, thông báo và lịch sử thao tác.
- Vượt các kiểm thử áp dụng, đặc biệt hết hạn, gửi lặp, duyệt sai phiên bản, quyền truy cập và dữ liệu nội bộ.
- Bàn giao đầu mối vận hành xử lý duyệt, bổ sung, ẩn/gỡ và yêu cầu hủy.

**Kết quả đầu ra của Epic:** một chiến dịch có thông tin hợp tác rõ ràng, được công bố hợp lệ trên sàn, nhận ứng tuyển thông qua phân hệ tương ứng và được chủ chiến dịch quản lý xuyên suốt mà không làm mất lịch sử hoặc thay đổi âm thầm các cam kết đã xác nhận.
