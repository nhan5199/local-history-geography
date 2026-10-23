export interface GuidePassage { key: string; title: string; text: string; keywords: string; url: string; example?: string; sample?: boolean; }
/** Matches the controls available on the corresponding public pages. */
export const SITE_GUIDE: readonly GuidePassage[] = [
  { key: 'site:map', title: 'Bản đồ', keywords: 'map zoom search ban do phong to thu nho tim dia phuong', text: 'Gõ tên địa phương vào ô tìm kiếm, chọn kết quả để xem trên bản đồ. Dùng nút + hoặc − để phóng to, thu nhỏ; kéo để di chuyển.', url: '/map' },
  { key: 'site:books', title: 'Tủ sách', keywords: 'books book pdf sach doc lat trang', text: 'Chọn một bìa sách để mở. Em có thể lật trang bằng nút điều khiển, bàn phím hoặc vuốt trên màn hình cảm ứng.', url: '/books' },
  { key: 'site:panorama', title: 'Góc 360°', keywords: 'panorama 360 xoay anh toan canh', text: 'Chọn một ảnh 360°, rồi kéo để nhìn quanh. Đọc tên và chú thích để biết đó là địa điểm nào; ảnh mẫu được ghi rõ.', url: '/panorama' },
  { key: 'site:games', title: 'Sân chơi', keywords: 'games game tro choi san choi choi', text: 'Chọn một vòng chơi và làm theo hướng dẫn trên sân khấu. Có các kiểu chọn đáp án, đúng/sai, sắp xếp, nối cặp và điền từ.', url: '/games' },
  { key: 'site:questions', title: 'Câu hỏi ôn tập', keywords: 'test quiz question cau hoi kiem tra luu bai lam diem', text: 'Chọn một bộ câu hỏi, trả lời rồi bấm “Lưu bài làm” để chấm cả bài. Em có thể sửa đáp án trước khi nộp và làm lại sau đó.', url: '/questions' },
  { key: 'site:lessons', title: 'Bài học', keywords: 'lessons lesson bai hoc tim hoc chu de', text: 'Chọn Lịch sử hoặc Địa lý, hoặc gõ từ khóa để tìm bài. Chạm vào thẻ để mở bài học. Các bài mẫu được ghi rõ.', url: '/lessons' },
  { key: 'site:teacher', title: 'Góc giáo viên', keywords: 'teacher login account password dang nhap giao vien tai khoan mat khau', text: 'Học sinh không cần đăng nhập để khám phá. Giáo viên dùng tài khoản được quản trị viên cấp để nhập và xuất bản câu hỏi. Milo không biết mật khẩu của em.', url: '/teacher' },
];
