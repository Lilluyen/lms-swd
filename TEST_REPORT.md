# Báo cáo kiểm thử Learnova — 12/11/2026

## Cập nhật: controller gọi trực tiếp proxy cho AI Question

- Endpoint `POST /api/questions/generate` gọi `QuestionGenerationService.prepare(...)`, sau đó **QuestionController gọi trực tiếp GeminiProxy.generateText(...)**, rồi dùng `parseDrafts(...)` để kiểm tra kết quả. Retry rỗng tối đa 3 lần do controller điều phối.
- Giữ API/JSON, quyền Teacher, context/ownership, validation, thông báo lỗi và retry. Bulk save/CRUD vẫn dùng QuestionService. Các method dùng chung trong GeminiProxy/GeminiApi và code course/quiz/feedback không thay đổi.
- `mvn -B verify`: PASS — 19 test Java, gồm 9 test mới cho generate/auth/validation/retry/status/no persistence và bulk save qua service.
- Bộ kiểm tra trên backend H2 riêng: smoke, regression, content, AI, 7 nhóm AI mở rộng và 4 nhóm hồ sơ/thanh toán/lưu trữ đều PASS. Kết quả tại [question-proxy-check/results.json](backend/target/question-proxy-check/results.json).
- Gemini dùng HTTP mock, không gọi provider thật. Các test frontend ở đợt trước vẫn được giữ; thay đổi lần này không sửa frontend.
- Tài liệu [sequence](docs/sequences/generate-question-ai.md) và [PlantUML](docs/sequences/generate-question-ai.puml) đã cập nhật controller → proxy.

## Đợt kiểm thử trước thay đổi controller

Đã tiếp tục đợt kiểm thử sau commit `fc7b7bf`, sửa lỗi ở form bài học và upload, rồi chạy lại các luồng giao diện chịu ảnh hưởng. Tất cả các bộ kiểm tra dưới đây đều đạt ở lần chạy cuối.

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `mvn -B clean verify` | PASS — 10 test Java, 0 lỗi, 0 bỏ qua |
| Frontend `npm run build` sau bản sửa | PASS — 3.115 modules |
| `scripts/smoke_test.py` | PASS |
| `scripts/regression_test.py` | PASS |
| `scripts/content_test.py` | PASS |
| `scripts/ai_test.py` | PASS |
| `scripts/ui_test.py` | PASS — chạy lại sau bản sửa frontend |
| `scripts/ui_student_test.py` | PASS — chạy lại theo luồng hiện tại |
| API AI mở rộng | PASS — 7 nhóm nghiệp vụ |
| Hồ sơ, thanh toán và lưu trữ bổ sung | PASS — 4 nhóm nghiệp vụ |
| CodeGraph review, Python syntax, `git diff --check` | PASS |

Build backend và bốn bộ API cơ bản được hoàn tất ở phần đầu của cùng đợt kiểm thử. Phần tiếp tục này sử dụng lại các kết quả đó, bổ sung kiểm tra API và chạy lại hai bộ giao diện. Frontend đã được build lại sau khi sửa; backend không thay đổi.

## Phạm vi đã kiểm tra

- Tài khoản: đăng ký, đăng nhập, session, CSRF, đăng xuất, phân quyền Teacher/Student, cập nhật hồ sơ và validation.
- Nội dung: CRUD Course–Module–Lesson, quyền sở hữu, tìm kiếm/lọc/phân trang, thứ tự module/bài học, upload và truy cập nội dung học tập.
- Câu hỏi AI: sinh bản nháp có trích dẫn context, sửa/lưu một phần, rollback bulk save lỗi, từ chối JSON hoặc trích dẫn không hợp lệ, retry câu trả lời rỗng và sử dụng model dự phòng.
- AI khóa học: chat nhận dàn ý; xem trước không lưu; xác nhận tạo khóa học cùng modules/lessons; tạo curriculum và chỉ áp dụng sau khi duyệt.
- AI bài học: sinh loạt bài; thêm tiếp/thay thế; đánh số tiêu đề; validation, rollback khi thay thế bằng dữ liệu lỗi và quyền sở hữu.
- Quiz: bản nháp AI chưa tạo dữ liệu; lưu quiz cùng câu đã duyệt; quiz luyện tập riêng của Student; bắt đầu/nộp/chấm điểm, bảo vệ đáp án trước khi nộp, quyền xem kết quả và chống nộp lặp.
- Phân tích kết quả AI: tạo nhận xét, lưu cache để lần sau không gọi Gemini lại và từ chối tài khoản khác truy cập.
- Học tập: ghi danh, đọc/hoàn thành bài học, tiến độ idempotent, wishlist, đánh giá, lưu trữ/bỏ lưu trữ khóa học và bảo vệ người chưa ghi danh.
- Thanh toán mô phỏng: checkout, voucher hợp lệ/không hợp lệ, hủy đơn, từ chối thanh toán đơn đã hủy, thanh toán lặp không ghi danh trùng, biên nhận, quyền sở hữu, webhook sai tài khoản và replay.
- Lỗi tích hợp: chưa có Gemini key trả 503, upstream lỗi trả 502, timeout trả 504; nội dung quá dài được báo lỗi thay vì cắt âm thầm.

Hai bộ Chrome headless đi qua màn Teacher/Student, form khóa học, AI Generate/Preview/Accept, module/lesson editor, question studio, trình đọc bài, làm quiz, điểm số, lịch sử và xem đáp án. Hai bộ giao diện cuối không ghi nhận runtime error.

Playwright CLI còn kiểm tra trực tiếp chat tạo khóa học, tạo/áp dụng curriculum, thêm tiếp/thay thế loạt bài học, chỉnh sửa/lưu từng phần câu hỏi, tạo quiz AI rồi bỏ một câu trước khi lưu. Đã đối chiếu số lượng dữ liệu qua API để xác minh bản nháp chưa được lưu trước khi xác nhận.

## Lỗi đã sửa

1. `LessonEditor` truyền prop `set` trong khi `LessonBodyFields` gọi `onChange`. Sửa nội dung Text hoặc URL Video gây `TypeError: onChange is not a function`. Đã truyền đúng callback, cùng trạng thái lưu và tệp hiện có; xác minh nhập, lưu và tải lại nội dung.
2. Handler upload ảnh bìa và tệp bài học chưa trả `false` cho Ant Design `beforeUpload`. Sau upload qua API, component gửi thêm POST tới trang ứng dụng và nhận 404; tệp bị validation từ chối cũng có thể bị gửi tiếp. Đã chặn upload tự động ở các nhánh thành công, lỗi và validation. Kiểm tra upload ảnh/tệp và không có POST thừa tới trang ứng dụng.

Hai bài test cũ cũng được cập nhật: nhận diện form bài học bằng `data-testid="lesson-form"` và nhãn hiện tại; kiểm tra trang xem đáp án mở ngay sau nộp quiz, rồi đối chiếu điểm đã lưu trong lịch sử. Bộ Teacher có thêm ca sửa/lưu/tải lại nội dung, upload ảnh bìa, upload/lưu bài học File và phát hiện request upload thừa.

## Môi trường và bằng chứng

- Backend profile `smoke`, H2 trong RAM ở chế độ MySQL; dữ liệu kiểm thử tách khỏi database đang sử dụng.
- Backend `127.0.0.1:18184`, frontend `127.0.0.1:15299`, Gemini HTTP mock `127.0.0.1:18299`; upload thử dưới `backend/target/full-test/uploads/`.
- Kết quả và log: [results.json](backend/target/full-test/results.json), [Teacher UI](backend/target/full-test/ui_test.log), [Student UI](backend/target/full-test/ui_student_test.log).
- API bổ sung: [AI mở rộng](backend/target/full-test/extended-results.json), [hồ sơ/thanh toán/lưu trữ](backend/target/full-test/additional-results.json).
- Log Playwright dưới `backend/target/full-test/playwright-cli/` có cả lỗi trước khi sửa; đánh giá bản sửa bằng kết quả lần chạy cuối ở trên.

Các file trong `backend/target/` là artifact local, không được Git theo dõi và sẽ mất khi chạy Maven clean.

## Cảnh báo và giới hạn

- Bundle JavaScript khoảng 1,32 MB (gzip khoảng 422 KB); Vite cảnh báo chunk lớn hơn 500 KB.
- Ant Design có cảnh báo API cũ: `maskClosable`, `Spin.tip`, `InputNumber.addonAfter`, `Card.bodyStyle` và static `message`. Chưa xử lý các cảnh báo này.
- Chưa chạy các luồng trực tiếp trên Docker/MySQL; kiểm thử tích hợp dùng H2 ở chế độ MySQL.
- Gemini dùng HTTP mock để kiểm tra hợp đồng và xử lý lỗi; chưa xác minh chất lượng nội dung hoặc truy cập model Gemini thật.
- Chưa thực hiện Google OAuth qua trình duyệt hay chuyển khoản/SE Pay thật. Thanh toán dùng webhook hoặc chức năng mô phỏng với dữ liệu kiểm thử.

Kết quả phản ánh các luồng và tình huống đã chạy, không phải cam kết mọi đường đi trong ứng dụng đều không còn lỗi.
