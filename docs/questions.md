# Bộ câu hỏi giáo viên

## Ngân hàng câu hỏi và tạo bài

Sau khi đăng nhập ở `/teacher`, mỗi lần nhập Excel có hai lựa chọn:

- **Chỉ lưu vào ngân hàng:** giữ các câu hỏi để dùng lại, chưa tạo bài cho học sinh.
- **Lưu vào ngân hàng và tạo bài:** nhập tên bài, xem trước rồi lưu ngân hàng và xuất bản bài trong một lần ghi nguyên tử. Nếu một phần bị từ chối, cả hai phần đều không được ghi.

Trang `/teacher/bank` có hai ngân hàng riêng cho ôn tập và trò chơi. Chỉ giáo viên được cấp quyền mới đọc được ngân hàng. Mỗi câu hiển thị loại, độ khó, ngày tạo, lựa chọn, đáp án và giải thích. Có thể sắp xếp mới/cũ hoặc dễ/khó, lọc mức khó và tìm theo từ khóa. Chọn các câu cụ thể hoặc nhập số câu cần lấy ngẫu nhiên từ danh sách đang lọc; các câu không bị lặp trong một bài. Kiểm tra bản xem trước, đặt tên rồi bấm **Đăng bài cho học sinh**. Các câu gốc vẫn ở ngân hàng để dùng cho bài khác.

Cột Excel thứ sáu là **Độ khó**, nhận số nguyên từ **1–5**. Ô trống hoặc tệp mẫu cũ chỉ có năm cột được hiểu là **1**. Tệp mẫu mới có sẵn cột này. Mã nhập được tạo ổn định theo nội dung tệp và dòng; nhập lại cùng tệp sẽ dùng lại các câu đã nhập, không tạo bản sao. Thay đổi nội dung tệp sẽ tạo một lượt nhập mới.

Dữ liệu ngân hàng nằm ở `questionBank/questions/{id}` và `questionBank/game/{id}` trong Realtime Database. Mỗi truy vấn đọc tối đa 25 câu theo chỉ mục `createdAt`; dịch vụ tiếp tục đọc các trang kế tiếp để không bỏ sót câu cũ và giữ kết quả trong phiên giáo viên. `difficulty` cũng có chỉ mục. Bộ câu hỏi đã xuất bản vẫn ở `questionSets/{id}`; mỗi bài tối đa 100 câu và thư viện hiện có 30 vị trí bài cho mỗi chế độ. Khi hết vị trí, vẫn có thể nhập vào ngân hàng; quản trị viên cần lưu trữ bài cũ để xuất bản thêm.

Các quy tắc production bảo vệ ngân hàng bằng Firebase Authentication và quyền giáo viên, kiểm tra mức khó, loại câu, kích thước trường, tác giả và ngày tạo. Câu ngân hàng chỉ được tạo, không ghi đè hay xóa bằng client. Bộ câu hỏi cũ không có độ khó vẫn đọc được ở mức 1. Kết quả học sinh chỉ ở thiết bị.

Ngày 08/10/2026, ba câu ôn tập và sáu câu trò chơi của hai bộ mẫu đang có đã được thêm vào hai ngân hàng, ở độ khó 1. Ngày tạo của các bản ghi ngân hàng là ngày nhập vào ngân hàng; các bài cũ được giữ nguyên.

Kiểm tra quy tắc với Auth emulator ở `127.0.0.1:9099` và Database emulator ở `127.0.0.1:9000`, dùng đúng `firebase/database.rules.json` và namespace `local-history-geography-default-rtdb`:

```powershell
node scripts/check-question-bank-rules.mjs
```

Lệnh chỉ kết nối localhost, tạo dữ liệu thử tạm thời và dọn các bản ghi do chính lượt kiểm tra tạo; không đọc hay ghi Firebase production.

## Làm bài và tương tác

Trang ôn tập hiển thị lựa chọn cùng chiều rộng: bốn lựa chọn ngắn xếp 2×2, lựa chọn dài hoặc màn hình hẹp xếp một cột. Học sinh có thể sửa đáp án trước khi bấm **Lưu bài làm**; thao tác này chấm toàn bộ đề một lần, tính câu chưa trả lời là chưa đúng. **Làm lại** xóa đáp án và kết quả trên thiết bị.

Trong trò chơi, kéo trực tiếp thẻ sắp xếp bằng chuột hoặc cảm ứng; bàn phím dùng phím lên/xuống trên thẻ đang được chọn. Ghép cặp tạo đường nối và bấm lại một đầu nối để gỡ cặp. Câu điền từ hiển thị từng ô chữ, hỗ trợ dấu tiếng Việt, dán văn bản và các cách trả lời được chấp nhận có độ dài khác nhau. Các nút kiểm tra và chuyển câu nằm giữa, bên dưới phần trả lời.

Các trang: `/questions` (ôn tập), `/games` (sân chơi), `/teacher` (đăng nhập và nhập Excel). Hai bộ minh họa đã được nhập bằng tệp mẫu qua giao diện giáo viên và lưu trong Realtime Database: `questionSets/questions-0` — **Mẫu Excel: Ôn tập**, và `questionSets/game-0` — **Mẫu Excel: Sáu kiểu chơi**. Đây là dữ liệu thử chức năng, không phải chương trình học chính thức. Tệp Excel được đọc trên thiết bị để tạo câu hỏi; ứng dụng không lưu bản gốc Excel trong Storage.

Kiểm tra tích hợp: 43 bài kiểm tra tự động và bản dựng production thành công; Chrome xác nhận đăng nhập sai/đúng, tải hai mẫu Excel, xem trước và đăng hai bộ, chấm 3 dạng ôn tập và 6 dạng trò chơi, bố cục điện thoại và đăng xuất. Quy tắc Firebase thực tế từ chối ghi ẩn danh, thay đổi quyền giáo viên từ client, dữ liệu lựa chọn sai cấu trúc và truy vấn công khai không giới hạn.

Ứng dụng đọc các bộ câu hỏi đã xuất bản từ `questionSets/{id}` trong Firebase Realtime Database. Mỗi chế độ (`questions` hoặc `game`) có đúng 30 vị trí (`questions-0` đến `questions-29`, `game-0` đến `game-29`), nên một truy vấn giới hạn 30 bản ghi luôn thấy toàn bộ thư viện của chế độ đó. Kết quả được giữ trong phiên. Một lần tạo ghi toàn bộ bộ câu hỏi (`published: true`) vào một bản ghi; không có bản nháp trong nhánh này. Khi đủ 30 bộ, giáo viên nhận thông báo đầy thư viện và cần nhờ quản trị viên lưu trữ một bộ cũ trước khi đăng thêm.

## Tài khoản giáo viên

Firebase Authentication **Email/Password đã được bật** trong dự án. Tài khoản `nhan` đã được tạo và UID của tài khoản đã có `teachers/{uid}: true`. Mật khẩu không nằm trong mã nguồn. Tên đăng nhập ngắn như `nhan` được đổi thành `nhan@teachers.local-history-geography.app`; địa chỉ email đầy đủ cũng được chấp nhận.

Để thêm giáo viên sau này, quản trị viên tạo tài khoản Email/Password trong Firebase Authentication, rồi dùng Admin SDK hoặc Firebase Console đặt `teachers/{uid}: true` trong Realtime Database, hoặc gán custom claim `contentEditor: true` từ môi trường quản trị đáng tin cậy. Quy tắc chỉ cho người dùng đã đăng nhập đọc giá trị allowlist của chính mình. Client không thể ghi allowlist, tạo tài khoản hoặc gán claim. Quyền ghi bộ câu hỏi được kiểm tra lại trong Database Rules.

Khi dùng emulator cục bộ, bật `localStorage.setItem('firebase-emulators', 'true')` tại `localhost`, khởi động Auth ở cổng 9099 và Database ở cổng 9000, rồi tạo tài khoản cùng allowlist trong emulator. Không dùng tài khoản hay mật khẩu sản xuất trong tài liệu hoặc dữ liệu mẫu.

## Excel

Tải tệp mẫu `.xlsx` từ trang giáo viên. Tệp có trang **Hướng dẫn** và trang **Questions**. Dòng đầu của trang Questions phải bắt đầu ở A1 và có đúng các tiêu đề:

| Loại câu hỏi | Câu hỏi | Lựa chọn | Đáp án | Giải thích | Độ khó |
| --- | --- | --- | --- | --- | --- |

Cột **Độ khó** tùy chọn để tương thích mẫu cũ; để trống được hiểu là 1.

Dùng dấu `|` để tách các lựa chọn hoặc đáp án, không dùng dấu đó bên trong nội dung một mục. Mỗi tệp có tối đa 100 dòng câu hỏi (dòng 2–101), dung lượng nén tối đa 2 MiB, tổng nội dung giải nén tối đa 8 MiB. Công thức và macro không được hỗ trợ. Lỗi nhập hiển thị số dòng bảng tính.

| Loại | Lựa chọn | Đáp án |
| --- | --- | --- |
| `single` | Ít nhất 2 mục | Đúng 1 mục có trong lựa chọn |
| `multiple` | Ít nhất 2 mục | Các mục đúng có trong lựa chọn, không trùng |
| `yesno` | Để trống hoặc `Đúng|Sai` | `Đúng` hoặc `Sai` (lưu thành `true`/`false`) |
| `order` | Các mục cần xếp | Toàn bộ các mục theo thứ tự đúng |
| `match` | Các mục bên trái | Mục bên phải ở cùng vị trí tạo một cặp |
| `fill` | Để trống | 1–5 cách viết được chấp nhận |

Chế độ ôn tập (`questions`) chỉ nhận `single`, `multiple`, `yesno`; chế độ trò chơi nhận đủ sáu loại. `match` giữ hai mảng cùng thứ tự để biểu diễn từng cặp. Với `fill`, Firebase không lưu mảng rỗng, nên trình đọc khôi phục `options: []` trước khi kiểm tra bản ghi.

## Triển khai

Quy tắc trong `firebase/database.rules.json` cần được triển khai cùng ứng dụng để đăng câu hỏi hoạt động. Chúng giữ nguyên nhánh `lessons` và `media`, tạo chỉ mục `mode`, chỉ cho phép 30 mã vị trí mỗi chế độ, giới hạn truy vấn công khai ở 30 bộ, buộc mỗi bộ được xuất bản trong một lần ghi, và giới hạn tối đa 100 câu mỗi bộ. Tài khoản giáo viên và allowlist phải tồn tại trong cùng dự án Firebase với ứng dụng. Chỉ quản trị viên mới được cấp quyền hoặc xóa bộ đã xuất bản qua công cụ quản trị đáng tin cậy.
