# Learnova CodeGraph context

## Purpose

CodeGraph provides reusable structural context for future coding sessions: files, symbols, references, imports and reverse dependencies. Its incremental cache is stored under `.codegraph/` and intentionally excluded from Git; the durable scan policy is committed in `codegraph.config.json`.

## Current index

- CodeGraph CLI: `3.1.1`
- Files indexed after the feature split: `130`
- Analysis: native semantic
- Dependency cycles reported by orientation: `0`

The cache automatically validates freshness. Run this after pulling or making a large refactor:

```bash
codegraph sync --root .
```

## First commands for a new session

```bash
codegraph status --root .
codegraph orient --root . --budget small
codegraph explore "course payment checkout webhook" --root .
codegraph explore "teacher course module lesson editor" --root .
```

Useful targeted commands:

```bash
codegraph explain backend/src/main/java/com/example/lms/service/PaymentService.java
codegraph rdeps backend/src/main/java/com/example/lms/service/PaymentService.java --json
codegraph deps frontend/src/teacher/CourseEditor.jsx --json
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
QuestionApi ─┼─> QuestionService ─> QuestionGenerationService ─> Integrations ─> GeminiApi
QuizApi     ─┘─> QuizService (management, attempts, scoring, result snapshots)

LearningApi —> enrollment, wishlist, progress (no Teacher content dependency)
PaymentApi  —> PaymentService —> enrollment on paid order

All feature controllers extend BaseController (session, role, ownership helpers).
CurrentUserService is the single source for "who is logged in".
```

| Controller | Service(s) | Responsibility |
|---|---|---|
| `BaseController` | `CurrentUserService` | shared `me/student/teacher`, `owned*` guards, view mappers |
| `CourseApi` | `CourseContentService`, `ModuleContentService`, `LessonContentService` | catalogue, course CRUD, modules, lessons, reviews |
| `QuestionApi` | `QuestionService`, `QuestionGenerationService` | thin HTTP boundary for question bank, bulk save, AI draft and AI content |
| `QuizApi` | `QuizService` | thin HTTP boundary for quiz CRUD, attempts, scoring and results |
| `LearningApi` | enrollment/progress services | enrollments, wishlist, lesson progress |
| `TeacherApi` | content services above | `/api/teacher/**` content management + uploads |
| `PaymentApi` | `PaymentService` | SE Pay checkout, order lookup, webhook |

`GeminiApi` owns transport (HTTP, key, model, response extraction); `Integrations` owns prompts, parsing and domain error mapping, so feature services never build URLs.

### Frontend shell → pages → teacher components

```
main.jsx (state, effects, handlers, routing)
├── components/AppShell.jsx
├── pages/PublicPages.jsx        Home, Catalog, Auth
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
├── pages/CoursePage.jsx          course detail, checkout, reviews, lesson reader
├── pages/LearningPages.jsx       enrollments, results, review, profile
├── pages/QuestionPages.jsx
│   └── teacher/QuestionAiStudio.jsx
│       ├── teacher/QuestionCriteriaPanel.jsx  (criteria + lesson context)
│       └── teacher/QuestionDraftList.jsx      (review, edit, save drafts)
└── pages/QuizPages.jsx
```

Leaf modules carry no page state: `teacher/shared.jsx` (constants, `Field`, `Crumb`, formatters), `components/common.jsx` (CourseGrid, PageTitle, Empty, CopyButton) and `styles/*` only export presentational pieces. Containers keep data loading, validation and API calls; panels keep markup and callbacks, so a screen can be changed in one file without touching handlers.

## Architecture anchors from the graph

- `BaseController.java`: shared session/ownership helpers for the feature controllers.
- `QuestionService.java`, `QuizService.java`: feature business boundaries matching the logical services in `define-class.md`; Spring Data `*Repo` interfaces implement the diagram's DAO responsibilities.
- `CourseApi.java`, `QuestionApi.java`, `QuizApi.java`, `LearningApi.java`: public/authenticated API split by feature (courses, question bank, quizzes, enrollments/progress).
- `TeacherApi.java` → `CourseContentService.java`, `ModuleContentService.java`, `LessonContentService.java`: Teacher Course–Module–Lesson HTTP and business flow, sharing `ContentAccessService` and `ContentValidation`.
- `GeminiApi.java` (transport) → `Integrations.java` (prompts, parsing, error mapping).
- `PaymentApi.java` → `PaymentService.java`: SE Pay checkout, order lifecycle, reconciliation and enrollment.
- `CurrentUserService.java`: shared authenticated-user and role boundary.
- `AiContentService.java`, `QuestionGenerationService.java`: grounded generation on top of `Integrations`.
- `frontend/src/main.jsx`: application state, side effects and routing; page UI lives in `frontend/src/pages/` by feature.
- `frontend/src/teacher.jsx`: barrel export for feature components in `frontend/src/teacher/`.
- `frontend/src/style.css`: ordered style-layer imports from `frontend/src/styles/`.
- `scripts/regression_test.py`, `content_test.py`, `ui_test.py`, `ui_student_test.py`: executable behavior checks.

## Maintenance policy

- Do not commit `.codegraph/cache`; it is machine-local and regenerated incrementally.
- Commit changes to `codegraph.config.json`, `AGENTS.md`, and this document.
- Use exact task terms that appear in code when running `search` or `explore`.
- Confirm graph conclusions with source reads and the relevant compiler/test suite.
- Keep new UI work in the smallest fitting layer: container components own state, panel components stay presentational.
