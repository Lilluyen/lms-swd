# Learnova LMS — bản rút gọn theo G4_GroupProject.docx

React + Vite + Ant Design + Lucide; Spring Boot 3.5.6, Java 17, Spring Security, JPA; MySQL 8.4. Giao diện tiếng Việt và tách quyền Guest, Teacher, Student.

### Chạy trên Windows không dùng Git Bash

Khi không dùng Git Bash/WSL, Docker Compose vẫn chạy được trên Command Prompt/PowerShell (Docker Desktop), nhưng **script `start-backend.sh` không chạy được** vì nó là bash script. Trên Windows thuần, làm theo các bước:

- Copy file cấu hình: `copy .env.example .env` (Command Prompt) hoặc `Copy-Item .env.example .env` (PowerShell).
- Khởi chạy Docker: `docker compose up -d`.
- Backend: **Bắt buộc phải export thủ công các biến trong `.env` vào môi trường trước khi chạy Maven**, vì Spring Boot/Maven không tự đọc file `.env`.
  - Command Prompt (lệnh chạy từng dòng): mở terminal tại thư mục `lms`.
    ```cmd
    set DB_URL=jdbc:mysql://localhost:3306/learnova_compact?createDatabaseIfNotExist=true
    set DB_USER=lms
    set DB_PASSWORD=lms
    set FRONTEND_URL=http://localhost:5173
    set GOOGLE_CLIENT_ID=...
    set GOOGLE_CLIENT_SECRET=...
    set GEMINI_API_KEY=...
    set GEMINI_MODEL=gemini-2.5-flash
    set UPLOAD_DIR=uploads
    set DEMO_DATA=true
    cd backend
    mvn spring-boot:run
    ```
    (Gõ từng `set VAR=value` rồi Enter, hoặc viết vào file batch `start-backend.bat` trong thư mục `lms`:
    ```cmd
    @echo off
    cd /d "%~dp0"
    for /f "usebackq delims=" %%i in (`findstr /v /r "^\s*$\) back to set /p "%%i" do @set "%%i"
    cd backend
    call mvn spring-boot:run
    ```
    rồi chạy `start-backend.bat`. Lưu ý: lệnh `for /f` trên cần điều chỉnh để bỏ comment `#` và dòng trống; cách简单是 gõ thủ công hoặc chỉnh sửa batch file theo config thực tế của bạn.)
  - PowerShell (lệnh chạy từng dòng): mở terminal tại thư mục `lms`.
    ```powershell
    $env:DB_URL = "jdbc:mysql://localhost:3306/learnova_compact?createDatabaseIfNotExist=true"
    $env:DB_USER = "lms"
    $env:DB_PASSWORD = "lms"
    $env:FRONTEND_URL = "http://localhost:5173"
    $env:GOOGLE_CLIENT_ID = "..."
    $env:GOOGLE_CLIENT_SECRET = "..."
    $env:GEMINI_API_KEY = "..."
    $env:GEMINI_MODEL = "gemini-2.5-flash"
    $env:UPLOAD_DIR = "uploads"
    $env:DEMO_DATA = "true"
    cd backend
    mvn spring-boot:run
    ```
    (Gõ từng `$env:VAR = "value"` rồi Enter, hoặc tạo file `start-backend.ps1`:
    ```powershell
    Set-Location "$PSScriptRoot"
    Get-Content .env | ForEach-Object {
      if ($_ -match '\s*#') { return }
      $name, $value = $_ -split '=', 2
      if ($name -and $value) { $env:($name.Trim()) = $value.Trim() }
    }
    Set-Location backend
    & mvn spring-boot:run
    ```
    rồi chạy `.\start-backend.ps1`.)
  - Hoặc dùng Git Bash/WSL: chạy `bash scripts/start-backend.sh` như trên Linux.
- Frontend: mở terminal thứ hai tại `lms`, chạy:
  - Command Prompt: `cd frontend` → `npm ci` → `npm run dev`
  - PowerShell/Git Bash: `cd frontend` → `npm ci` → `npm run dev`

Lưu ý: trên Command Prompt, đường dẫn phân cách bằng `\` (ví dụ `cd backend\target`), còn PowerShell và Git Bash dùng `/`. Các lệnh `mvn`, `npm`, `java`, `python`/`python3` cần có trong PATH. Nếu dùng WSL, dùng terminal Linux như bình thường.

## Chạy trên Linux / Windows

Cần Java 17, Maven 3.9+, Node.js 20.19+ hoặc 22.12+, npm và Docker Compose. Giải nén vào thư mục mới, mở terminal tại thư mục `lms`.

- Linux: mở terminal (bash).
- Windows: dùng Git Bash (đã cài sẵn khi cài Git for Windows) hoặc WSL để chạy đúng như hướng dẫn dưới đây. Nếu dùng Command Prompt / PowerShell thuần Windows, đọc phần **Windows không dùng Git Bash** ở dưới.

Backend đọc cấu hình từ file `.env` trong thư mục `lms`. Trên Linux/Git Bash/WSL, chạy script `scripts/start-backend.sh` — script này làm 3 việc:

1. Kiểm tra file `.env` có tồn tại không.
2. Export tất cả biến trong `.env` vào môi trường shell (tương đương `set -a && source .env && set +a`).
3. `cd` vào thư mục `backend` rồi chạy `mvn spring-boot:run`.

Do đó, chạy backend giống nhau trên Linux và Git Bash/WSL:

```bash
cp .env.example .env
docker compose up -d
bash scripts/start-backend.sh
```

- `cp` (copy) sao chép cấu hình mẫu thành `.env` để bạn chỉnh riêng.
- `docker compose up -d`: tạo/chạy MySQL; `-d` (detached) chạy nền. Lần đầu Docker nhập `database/init.sql` vào database **learnova_compact**.
- `bash scripts/start-backend.sh`: nạp biến trong `.env`, chuyển vào backend và chạy `mvn spring-boot:run`. `mvn` là Maven. Giữ terminal này mở.

Command `npm run dev` ở frontend ngang hàng với backend, không đọc `.env`.

Mở terminal thứ hai tại `lms`:

```bash
cd frontend
npm ci
npm run dev
```

- `cd` (change directory) chuyển vào frontend.
- `npm` (Node Package Manager); `ci` cài đúng các phiên bản trong lockfile, thích hợp chạy lại dự án.
- `npm run dev` chạy Vite ở http://localhost:5173. Backend ở http://localhost:8080; Vite chuyển tiếp `/api` và `/oauth2` đến backend.

Nếu cổng 3306 đã có MySQL, đổi mapping trong Compose thành `3307:3306` và đổi cổng trong `DB_URL` thành `3307`. Không cần xóa dữ liệu MySQL đang dùng.

Bản này dùng database và volume riêng. Không nhập SQL mới đè lên database của bản LMS trước. SQL chỉ khởi tạo database mới; chưa kèm migration chuyển dữ liệu từ phiên bản 12 bảng cũ. Hibernate `ddl-auto: update` phục vụ môi trường phát triển.

## Tài khoản mẫu

`.env.example` bật `DEMO_DATA=true`. Khi backend chạy lần đầu, tạo 3 khóa học, 3 câu hỏi, 3 quiz và hai tài khoản:

| Vai trò | Email                  | Mật khẩu demo |
| ------- | ---------------------- | ------------- |
| Teacher | teacher@learnova.local | Learnova@123  |
| Student | student@learnova.local | Learnova@123  |

Dữ liệu mẫu được lưu thật vào DB. Đặt `DEMO_DATA=false` để không khởi tạo mẫu ở database mới. Tài khoản mẫu chỉ dùng cho bài tập; không dùng với môi trường công khai. Đăng ký Teacher đang mở để thuận tiện demo nhóm; bản triển khai thực tế cần quy trình cấp quyền.

## Phạm vi đã triển khai

| Nhóm               | Chức năng                                                                                                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tài khoản          | Email/password, đăng ký Teacher/Student, Google login cho tài khoản đã tồn tại, CSRF, session, logout, sửa tên hồ sơ                                                                                                                                             |
| Khóa học (Teacher) | Danh sách khóa học của riêng mình có tìm kiếm, lọc Draft/Published, phân trang 10 dòng; tạo/sửa với validation 5–100 ký tự, giá 0–100.000.000 ₫, ảnh bìa JPG/PNG ≤2 MB; xóa có kiểm tra ghi danh                                                                 |
| Module & Lesson    | Thêm/sửa/xóa module (kéo thả đổi thứ tự, lưu ngay vào DB), xóa module kèm cảnh báo và cascade lesson; lesson Text/Video link/File (tải tệp ≤25 MB), thời lượng 1–600 phút, thứ tự chuẩn hóa trong cùng khóa học                                                  |
| Ngân hàng câu hỏi  | Tự tạo bank theo Teacher + subject, chọn subject làm tiêu đề, tìm kiếm, lọc độ khó, phân trang, xem/tạo/sửa/xóa câu hỏi; workspace AI cho phép lấy Course → Module → Lesson Text hoặc dán nội dung thủ công, sửa bản nháp, chọn một phần và lưu theo transaction |
| Gemini             | Sinh câu hỏi trắc nghiệm dựa trên nội dung bài học bắt buộc và trả trích dẫn làm căn cứ; dialog “Generate with AI” cho mô tả khóa học và lesson Text với editor context, preview / Edit / Accept / Reject / Close                                                |
| Ghi danh           | Khóa miễn phí mở ngay; khóa trả phí tạo mã chuyển khoản và QR SE Pay, webhook xác thực, kiểm tra tài khoản/số tiền/chiều giao dịch, chống xử lý lại transaction ID, giao diện tự kiểm tra trạng thái                                                             |
| Quiz               | Teacher tạo/sửa/xóa quiz từ câu hỏi của mình; Student làm quiz, bộ đếm giờ, chấm tự động, lịch sử và xem lại đáp án/giải thích; quiz AI riêng của Student                                                                                                        |

Giáo viên có thể vào **Quiz luyện tập → Tạo quiz**, nhập tiêu đề, môn học, thời gian, số câu (1–20) và độ khó rồi chọn **AI tạo câu hỏi**. Gemini soạn bản nháp tiếng Việt theo cả tiêu đề và môn học, không bắt buộc dán nội dung bài học. Giáo viên xem câu hỏi, đáp án đúng, giải thích và bỏ các câu không phù hợp trước khi chọn **Lưu quiz**. Bản nháp chưa được lưu vào DB; khi lưu, Quiz và câu hỏi được tạo trong cùng transaction, thuộc tài khoản giáo viên hiện tại. Đổi tiêu đề hoặc môn học sẽ xóa bản nháp để tạo lại theo tiêu chí mới. Chức năng này cần `GEMINI_API_KEY` hợp lệ.

API chỉ dành cho Teacher: `POST /api/quizzes/ai/draft` nhận `{title, subject, difficulty, quantity}` và trả các bản nháp; `POST /api/quizzes/ai` nhận `{title, subject, durationMinutes, questions}` để lưu Quiz và câu hỏi đã duyệt. Cả hai sử dụng session và CSRF như các API hiện có.

Không có bảng Subject riêng: subject là thuộc tính của question_banks và questions. Mỗi câu trắc nghiệm có đúng một đáp án đúng. Trong bản rút gọn, quiz là bài luyện tập độc lập theo môn, chưa buộc vào course. Chưa có câu tự luận/chấm tự luận AI, quản trị Admin/Manager, email thông báo hoặc hóa đơn. Bảng `learning_materials` được giữ trong schema để mở rộng, chưa có màn quản lý tài liệu. Tệp tải lên được lưu trên đĩa tại `UPLOAD_DIR` (mặc định `backend/uploads`) và phục vụ qua `/api/files/{name}` cho người đã đăng nhập.

Để giữ đề và kết quả nhất quán: câu hỏi đã gắn vào quiz không được sửa trực tiếp; quiz đã có lượt làm không được sửa/xóa. Kết quả lưu bản chụp nội dung, đáp án và giải thích. Xóa module sẽ xóa lesson bên trong trong cùng transaction; tiến độ và tài liệu của lesson được dọn trước khi xóa. Khóa học đã có học viên hoặc giao dịch đã thanh toán sẽ bị từ chối xóa kèm lý do.

## Google Login và Teacher

1. Tạo OAuth Web Client, khai báo callback chính xác: `http://localhost:8080/login/oauth2/code/google`.
2. Điền `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` vào `.env`, sau đó khởi động lại backend. Script `bash scripts/start-backend.sh` (hoặc chạy thủ công `set -a && source .env && set +a && cd backend && mvn spring-boot:run` trên Linux/Git Bash/WSL) sẽ tự đọc `.env` và export biến vào môi trường trước khi chạy Maven. Backend và `java -jar` đều đọc biến môi trường, không đọc trực tiếp file `.env`.
3. Đăng ký trong LMS bằng đúng email Google. Chọn Teacher nếu cần tài khoản giáo viên; sau đó đăng xuất và dùng nút Google.
4. Google chỉ đăng nhập vào tài khoản đã có và giữ vai trò hiện tại, theo mô tả trong DOCX. Email chưa có tài khoản sẽ được yêu cầu đăng ký trước.

Không xóa giá trị `placeholder` của hai biến Google khi chưa cấu hình. Email/password vẫn hoạt động khi chưa bật Google.

## Gemini

Điền `GEMINI_API_KEY` và `GEMINI_MODEL` vào `.env`. Model mặc định là `gemini-2.5-flash`, có thể thay bằng model tài khoản của bạn được phép dùng. Không có API key thì giao diện báo chưa cấu hình; hệ thống không giả lập nội dung AI.

**Ngữ cảnh cho AI.** Form khóa học có trường context dùng lại nhiều lần (lưu ở `courses.context`, tối đa 2.000 ký tự). Mỗi dialog Generate with AI có editor riêng tối đa 20.000 ký tự để dán bài giảng, định nghĩa, ví dụ, đoạn mã hoặc tài liệu tham khảo; nếu editor trống, backend dùng context đã lưu của khóa học. Prompt tách phần tài liệu bằng ranh giới rõ ràng, coi đó là dữ liệu tham khảo không đáng tin cậy và không thực thi chỉ dẫn nằm trong tài liệu.

**AI tạo câu hỏi.** Teacher phải cung cấp Lesson Context, bằng cách chọn Course → Module → Lesson dạng Text rồi bấm “Dùng nội dung bài”, hoặc nhập thủ công vào editor 20.000 ký tự. Backend kiểm tra quyền sở hữu Lesson, dùng context làm nguồn kiến thức duy nhất, yêu cầu mỗi câu có một đoạn trích `contextReference`, rồi xác minh đoạn trích thật sự có trong context trước khi trả preview. Video/File không được giả định đã trích xuất nội dung; hãy dán transcript hoặc nội dung tài liệu. Bản rút gọn hiện hỗ trợ AI cho Multiple Choice.

Luồng lưu hai bước: **Accept** chỉ điền nội dung vào form đang mở và báo “Đã áp dụng nội dung AI”; phải bấm **Save** trên form cha mới ghi database và báo “Đã lưu…”. Kết quả vượt giới hạn 2.000/10.000 ký tự sẽ hiện cảnh báo kèm số ký tự, cho phép Edit hoặc tạo lại — không tự cắt. Lỗi/timeout Gemini hiển thị ở dòng Status và không áp dụng nội dung lỗi.

## SE Pay

Tài liệu dùng lẫn PayOS và SE Pay; bản này thống nhất SE Pay như yêu cầu trước đó.

Điền `SEPAY_ACCOUNT_NUMBER`, `SEPAY_BANK_CODE`, `SEPAY_WEBHOOK_KEY`. Cấu hình webhook POST tới `https://YOUR_BACKEND/api/payments/sepay-webhook`, Authorization dạng `Apikey YOUR_KEY`. Backend phải có HTTPS công khai để SE Pay gửi callback (có thể dùng tunnel khi demo).

Payload sử dụng `id`, `accountNumber`, `content`, `transferType`, `transferAmount`. Nội dung phải chứa mã LMS của đơn, chiều giao dịch là `in`, tài khoản đúng và số tiền ít nhất bằng giá khóa học. ID giao dịch được lưu duy nhất để chống replay. Kiểm thử đã dùng callback mô phỏng; cần thử giao dịch thật với tài khoản SE Pay của bạn trước khi vận hành.

## Database và cấu trúc mã nguồn

SQL có 17 bảng, bám theo nhóm thực thể của DOCX:

`roles`, `users`, `course_categories`, `courses`, `modules`, `lessons`, `learning_materials`, `enrollments`, `payment_transactions`, `learning_progress`, `question_banks`, `questions`, `answers`, `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_attempt_answers`.

Một số tên cột được rút gọn cho Java/API, ví dụ `name`, `content`, `position`. `users.role` và `courses.category` giữ chuỗi nhãn cùng liên kết đến bảng định nghĩa. `payment_transactions` kiêm đơn thanh toán và liên kết Student/Course; enrollment chỉ tạo khi thanh toán thành công. `quiz_attempt_answers` bổ sung snapshot để lịch sử không đổi theo nội dung câu hỏi.

Bổ sung cho quản lý nội dung: `courses.updated_at`, `courses.context`, `modules.description`, `lessons.content_type`, `lessons.duration_minutes`, `lessons.file_url`, `lessons.file_name`. Hibernate `ddl-auto: update` tự thêm cột ở môi trường phát triển; với database đang chạy, áp dụng migration idempotent:

```bash
mysql -u lms -p learnova_compact < database/migrations/2026-10-30_course_content.sql
```

Migration giữ nguyên dữ liệu cũ; lesson cũ có `video_url` được đánh dấu `VIDEO`, còn lại là `TEXT`. Bảng mới không cần tạo: module/lesson dùng lại `modules` và `lessons`, tránh trùng chức năng với Chapter.

Backend chia package `controller`, `dto`, `service`, `entity`, `repository`, `security`, `integration`, `util`, `web`. API quản lý nội dung nằm ở `/api/teacher/**` (kiểm tra role Teacher và quyền sở hữu ở từng thao tác), upload ở `/api/teacher/uploads`, tệp ở `/api/files/**`. SQL ở `database/init.sql`, migration ở `database/migrations`, cấu hình ở `.env.example`, frontend ở `frontend/src`.

### Cấu trúc sau refactor

- `controller/`: API tách theo feature — `CourseApi` (khóa học/module/lesson/review), `QuestionApi` (ngân hàng câu hỏi + AI), `QuizApi` (quiz/kết quả), `LearningApi` (ghi danh/wishlist/tiến độ), `TeacherApi` (nội dung Teacher), `PaymentApi`, `AuthApi`; helper session/quyền sở hữu dùng chung ở `BaseController`.
- `service/`: nội dung Teacher tách thành `CourseContentService`, `ModuleContentService`, `LessonContentService`, dùng chung `ContentAccessService` (kiểm tra sở hữu) và `ContentValidation` (validation).
- `integration/`: `GeminiApi` giữ transport HTTP; `Integrations` giữ prompt/parse/lỗi theo từng tính năng.
- `frontend/src/pages/`: mỗi nhóm màn hình là một feature component; `main.jsx` chỉ giữ state, side effect và điều hướng.
- `frontend/src/teacher/`: mỗi màn Teacher là một feature component độc lập, màn lớn tách tiếp thành panel trình bày; `teacher.jsx` chỉ là barrel export.
- `frontend/src/components/common.jsx`: các presentation component dùng chung như CourseGrid, PageTitle, Empty và CopyButton.
- `frontend/src/styles/`: stylesheet chia theo layer/domain; `style.css` chỉ giữ thứ tự import để bảo toàn cascade.
- `PaymentApi`: HTTP adapter cho checkout/order/webhook; không chứa nghiệp vụ thanh toán.
- `PaymentService`: application service quản lý vòng đời đơn SE Pay, đối soát webhook và cấp enrollment.
- `CurrentUserService`: một nơi duy nhất thực thi quy tắc lấy user hiện tại và kiểm tra role.

#### Sơ đồ phụ thuộc

Backend — controller mỏng gọi service theo feature, transport Gemini nằm riêng:

```
TeacherApi ─┬─> CourseContentService ─┐
            ├─> ModuleContentService ─┼─> ContentAccessService + ContentValidation
            └─> LessonContentService ─┘

CourseApi     ─> các service nội dung ở trên (khóa học, module, lesson, review)
QuestionApi   ─> QuestionGenerationService ─> AiContentService ─> Integrations ─> GeminiApi
QuizApi       ─> quiz / attempt / scoring / result snapshot
LearningApi   ─> enrollment, wishlist, learning progress
PaymentApi    ─> PaymentService ─> cấp enrollment khi đơn đã thanh toán

Mọi controller feature kế thừa BaseController; CurrentUserService giữ quy tắc user/role.
```

Frontend — `main.jsx` giữ state và điều hướng, page chia theo feature, màn Teacher lớn tách thành container + panel:

```
main.jsx
├── components/AppShell.jsx
├── pages/PublicPages.jsx      (Home, Catalog, Auth)
├── pages/DashboardPage.jsx
├── pages/TeacherWorkspace.jsx
│   ├── teacher/CourseEditor.jsx ──> teacher/AiDialog.jsx
│   ├── teacher/ModuleBoard.jsx
│   │   ├── teacher/ModuleList.jsx ──> teacher/LessonList.jsx
│   │   └── teacher/ModuleFormPanel.jsx
│   ├── teacher/LessonEditor.jsx
│   │   ├── teacher/LessonBodyFields.jsx
│   │   └── teacher/AiDialog.jsx
│   └── teacher/TeacherCourses.jsx
├── pages/CoursePage.jsx       (chi tiết, checkout, review, đọc bài)
├── pages/LearningPages.jsx    (ghi danh, kết quả, xem lại, hồ sơ)
├── pages/QuestionPages.jsx
│   └── teacher/QuestionAiStudio.jsx
│       ├── teacher/QuestionCriteriaPanel.jsx  (tiêu chí + nội dung bài học)
│       └── teacher/QuestionDraftList.jsx      (duyệt, sửa, lưu bản nháp)
└── pages/QuizPages.jsx
```

Quy ước: container giữ state, gọi API và validation; panel chỉ nhận props và render, nên đổi giao diện một màn không phải chạm vào handler. `teacher/shared.jsx` và `components/common.jsx` là lá dùng chung, không giữ state trang.

Các API path và payload cũ được giữ nguyên. Khi thêm chức năng mới, ưu tiên đặt logic nghiệp vụ trong service và giữ controller/component page chỉ làm nhiệm vụ điều phối.

Context kiến trúc có thể tái sử dụng giữa các phiên được quản lý bằng CodeGraph. Xem `CODEGRAPH.md`; chạy `bash scripts/codegraph-context.sh` sau khi pull hoặc refactor lớn để đồng bộ index và nhận bản đồ repository mới nhất.

## Build và kiểm thử

```bash
cd backend
mvn package
cd ../frontend
npm run build
```

`mvn package` biên dịch và đóng gói JAR; `npm run build` tạo bản frontend production trong `dist`. Trên Windows, mở terminal tại `lms` và chạy `cd backend` rồi `mvn package`, sau đó `cd ..\frontend` rồi `npm run build` (Command Prompt) hoặc giữ nguyên `cd ../frontend` (Git Bash/PowerShell).

Kiểm thử API sử dụng H2 ở chế độ MySQL, không tác động dữ liệu MySQL thật. Từ thư mục `lms`, sau khi build JAR:

```bash
set SEPAY_WEBHOOK_KEY=test-webhook-key && set SEPAY_ACCOUNT_NUMBER=123456789 && set SEPAY_BANK_CODE=MB
java -jar backend\target\lms-0.1.0.jar --spring.profiles.active=smoke
```

(Command Prompt trên Windows) hoặc:

```bash
SEPAY_WEBHOOK_KEY=test-webhook-key SEPAY_ACCOUNT_NUMBER=123456789 SEPAY_BANK_CODE=MB java -jar backend/target/lms-0.1.0.jar --spring.profiles.active=smoke
```

(Git Bash/PowerShell). `java -jar` chạy gói Java; profile `smoke` dùng database trong RAM và xóa dữ liệu khi tắt. Mở terminal thứ hai tại `lms`:

```bash
set API_BASE=http://127.0.0.1:8080/api && python scripts\regression_test.py
```

(Command Prompt trên Windows) hoặc:

```bash
API_BASE=http://127.0.0.1:8080/api python3 scripts/regression_test.py
```

(Git Bash/PowerShell). `API_BASE` chọn địa chỉ API; script kiểm tra auth/logout, quyền sở hữu, rollback dữ liệu sai, ẩn đáp án trước nộp, chấm bài, lịch sử, tiến độ, webhook và lỗi khi chưa cấu hình Gemini. Xem `TEST_REPORT.md` để biết phạm vi đã kiểm thử.

Kiểm thử riêng cho quản lý nội dung (danh sách/lọc/phân trang, quyền sở hữu, kéo thả thứ tự, cascade module, ba loại lesson, upload ảnh/tệp, validation AI và thiếu API key):

```bash
set API_BASE=http://127.0.0.1:8080/api && python scripts\content_test.py
```

(Command Prompt trên Windows) hoặc:

```bash
API_BASE=http://127.0.0.1:8080/api python3 scripts/content_test.py
```

(Git Bash/PowerShell).

Chú ý: trên Windows Command Prompt, gán biến môi trường cho lệnh python cần dùng `set VAR=value && python ...` (một dòng), không dùng `VAR=value python ...` như Linux/Git Bash.
