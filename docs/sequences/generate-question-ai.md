# UC: Generate Question with AI — design-level sequence

Đối chiếu mã nguồn ngày 13/11/2026. UC gồm mở studio, chuẩn bị ngữ cảnh, sinh bản nháp, duyệt và lưu các câu được chọn. Giáo viên đã đăng nhập; backend vẫn kiểm tra session và vai trò tại mỗi request.

Luồng generate đã đổi để **QuestionController gọi trực tiếp GeminiProxy.generateText(...)**. Controller dùng `QuestionGenerationService.prepare(...)` trước lời gọi proxy và `parseDrafts(...)` sau khi có kết quả. `QuestionService` tiếp tục xử lý lưu/CRUD và tải lại ngân hàng; không nằm giữa controller và proxy ở request generate này.

Nguồn PlantUML: [generate-question-ai.puml](generate-question-ai.puml). File chứa các diagram riêng cho màn hình, xác thực, context, generate, transport Gemini và lưu. Diagram `question_ai_04_generate` thể hiện controller gọi trực tiếp proxy, vòng retry rỗng và nhánh lỗi. Diagram `question_ai_05_gemini` mô tả một lần gọi proxy cùng cơ chế thử model. Có thể dùng các khối `ref` để ghép chúng thành một sơ đồ lớn.

## Sơ đồ tổng quan sau khi đổi controller gọi trực tiếp proxy

Sơ đồ dưới đây mô tả luồng thành công, từ nhập yêu cầu đến duyệt/lưu. `QuestionGenerationService` được controller gọi riêng trước/sau lời gọi proxy. Xác thực, lấy context từ lesson, lỗi và retry được triển khai chi tiết ở các phần tiếp theo và trong PlantUML.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher
    participant UI as QuestionAiStudio
    participant C as QuestionController
    participant Gen as QuestionGenerationService
    participant Proxy as GeminiProxy
    participant Api as GeminiApi
    participant Google as Google Gemini
    participant S as QuestionService

    Teacher->>UI: Nhập tiêu chí/context và bấm Tạo bản nháp
    UI->>UI: requestGenerate() → runGenerate() → validate()
    Note over UI,C: api.js gửi session cookie và CSRF token
    UI->>C: POST /api/questions/generate — generate(request, session)
    C->>C: teacher(session)
    C->>Gen: prepare(request, teacher)
    Gen->>Gen: Kiểm tra context/quyền sở hữu và tạo prompt
    Gen-->>C: prepared:PreparedGeneration

    C->>Proxy: generateText(prepared.prompt(), prepared.maxOutputTokens())
    Note over C,Proxy: Controller chỉ retry EmptyAnswerException, tối đa 3 lần
    Proxy->>Api: configured()
    Api-->>Proxy: true
    Proxy->>Api: post(prompt, maxOutputTokens)
    Api->>Google: POST /models/{candidate}:generateContent
    Note over Api,Google: Thử model dự phòng trong GeminiApi khi phù hợp
    Google-->>Api: Gemini JSON response
    Api-->>Proxy: raw:Map
    Proxy->>Api: extractText(raw)
    Api-->>Proxy: rawText
    Proxy-->>C: rawText

    C->>Gen: parseDrafts(prepared, rawText)
    Gen->>Gen: Parse JSON và validateDrafts(...)
    Gen-->>C: drafts:List of Map
    C-->>UI: HTTP 200 — drafts
    UI->>UI: setDrafts(drafts), setSelected([])
    UI-->>Teacher: Hiển thị câu hỏi, đáp án, giải thích và trích dẫn
    Note over UI,S: Bản nháp chưa được lưu vào ngân hàng câu hỏi

    opt Giáo viên chọn và xác nhận lưu một số câu
        Teacher->>UI: Sửa/chọn câu rồi bấm Thêm N câu đã chọn
        UI->>UI: saveSelected()
        UI->>C: POST /api/questions/bulk — addQuestions(inputs, session)
        C->>C: teacher(session)
        C->>S: createAll(teacher, inputs)
        loop Mỗi câu đã chọn trong cùng transaction
            S->>S: create(teacher, input)
            Note right of S: SupportService validate và tìm/tạo bank; repository lưu Question/Answer
        end
        S-->>C: savedQuestions, transaction commit thành công
        C-->>UI: HTTP 200 — savedQuestions
        UI->>UI: Giữ draft chưa lưu, bỏ lựa chọn và gọi onSaved()
        Note over UI,C: Callback onSaved() của App tải lại GET /api/questions
        UI->>C: GET /api/questions — myQuestions(session)
        C->>S: list(teacher)
        S-->>C: questionViews
        C-->>UI: HTTP 200 — danh sách cập nhật về App
    end
```

`QuestionAiStudio` chứa `QuestionCriteriaPanel` và `QuestionDraftList`; sơ đồ tổng quan gộp hai panel vào UI. Request thực tế đi qua module `api.js`. Phần callback tải lại được gộp ở lifeline FE để sơ đồ ngắn; diagram mở màn hình/lưu trong PlantUML thể hiện riêng `App`, module HTTP và các panel.

Nhánh lưu vẫn là `QuestionController → QuestionService → SupportService/repositories`. Với nhánh generate, controller gọi `prepare(...)`, trực tiếp gọi `GeminiProxy.generateText(...)`, rồi gọi `parseDrafts(...)`; không gọi `QuestionService.generate(...)` ở giữa.

## 1. Quy ước và lifeline

- Message dạng `method(parameters)` dùng tên hàm thực tế trong mã. Các dòng ghi `[render]`, `[UI]`, `[HTTP]`, `[inline]` hoặc `[return]` là mô tả tương tác/đoạn xử lý, không phải tên method mới cần tạo.
- FE là React function component. Có thể dùng stereotype `<<boundary>>` cho màn hình; `api.js` là module gọi HTTP.
- Đối tượng truyền dữ liệu (`QuestionGenerationRequest`, `QuestionRequest`, `AnswerRequest`) là tham số/return value; không cần biến chúng thành các lifeline xử lý.
- Spring MVC bind JSON thành DTO; JPA/Spring Data thực thi repository. Diagram dừng ở repository và có thể chú thích DB, không cần tự thêm class DAO khác.
- `App`, `GenerateQuestionPage`, hai panel con có thể gom vào note của lifeline `questionAIUI:QuestionAiStudio` ở sơ đồ tổng. Các diagram chi tiết vẫn dùng tên component thật.

| Nhóm | Lifeline / thành phần | Trách nhiệm |
| --- | --- | --- |
| Actor | `Teacher` | Nhập yêu cầu, duyệt, chọn, xác nhận lưu/hủy |
| FE | `app:App` (`main.jsx`) | Điều hướng và callback tải lại câu hỏi |
| FE | `questionBankUI:QuestionsPage` | Màn ngân hàng, nút Tạo bằng AI |
| FE | `generatePage:GenerateQuestionPage` | Render studio, nối callback `onSaved`/`onCancel` |
| FE | `questionAIUI:QuestionAiStudio` | State, validation FE, generate, sửa/chọn/lưu/hủy |
| FE | `criteria:QuestionCriteriaPanel` | Form tiêu chí và context; gọi callback `onGenerate` |
| FE | `draftList:QuestionDraftList` | Hiển thị, sửa/chọn bản nháp; gọi callback `onSave` |
| HTTP client | `apiClient:api.js` | `api()`, `post()`, CSRF, session cookie, parse lỗi |
| Controller | `questionController:QuestionController` | `generate()`, `addQuestions()`, `myQuestions()` |
| Service | `questionService:QuestionService` | `createAll()`, `create()`, `list()` cho lưu/CRUD/reload |
| Service | `generation:QuestionGenerationService` | `prepare()` kiểm tra context/tạo prompt; `parseDrafts()` kiểm tra kết quả |
| Integration | `geminiProxy:GeminiProxy` | `generateText()`, kiểm tra cấu hình và ánh xạ lỗi |
| Integration | `geminiApi:GeminiApi` | `post()`, `send()`, `executeSend()`, model dự phòng |
| External | `Google Gemini` | HTTP `models/{model}:generateContent` |
| Service | `support:SupportService` | Validate câu được lưu, tìm/tạo QuestionBank |
| Repository | `bankRepository:QuestionBankRepository` | `findAll()`, `save(bank)` |
| Repository | `questionRepository:QuestionRepository` | `save(question)`, `findByTeacherId(teacherId)` |
| Repository | `answerRepository:AnswerRepository` | `findByQuestionId(questionId)`, `save(answer)` |
| Xác thực | `CurrentUserService`, `UserRepository` | Kiểm tra session và Teacher |
| Context | `TeacherController`, `ContentAccessService`, `CourseContentService`, `ModuleContentService`, `LessonContentService` | Đọc course/module/lesson thuộc giáo viên |
| Context repository | `CourseRepository`, `ModuleRepository`, `LessonRepository` | Đọc dữ liệu context |
| Exception advice | `GlobalExceptionHandler` | Spring MVC chuyển exception thành HTTP error |

`QuestionController` kế thừa `BaseController`. `teacher(session)` là method kế thừa; không cần vẽ một instance `BaseController` được gọi qua mạng.

## 2. Mở màn hình và chuẩn bị context

| Bước | Từ → đến | Message / kết quả |
| --- | --- | --- |
| O1 | Teacher → QuestionsPage | `[UI] Click "Tạo bằng AI"` |
| O2 | QuestionsPage → App | `setForm(...)`, `setGenerated([])`, `setPage("generate")` — callbacks được App truyền xuống |
| O3 | App → GenerateQuestionPage | `[render] GenerateQuestionPage(subject, form, setPage, reloadQuestions)` |
| O4 | GenerateQuestionPage → QuestionAiStudio | `[render] initialSubject; onSaved=reloadQuestions; onCancel=setPage("questions")` |
| O5 | QuestionAiStudio → hai panel con | `[render] QuestionCriteriaPanel(...)`, `QuestionDraftList(...)` |
| O6 | QuestionAiStudio → api.js | `api("/teacher/courses?page=0&size=50&status=ALL")` khi mount |
| O7 | api.js → TeacherController | `[HTTP] GET /api/teacher/courses?...` → `list(null, "ALL", 0, 50, session)` |
| O8 | TeacherController → chính nó/UserRepository | `teacher(session)` → đọc `uid`, `findById(uid)`, kiểm tra role Teacher |
| O9 | TeacherController → CourseContentService | `search(teacher, null, "ALL", 0, 50)` |
| O10 | CourseContentService → CourseRepository | `findAll(specification, pageable)`; lọc theo teacher |
| O11 | Backend → QuestionAiStudio | `[return] {items, page, size, total, totalPages}` → `setCourses(items)` |
| O12 | Teacher → QuestionCriteriaPanel → QuestionAiStudio | `[UI/callback] Nhập subject/topic/difficulty/quantity/language/instructions/context` → `set(key, value)` |

Các truy vấn phụ tạo summary/count của course được lược khỏi O10; không phải chỉ có một truy vấn SQL.

Nếu giáo viên tự dán context, bỏ qua C1–C9. Danh sách course ở O6 vẫn được tải khi studio mount.

| Bước | Từ → đến | Message / kết quả khi lấy context từ bài học |
| --- | --- | --- |
| C1 | CriteriaPanel → QuestionAiStudio | `onChooseCourse(courseId)` → `chooseCourse(courseId)` |
| C2 | Studio → api.js → TeacherController | `api("/teacher/courses/{id}/modules")` → `[HTTP GET]` → `modules(id, session)` |
| C3 | TeacherController → ContentAccessService | `ownedCourse(id, teacher)` → `CourseRepository.findById(id)` → kiểm tra chủ sở hữu |
| C4 | TeacherController → ModuleContentService | `moduleList(course)` → `ModuleRepository.findByCourseIdOrderByPosition(course.id)` |
| C5 | Backend → Studio | `[return] {course, modules}` → `setModules(...)`; controller cũng gọi `CourseContentService.summary(course)` |
| C6 | CriteriaPanel → Studio → TeacherController | `chooseModule(moduleId)` → `GET /api/teacher/modules/{id}/lessons` → `lessons(id, session)` |
| C7 | TeacherController → ContentAccessService | `ownedModule(id, teacher)` → `ModuleRepository.findById(id)` → `ownedCourse(module.course.id, teacher)` |
| C8 | TeacherController → LessonContentService | `lessonViews(moduleId)` → `LessonRepository.findByModuleIdOrderByPosition(moduleId)`; controller còn lấy module view qua `moduleList(...)` |
| C9 | Backend → Studio | `[return] {module, lessons}` → `setLessons(...)` |
| C10 | CriteriaPanel → Studio | `set("lessonId", lessonId)`, rồi `onUseLesson()` → `useLesson()` khi bấm Dùng nội dung bài |
| C11 | Studio → Studio/Teacher | Kiểm tra TEXT; nếu context đã có thì xác nhận thay; `set("context", lesson.content)`; điền topic từ title nếu đang trống |

`useLesson()` dùng nội dung lesson đã tải ở C9, không gọi backend thêm một lần. Video/File yêu cầu dán transcript/nội dung tài liệu; backend cũng từ chối `lessonId` không phải TEXT.

## 3. Xác thực dùng lại cho generate, bulk save và reload

| Bước | Từ → đến | Message |
| --- | --- | --- |
| A1 | QuestionController → chính nó | `teacher(session)` — method kế thừa từ BaseController |
| A2 | QuestionController → CurrentUserService | `requireTeacher(session)` |
| A3 | CurrentUserService → chính nó | `requireRole(session, "TEACHER")` → `require(session)` |
| A4 | CurrentUserService → HttpSession | `getAttribute("uid")` |
| A5 | CurrentUserService → UserRepository | `findById(uid)` nếu uid tồn tại |
| A6 | UserRepository → CurrentUserService | `[return] Optional<User>` |
| A7 | CurrentUserService → chính nó | Kiểm tra user tồn tại và role Teacher |
| A8 | CurrentUserService → QuestionController | `[return] teacher:User`; thiếu session/user → 401; sai role → 403 |

`TeacherController` ở phần lấy context tự triển khai `teacher(session)` với UserRepository, không gọi CurrentUserService.

## 4. Sinh bản nháp câu hỏi

| Bước | Từ → đến | Message |
| --- | --- | --- |
| G1 | Teacher → QuestionCriteriaPanel | `[UI] Click "Tạo bản nháp câu hỏi"` |
| G2 | CriteriaPanel → QuestionAiStudio | `onGenerate()` → `requestGenerate()` |
| G3 | Studio → Teacher / Studio | Nếu đã có drafts: hiện xác nhận tạo lại; đồng ý mới gọi `runGenerate()` |
| G4 | Studio → Studio | `runGenerate()` → `validate()`; sai thì `setErrors(...)` và dừng trước HTTP |
| G5 | Studio → api.js | `post("/questions/generate", form đã trim)` |
| G6 | api.js → AuthController | `csrfToken()` → `GET /api/auth/csrf` → `csrf(CsrfToken)`; nhận token |
| G7 | api.js → QuestionController | `POST /api/questions/generate` với JSON, `X-XSRF-TOKEN`, session cookie → `generate(request, session)` |
| G8 | QuestionController → CurrentUserService | `ref AUTH-TEACHER` (A1–A8) |
| G9 | QuestionController → QuestionGenerationService | `prepare(request:QuestionGenerationRequest, teacher)` |
| G10 | Generation → Generation | `[inline] Chuẩn hóa các trường tiêu chí/context từ request` |
| G11 | Generation → ContentAccessService | `opt [lessonId != null] ownedLesson(lessonId, teacher)` → LessonRepository.findById → CourseRepository.findById → ownership |
| G12 | Generation → Generation | `[inline] Chuẩn hóa và kiểm tra tiêu chí/context; nếu context trống và có lesson TEXT thì dùng lesson.content` |
| G13 | Generation → Generation | `prompt(subject, topic, difficulty, quantity, language, instructions, reference)` |
| G14 | Generation → QuestionController | `[return] PreparedGeneration(subject, difficulty, quantity, reference, prompt, maxOutputTokens)` |
| G15 | QuestionController → GeminiProxy | `generateText(prepared.prompt(), prepared.maxOutputTokens())`; controller chỉ retry EmptyAnswerException, tối đa 3 lần |
| G16 | GeminiProxy → GeminiApi | `configured()`; thiếu key thì trả lỗi 503 |
| G17 | GeminiProxy → GeminiApi | `post(prompt, maxOutputTokens)` |
| G18 | GeminiApi → GeminiApi | `send(candidate, prompt, maxOutputTokens)` → `executeSend(candidate, prompt, genConfig)` |
| G19 | GeminiApi → Google Gemini | `POST {baseUrl}/models/{candidate}:generateContent` với prompt và header `x-goog-api-key` |
| G20 | Google Gemini → GeminiApi | `[return] JSON response hoặc HTTP error` |
| G21 | GeminiApi → GeminiProxy | `[return] raw:Map`; chi tiết vòng model dự phòng ở mục 5 |
| G22 | GeminiProxy → GeminiApi | `extractText(raw)` — static method |
| G23 | GeminiProxy → QuestionController | `[return] rawText:String` hoặc exception |
| G24 | QuestionController → Generation → ObjectMapper / Generation | `parseDrafts(prepared, rawText)` → `readValue(json, TypeReference)` → `validateDrafts(...)` |
| G25 | Generation → Controller → api.js | `[return] List<Map<String,Object>>` → HTTP 200 JSON array |
| G26 | api.js → Studio | `[return] drafts` |
| G27 | Studio → Studio | `setDrafts(drafts)`, `setSelected([])` |
| G28 | Studio → QuestionDraftList → Teacher | `[render/UI] Hiển thị bản nháp, đáp án, giải thích và contextReference` |

Generation kiểm tra số câu đúng yêu cầu, nội dung không trống, giải thích, trích dẫn xuất hiện trong context sau khi chuẩn hóa, 2–6 đáp án và đúng một đáp án đúng. Prompt yêu cầu 4 đáp án. Các kiểm tra này không chứng minh hoàn toàn tính đúng đắn ngữ nghĩa; giáo viên vẫn phải duyệt.

G24 còn gán `subject`, `difficulty`, `questionType`, `points`, `draftId` vào draft. Chưa tạo entity Question/Answer hay ghi các repository câu hỏi ở giai đoạn này; xác thực/context vẫn có thể đọc DB.

## 5. Hai vòng retry/fallback riêng biệt

- **QuestionController:** tối đa 3 lần gọi trực tiếp `GeminiProxy.generateText()` khi nhận `EmptyAnswerException`. JSON không rỗng nhưng sai cấu trúc/trích dẫn không được retry tự động. Giới hạn dùng chung là `QuestionGenerationService.GENERATE_ATTEMPTS`.
- **GeminiApi.post():** mỗi lần gọi thử danh sách model theo thứ tự. Trả nội dung rỗng hoặc HTTP 404/408/429/5xx có thể thử model tiếp. Khi model dự phòng thành công, nó được ưu tiên cho request sau.
- **GeminiApi.send():** nếu model trả 400 trong lúc request có `thinkingConfig`, thử lại cùng model một lần sau khi bỏ trường này. Sau đó 400/401/403 không chuyển model. Lỗi kết nối/timeout dạng ResourceAccessException được ánh xạ 504 ở proxy, không phải retry rỗng.

Vì có vòng model và lần thử bỏ thinkingConfig, tối đa 3 lần ở controller không đồng nghĩa tối đa 3 HTTP request tới Google. Entry point `QuestionGenerationService.generate(...)` cũ vẫn giữ hành vi cho các caller nội bộ; endpoint HTTP hiện dùng prepare → controller gọi proxy → parseDrafts.

## 6. Duyệt và lưu các câu đã chọn

| Bước | Từ → đến | Message |
| --- | --- | --- |
| S1 | Teacher → QuestionDraftList → Studio | Sửa câu: `onUpdateDraft(index, update)` → `updateDraft(index, update)` |
| S2 | Teacher → DraftList → Studio | Chọn câu: `onSelect(index, checked)` → `selectDraft(index, checked)`; hoặc `selectAllDrafts(checked)` |
| S3 | Teacher → DraftList → Studio | Click "Thêm N câu đã chọn" → `onSave()` → `saveSelected()` |
| S4 | Studio → Studio | Nếu không chọn câu/đang lưu thì dừng; map câu đã chọn thành `List<QuestionRequest>` |
| S5 | Studio → api.js | `post("/questions/bulk", payload)`; api.js lấy CSRF như G6 |
| S6 | api.js → QuestionController | `POST /api/questions/bulk` → `addQuestions(inputs, session)` |
| S7 | Controller → CurrentUserService | `ref AUTH-TEACHER` |
| S8 | Controller → QuestionService | `createAll(teacher, inputs)`; Spring mở transaction từ annotation của service |
| S9 | QuestionService → chính nó | Kiểm tra danh sách 1–20 câu; `loop [mỗi input] create(teacher, input)` |
| S10 | QuestionService → SupportService | `validateQuestion(input)` |
| S11 | QuestionService → chính nó | `new Question`, gán teacher rồi `apply(question, input)` |
| S12 | QuestionService → SupportService | `bank(teacher, input.subject())` |
| S13 | SupportService → QuestionBankRepository | `findAll()` rồi lọc theo teacher.id và subject |
| S14 | SupportService → QuestionBankRepository | `opt [chưa có bank] save(new QuestionBank(...))` |
| S15 | SupportService → QuestionService | `[return] QuestionBank`; `apply(...)` gán bank, subject, content, difficulty, explanation |
| S16 | QuestionService → QuestionRepository | `save(question)` |
| S17 | QuestionService → chính nó | `replaceAnswers(question, input.answers())` |
| S18 | QuestionService → AnswerRepository | `findByQuestionId(question.id)`; câu mới thường trả [] nên không có đáp án cũ để delete |
| S19 | QuestionService → AnswerRepository | `loop [mỗi AnswerRequest] new Answer; save(answer)` |
| S20 | QuestionService → chính nó / AnswerRepository | `view(question)` → `findByQuestionId(question.id)` |
| S21 | QuestionService → chính nó | `[return mỗi create] {question, answers}`; tiếp tục câu kế tiếp trong loop S9 |
| S22 | QuestionService → Controller | `[return] savedQuestions`; Spring commit khi service hoàn tất thành công |
| S23 | Controller → api.js → Studio | `[return] HTTP 200 savedQuestions` |
| S24 | Studio → Studio / DraftList | Loại câu đã lưu khỏi drafts, `setSelected([])`; giữ lại các bản nháp chưa chọn; thông báo thành công |
| S25 | Studio → App | `onSaved()` callback = `reloadQuestions()` |
| S26 | App → api.js → Controller | `api("/questions")` → `GET /api/questions` → `myQuestions(session)` |
| S27 | Controller → QuestionService | Sau AUTH-TEACHER: `list(teacher)` |
| S28 | QuestionService → QuestionRepository | `findByTeacherId(teacher.id)` |
| S29 | QuestionService → AnswerRepository | `loop [mỗi câu] view(question)` → `findByQuestionId(question.id)` |
| S30 | Backend → App | `[return] questionViews` → cập nhật state `questions` |

Code validate rồi lưu **từng câu trong một transaction**, không validate toàn bộ danh sách trước rồi mới bắt đầu lưu. Nếu một câu sau bị lỗi, các ghi trước trong cùng transaction rollback; UI giữ nguyên bản nháp/selection để sửa và thử lại. Repository return không đồng nghĩa transaction đã commit.

`onSaved()` chỉ tải lại ngân hàng trong App; không tự chuyển khỏi studio sau mỗi lần lưu. Hành vi này cho phép lưu tiếp các bản nháp còn lại.

## 7. Dữ liệu message

Generate nhận `QuestionGenerationRequest(subject, topic, difficulty, quantity, questionType, instructions, language, context, lessonId)`.

Một draft trả về có `content`, `explanation`, `contextReference`, `answers[{content, correct}]` và các trường backend bổ sung `subject`, `difficulty`, `questionType`, `points`, `draftId`. Hiện không có class `QuestionGenerationResponse`; kết quả là `List<Map<String,Object>>`.

Bulk save nhận `List<QuestionRequest(subject, content, difficulty, explanation, answers)>`; mỗi answer dùng `AnswerRequest(content, correct)`. `contextReference`, `draftId` và `points` không được gửi trong payload lưu này. Các entity được tạo là `QuestionBank` (nếu cần), `Question`, `Answer`. Riêng đường lưu này chưa gán `Question.aiGenerated=true`; không nên vẽ một message gán cờ đó như hành vi đã có.

## 8. Các combined fragment cần có

| Fragment / guard | Xử lý đúng với code |
| --- | --- |
| `opt [dùng lesson có sẵn]` | C1–C11; G11 kiểm tra lại lesson/ownership ở backend |
| `alt [FE input invalid] / [valid]` | Hiện lỗi inline hoặc gửi request generate |
| `alt [backend input invalid] / [valid]` | FieldValidationException → HTTP 400; không gọi Gemini khi invalid |
| `alt [chưa đăng nhập] / [không phải Teacher]` | HTTP 401 / 403; dừng request |
| `alt [không sở hữu lesson] / [lesson không tồn tại] / [không phải TEXT]` | HTTP 403 / 404 / 400 |
| `loop [empty answer, tối đa 3 lần]` | G15; chỉ bắt EmptyAnswerException |
| `loop [các model còn lại]` | G18–G21; không lặp lại toàn bộ lưu/generate UI |
| `alt [Gemini lỗi/rỗng hết lần] / [timeout] / [thiếu key]` | HTTP 502 / 504 / 503 |
| `alt [JSON/draft không hợp lệ] / [draft hợp lệ]` | HTTP 502 hoặc trả draft cho UI; không tự retry JSON sai |
| `loop [mỗi câu đã chọn]` | S9–S21; bên trong có loop save Answer |
| `alt [save success] / [save failure]` | Commit + cập nhật UI hoặc rollback + giữ bản nháp |
| `opt [chưa có QuestionBank]` | S14 tạo bank; nếu đã có thì dùng lại |
| `alt [đồng ý tạo lại] / [tiếp tục duyệt]` | `requestGenerate()` mở xác nhận; chỉ đồng ý mới gọi `runGenerate()` |
| `alt [bỏ tất cả] / [rời trang]` | Xác nhận ở FE; `discardAll()` xóa state hoặc `leave()` gọi onCancel; không gửi DELETE tới backend |

Exception từ service/proxy truyền ngược qua Spring MVC, nơi framework chọn `GlobalExceptionHandler.fields(...)` hoặc `status(...)`. Không vẽ một lời gọi trực tiếp `QuestionGenerationService → GlobalExceptionHandler` như dependency ứng dụng. api.js chuyển lỗi HTTP thành ApiError; Studio hiển thị field errors/message.

## 9. Các mốc mã nguồn để đối chiếu

- [Mở studio và callback](../../frontend/src/pages/QuestionPages.jsx#L318), [App routing/reload](../../frontend/src/main.jsx#L697).
- [Studio: input, generate, save, cancel](../../frontend/src/teacher/QuestionAiStudio.jsx#L31), [criteria](../../frontend/src/teacher/QuestionCriteriaPanel.jsx), [draft list](../../frontend/src/teacher/QuestionDraftList.jsx).
- [HTTP/CSRF](../../frontend/src/api.js#L36), [QuestionController gọi proxy](../../backend/src/main/java/com/example/lms/controller/QuestionController.java#L94).
- [QuestionService transaction và lưu](../../backend/src/main/java/com/example/lms/service/QuestionService.java#L53), [chuẩn bị prompt](../../backend/src/main/java/com/example/lms/service/QuestionGenerationService.java#L52), [parse/validate draft](../../backend/src/main/java/com/example/lms/service/QuestionGenerationService.java#L91).
- [GeminiProxy](../../backend/src/main/java/com/example/lms/integration/GeminiProxy.java#L125), [GeminiApi](../../backend/src/main/java/com/example/lms/integration/GeminiApi.java#L73).
- [SupportService](../../backend/src/main/java/com/example/lms/service/SupportService.java#L72), [ownership](../../backend/src/main/java/com/example/lms/service/ContentAccessService.java#L37), [error advice](../../backend/src/main/java/com/example/lms/controller/GlobalExceptionHandler.java).
