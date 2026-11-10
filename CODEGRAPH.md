# Learnova CodeGraph context

## Purpose

CodeGraph provides reusable structural context for future coding sessions: files, symbols, references, imports and reverse dependencies. Its incremental cache is stored under `.codegraph/` and intentionally excluded from Git; the durable scan policy is committed in `codegraph.config.json`.

## Current index

- CodeGraph CLI: `3.1.1`
- Files indexed: `162` (backend Java + tests, frontend `src`, database SQL/migrations, scripts, root docs/config)
- Analysis: native semantic, backend `native`, 0 degraded files
- Dependency cycles reported by orientation: `0`
- Latest indexed commit: `f524aa1` (`change name copilot ai to gemini ai`)

The cache automatically validates freshness. Run this after pulling or making a large refactor:

```bash
codegraph sync --root .
```

If `status` still reports the old file count after adding files (the incremental manifest can miss new paths), rebuild once:

```bash
codegraph init --root . --force --no-update-gitignore
codegraph sync --root .
```

## First commands for a new session

```bash
codegraph status --root .
codegraph orient --root . --budget small
codegraph explore "course payment checkout webhook" --root .
codegraph explore "teacher course module lesson editor" --root .
codegraph explore "quiz ai draft feedback attempt" --root .
```

Useful targeted commands:

```bash
codegraph explain backend/src/main/java/com/example/lms/service/PaymentService.java
codegraph rdeps backend/src/main/java/com/example/lms/service/PaymentService.java --json
codegraph deps frontend/src/teacher/CourseAiStudio.jsx --json
codegraph refs frontend/src/teacher/shared.jsx
codegraph hotspots . --limit 20
codegraph review --base HEAD --head WORKTREE
```

## Dependency map after the feature split

### Backend HTTP → service → integration

```
TeacherApi ─┬─> CourseContentService ─┬─> ContentAccessService
            ├─> ModuleContentService ─┤
            └─> LessonContentService ─┴─> ContentValidation

CourseApi   ─┬─> CourseContentService / ModuleContentService / LessonContentService
             └─> CourseService (catalogue, reviews, ownership)
QuestionApi ─> QuestionService ─> QuestionGenerationService ─> Integrations ─> GeminiApi
QuizApi     ─> QuizService (management, attempts, scoring, result snapshots)
QuizAiApi   ─> QuizAiService ─> Integrations + QuestionService + QuizService
QuizFeedbackApi ─> QuizFeedbackService ─> Integrations + QuizService (stored aiFeedback)
LearningApi ─> EnrollmentService, wishlist, progress (no Teacher content dependency)
PaymentApi  ─> PaymentService ─> PayOSClient (SE Pay checkout/webhook) + enrollment on paid order
AuthApi / FilesApi / Errors: auth, uploads/downloads, error mapping

All feature controllers extend BaseController (session, role, ownership helpers).
CurrentUserService is the single source for "who is logged in"; SupportService holds shared validation/text helpers.
```

| Controller | Service(s) | Responsibility |
|---|---|---|
| `BaseController` | `CurrentUserService` | shared `me/student/teacher`, `owned*` guards, view mappers |
| `CourseApi` | `CourseContentService`, `ModuleContentService`, `LessonContentService`, `CourseService` | catalogue, course CRUD, modules, lessons, reviews |
| `QuestionApi` | `QuestionService`, `QuestionGenerationService` | thin HTTP boundary for question bank, bulk save and AI drafts |
| `QuizApi` | `QuizService` | thin HTTP boundary for quiz CRUD, attempts, scoring and results |
| `QuizAiApi` | `QuizAiService` | AI quiz drafts and saving an approved AI quiz |
| `QuizFeedbackApi` | `QuizFeedbackService` | AI analysis of a submitted attempt, cached per result |
| `LearningApi` | `EnrollmentService`, progress services | enrollments, wishlist, lesson progress |
| `TeacherApi` | content services above, `StorageService` | `/api/teacher/**` content management + uploads |
| `PaymentApi` | `PaymentService` | SE Pay checkout, order lookup, webhook |
| `AuthApi` | `CurrentUserService` | email/password, Google login, profile |
| `FilesApi` | `StorageService` | served uploads for signed-in users |

`GeminiApi` owns transport (HTTP, key, model fallback list, response extraction); `Integrations` owns prompts, parsing and domain error mapping, so feature services never build URLs. `GeminiApi.post` tries the primary model then each `GEMINI_FALLBACK_MODELS` entry when a model is unknown, rate limited, fails with 4xx/5xx worth retrying, or answers empty; auth/bad-request errors fail fast. `Integrations.generateText` raises `EmptyAnswerException` on an empty answer, and `QuestionGenerationService` alone retries that case (3 attempts) while non-empty drafts that fail context checks are never retried.

### Frontend shell → pages → teacher components

```
main.jsx (state, effects, handlers, routing)
├── components/AppShell.jsx
├── pages/PublicPages.jsx        Home, Catalog, Auth
├── pages/DashboardPage.jsx
├── pages/TeacherWorkspace.jsx
│   ├── teacher/CourseAiStudio.jsx ──> teacher/CourseFormFields.jsx
│   ├── teacher/CourseEditor.jsx ──> teacher/AiDialog.jsx ──> teacher/AiDialogContent.jsx
│   ├── teacher/ModuleBoard.jsx
│   │   ├── teacher/CurriculumAiModal.jsx
│   │   ├── teacher/LessonBatchAiModal.jsx
│   │   ├── teacher/ModuleList.jsx ──> teacher/LessonList.jsx
│   │   └── teacher/ModuleFormPanel.jsx
│   ├── teacher/LessonEditor.jsx
│   │   ├── teacher/LessonBodyFields.jsx
│   │   └── teacher/AiDialog.jsx
│   └── teacher/TeacherCourses.jsx
├── pages/CoursePage.jsx          course detail, checkout, reviews, lesson reader
├── pages/LearningPages.jsx       enrollments, results, review, profile
├── pages/QuestionPages.jsx
│   └── teacher/QuestionAiStudio.jsx
│       ├── teacher/QuestionCriteriaPanel.jsx  (criteria + lesson context)
│       └── teacher/QuestionDraftList.jsx      (select all, review, edit, save drafts)
└── pages/QuizPages.jsx
```

Leaf modules carry no page state: `teacher/shared.jsx` (constants, `Field`, `Crumb`, formatters), `components/common.jsx` (CourseGrid, PageTitle, Empty, CopyButton) and `styles/*` only export presentational pieces. Containers keep data loading, validation and API calls; panels keep markup and callbacks, so a screen can be changed in one file without touching handlers.

## Architecture anchors from the graph

- `BaseController.java`: shared session/ownership helpers for the feature controllers.
- `QuestionService.java`, `QuizService.java`, `QuizAiService.java`, `QuizFeedbackService.java`: question/quiz feature boundaries; Spring Data `*Repo` interfaces implement the diagram's DAO responsibilities.
- `CourseApi.java`, `QuestionApi.java`, `QuizApi.java`, `LearningApi.java`: public/authenticated API split by feature (courses, question bank, quizzes, enrollments/progress).
- `QuestionGenerationService.java`: grounded question drafts for the AI studio; one retry budget for empty Gemini answers (`GENERATE_ATTEMPTS = 3`), no retry when the answer is non-empty but lacks context support.
- `TeacherApi.java` → `CourseContentService.java`, `ModuleContentService.java`, `LessonContentService.java`: Teacher Course–Module–Lesson HTTP and business flow, sharing `ContentAccessService` and `ContentValidation`.
- `GeminiApi.java` (transport) → `Integrations.java` (prompts, parsing, error mapping).
- `PaymentApi.java` → `PaymentService.java` → `PayOSClient.java`: SE Pay checkout, order lifecycle, reconciliation and enrollment; `EnrollmentService.java` owns enrollment rules for `LearningApi`.
- `CurrentUserService.java`: shared authenticated-user and role boundary.
- `SupportService.java`: shared text/validation helpers (top fan-out in the graph).
- `AiContentService.java`, `QuestionGenerationService.java`: grounded generation on top of `Integrations`.
- `frontend/src/main.jsx`: application state, side effects and routing; page UI lives in `frontend/src/pages/` by feature.
- `frontend/src/teacher.jsx`: barrel export for feature components in `frontend/src/teacher/`.
- `frontend/src/style.css`: ordered style-layer imports from `frontend/src/styles/`.
- `scripts/regression_test.py`, `content_test.py`, `ui_test.py`, `ui_student_test.py`, `ai_test.py`, `smoke_test.py`: executable behavior checks.
- Tests: `backend/src/test/java/.../controller` (`QuizLiveAnswerTest`, `QuizAiApiTest`) and `service` (`QuizAiServiceTest`, `QuizAnswerCheckTest`, `QuizFeedbackServiceTest`).
- Migrations: `2026-10-30_course_content.sql`, `2026-10-31_sepay_reviews.sql`, `2026-11-08_quiz_ai_feedback.sql`.

## Maintenance policy

- Do not commit `.codegraph/cache`; it is machine-local and regenerated incrementally.
- Commit changes to `codegraph.config.json`, `AGENTS.md`, and this document.
- Use exact task terms that appear in code when running `search` or `explore`.
- Confirm graph conclusions with source reads and the relevant compiler/test suite.
- Keep new UI work in the smallest fitting layer: container components own state, panel components stay presentational.
- Update the file count and anchors above after a large refactor or a forced re-index.
