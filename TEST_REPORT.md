# Phạm vi kiểm thử

- Frontend Vite production build: thành công (`npm run build`, 31/10/2026).
- Backend Maven compile/package và khởi động Spring Boot profile smoke: thành công (`mvn test`, `mvn package`, 31/10/2026; project hiện chưa có Java unit test source).
- API smoke test: đăng ký, login, session, CSRF, logout, phân quyền Student/Teacher; course/module/lesson; question; quiz; ghi danh miễn phí và webhook thanh toán mô phỏng: thành công.
- Kiểm thử mở rộng: quyền sở hữu, rollback câu hỏi lỗi, bảo vệ kết quả, từ chối nộp quiz lặp, wishlist, đánh giá và thống kê course, tiến độ idempotent, Gemini chưa cấu hình trả 503, trạng thái đơn SE Pay và webhook replay: thành công (đã chạy `scripts/regression_test.py`).
- Quản lý nội dung: `scripts/content_test.py` thành công, gồm CRUD/ownership Course–Module–Lesson, upload, thứ tự, context AI 20.000 ký tự, thiếu Gemini key, context bắt buộc cho AI Question, quyền Lesson và từ chối tự trích xuất Video/File.
- Browser Chrome headless: `scripts/ui_test.py` thành công với Teacher session; đã đi qua Course List, validation Course Form, Generate/Preview/Accept nội dung AI, Module/Lesson Editor và workspace AI Question có Lesson picker, context editor, validation inline. Gemini giả lập đã trả 2 câu có `contextReference` hợp lệ và backend chấp nhận; không ghi nhận runtime error.
- Browser Chrome headless: `scripts/ui_student_test.py` thành công với Student session; đã kiểm tra course card grid dùng ảnh minh họa mặc định, dashboard/course library, course detail, đọc và hoàn thành lesson, làm/nộp quiz, điểm số và xem đáp án; không ghi nhận runtime error.
- Vite dev proxy hỗ trợ `VITE_API_PROXY` để các bài kiểm thử và môi trường phát triển có thể chọn backend mà không chiếm hoặc dừng tiến trình đang chạy trên cổng 8080.
- Database kiểm thử là H2 ở chế độ MySQL. Chưa chạy trực tiếp Docker/MySQL 8.4 trong môi trường này.
- Chưa gọi Google OAuth, Gemini hoặc thanh toán SE Pay thật vì chưa có thông tin tích hợp của người dùng.

Đây là bản học tập rút gọn. Không phải cam kết không còn mọi lỗi hoặc sẵn sàng vận hành thương mại.
