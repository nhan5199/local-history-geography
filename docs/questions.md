# Bộ câu hỏi giáo viên

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

| Loại câu hỏi | Câu hỏi | Lựa chọn | Đáp án | Giải thích |
| --- | --- | --- | --- | --- |

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
