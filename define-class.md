# PROMPT: IMPLEMENT COMPLETE LMS BACKEND BASED ON CLASS DIAGRAMS

## 1. Project Overview

You are a Senior Java Spring Boot Developer and Software Architect.

Your task is to analyze, complete, refactor, and implement the backend of an existing Learning Management System (LMS) based on the five provided UML Class Diagrams.

The LMS is a reduced-scope university project consisting of five major functional modules:

1. Manage Courses
2. Login System (Email/Password and Google)
3. Manage Question Bank with Gemini AI
4. Enroll Course with Payment using PayOS
5. Create and Take Practice Quiz

**Technology stack:**

- Backend: Java 17, Spring Boot 3.x
- Security: Spring Security, JWT, BCrypt, Google OAuth 2.0
- Database: MySQL 8.x
- ORM: Spring Data JPA, Hibernate
- Database migration: Flyway, if already configured
- Validation: Jakarta Bean Validation
- Frontend: React + TypeScript, existing separate project
- AI integration: Google Gemini API
- Payment integration: PayOS VietQR
- API architecture: RESTful APIs with JSON

This is an existing project. Do not rebuild it from scratch unless strictly necessary.

## 2. Mandatory Instructions

Before implementing any code:

1. Inspect the entire existing backend project structure.
2. Read `pom.xml`, `application.properties` or `application.yml`, environment configuration, security configuration, database entities, repositories, services, controllers, and DTOs.
3. Identify which classes already exist and which classes are missing.
4. Compare the current source code against the provided Class Diagrams.
5. Reuse existing entities, relationships, DTOs, services, and database tables whenever possible.
6. Do not create duplicate entities or duplicate implementations of the same business feature.
7. Preserve the existing authentication, JWT, Google OAuth, and database configuration where they already work.
8. Preserve existing working APIs unless a change is required to correct a bug.
9. Do not remove existing functionality outside the specified scope.
10. Implement actual business logic, not empty classes, placeholders, or hardcoded responses.

Use Spring Boot dependency injection through constructors.

Prefer clear interfaces and concrete service implementations when appropriate.

Use JPA repositories instead of manually creating unnecessary DAO implementations. However, preserve the required class names from the diagrams wherever reasonable.

Do not introduce a separate `Subject` entity unless the existing database genuinely requires it. Question subjects may be represented using the existing string/category field.

The UML diagrams represent logical class responsibilities, not a requirement to reproduce outdated framework patterns literally.

## 3. Shared Architecture

Follow this logical structure:

```text
backend/
└── src/main/java/.../
    ├── config/
    ├── security/
    │   ├── RequestFilter
    │   └── JwtService
    ├── controller/
    │   ├── BaseController
    │   ├── ContentController
    │   ├── AuthController
    │   ├── QuestionController
    │   ├── EnrollmentController
    │   └── QuizController
    ├── service/
    │   ├── AuthService
    │   ├── QuestionService
    │   ├── EnrollmentService
    │   ├── PaymentService
    │   ├── QuizService
    │   └── GeminiService
    ├── repository/
    ├── entity/
    ├── dto/
    │   ├── request/
    │   └── response/
    ├── integration/
    │   ├── GeminiProxy
    │   ├── GeminiApi
    │   ├── GoogleOAuthClient
    │   ├── PayOSClient
    │   └── GeminiAIAdapter
    ├── mapper/
    ├── exception/
    └── util/
```

If an existing project uses a different but consistent package structure, maintain that structure instead of moving all classes unnecessarily.

### Shared base classes

**BaseController**

- Provides shared controller utilities where genuinely useful.
- Do not put authentication or business logic directly inside it.

**BaseDAO**

- Represents shared data-access responsibilities from the diagrams.
- Prefer `JpaRepository<T, ID>` and reusable specifications.
- Do not create a custom base DAO if it duplicates Spring Data JPA functionality.

**BaseBean**

- Represents common persistent-entity characteristics from the diagrams.
- Implement as `@MappedSuperclass` only if the existing entities benefit from it.
- May include createdAt and updatedAt.
- Preserve existing primary-key strategies.
- Do not force all entities to inherit from it unnecessarily.

Use consistent naming across controllers, services, repositories, entities, and DTOs.

## 4. Module 1 — Manage Courses

Implement the classes corresponding to Class Diagram 1.

**Diagram classes:**

- ContentController
- BaseController
- CourseDao
- LessonDao
- GeminiService
- UserDao
- RequestFilter
- CourseBean
- LessonBean
- UserBean
- BaseDao
- BaseBean

Use existing `Course`, `Lesson`, and `User` entities if they already exist, rather than creating duplicates named `CourseBean`, `LessonBean`, and `UserBean`.

### Teacher functional requirements

**Course List**

- View teacher-owned courses.
- Search by course title, maximum 100 characters.
- Filter by Draft, Published, or All.
- Pagination with default page size 10.
- Retrieve module count and lesson count.
- Display price, status, and last updated date.
- Enforce teacher ownership for updates and deletion.

**Create Course**

- Create a course with title, description, category, price, and appropriate additional fields from the existing schema.
- New courses default to Draft.
- Validate title length and nonnegative price.
- Associate the course with the authenticated Teacher.

**Update Course**

- Update course information.
- Prevent unauthorized modification.
- Maintain existing module and lesson relationships.

**Delete Course**

- Validate teacher ownership.
- Check whether the course has enrolled students or related orders.
- Prevent unsafe deletion of historical enrollment/payment data.
- Prefer appropriate archival or soft-delete behavior where needed.

**Course Structure**

- Create, update, delete, and reorder chapters/modules.
- Create, update, delete, and reorder lessons.
- Maintain Course → Chapter → Lesson relationships.

**Publish Course**

- Validate required course information and content.
- Change Draft to Published.
- Prevent publishing incomplete courses.

**Generate Course with AI**

- Allow teachers to provide course title, topic, learning objectives, level, and additional context.
- Call Gemini to suggest a course outline, chapters, and lessons.
- Validate AI responses.
- Return the generated course structure for teacher preview.
- Allow the teacher to accept or edit the proposed structure.
- Persist only after explicit confirmation.
- Do not automatically publish AI-generated content.

### Required responsibilities

`ContentController`

- Exposes course, chapter, lesson, and AI course-generation endpoints.

`CourseDao`

- Handles JPA persistence and teacher-specific course queries.

`LessonDao`

- Handles lesson persistence and chapter/course relationships.

`GeminiService`

- Coordinates AI-assisted course generation.

`UserDao`

- Retrieves the authenticated teacher and validates ownership-related information.

`RequestFilter`

- Handles JWT authentication through Spring Security.

Preserve the existing class naming conventions when implementing these responsibilities.

## 5. Module 2 — Login System

Implement the classes corresponding to Class Diagram 2.

**Diagram classes:**

- LoginUI (React frontend)
- AuthController
- AuthService
- UserRepository
- GoogleOAuthClient
- User
- Role

### Authentication functions

Implement:

1. Register with email and password.
2. Login with email and password.
3. Login with Google.
4. Register an account using Google.
5. Refresh access token.
6. Logout.
7. Get authenticated user profile.
8. Assign and validate user roles.

### User entity

Use the existing schema wherever possible.

Required logical fields:

- id
- fullName
- email
- passwordHash (nullable for Google-only accounts)
- googleId or OAuth provider identity
- status
- role or existing role relationship
- createdAt
- updatedAt

If the existing project supports multiple roles per user, preserve that design.

### Roles

Supported roles:

- GUEST: unauthenticated access, not necessarily a stored database role
- STUDENT
- TEACHER
- ADMIN

**Role-based access:**

- Guest: browse public courses, view course details, register, and log in.
- Student: enroll in courses, make payments, access enrolled content, and take quizzes.
- Teacher: manage their own courses, questions, and quizzes.
- Admin: manage users and perform administrative operations.

Do not allow users to register themselves directly as ADMIN.

### Google authentication

Implement Google OAuth 2.0 using the existing configuration.

Required behavior:

- Verify Google's identity tokens or perform the configured OAuth authorization-code flow securely.
- Find existing users by their trusted Google identity or verified email, following a secure linking policy.
- Create a new user if no matching identity exists.
- Assign STUDENT by default to public registrations.
- Return the LMS authentication result.
- Avoid duplicate user accounts.

### Teacher account creation using Google

Implement an authorized Teacher provisioning workflow.

An ADMIN may approve or create a Teacher account associated with a Google identity.

Do not allow arbitrary users to claim the TEACHER role through a public request parameter.

If teacher self-registration is supported by the existing project, introduce an approval process instead of granting the role automatically.

### JWT and logout

- Generate and validate access tokens.
- Support refresh tokens according to the existing authentication design.
- Revoke refresh sessions during logout.
- Ensure logout works for an authenticated user.
- Investigate and fix existing `403 Forbidden` issues on `/api/auth/logout`.
- Check Spring Security request matchers, bearer-token processing, CSRF configuration, CORS, and authentication rules.
- Do not disable security globally to make logout work.

### API access

Ensure frontend requests receive meaningful `401 Unauthorized` or `403 Forbidden` responses.

Never expose password hashes, OAuth secrets, or refresh-token hashes in API responses.

## 6. Module 3 — Manage Question Bank

Implement the classes corresponding to Class Diagram 3.

**Diagram classes:**

- BaseController
- QuestionController
- QuestionService
- GeminiProxy
- QuestionDao
- QuestionUtils
- GeminiApi
- BaseDao
- QuestionBean
- QuestionOptionBean
- BaseBean

Reuse the existing `Question` and `Answer`/`QuestionOption` entities where applicable.

### Question List

Teachers can:

- View their question bank.
- Search for questions.
- Filter by subject.
- Filter by question type.
- Filter by difficulty.
- Paginate questions.
- View question details.
- Create questions.
- Update questions.
- Delete questions.

Display the selected subject as the page title or contextual heading in the frontend.

No separate `Subject` entity is required.

### Question types

Support:

- MULTIPLE_CHOICE
- TRUE_FALSE
- ESSAY

### Question fields

- id
- content: rich text, maximum 5,000 characters
- subject: required
- type: required
- difficulty: EASY, MEDIUM, HARD
- points: decimal, minimum 0.1, maximum 100
- explanation
- ownerId
- timestamps

Multiple-choice questions must support answer options.

Each answer option contains:

- id
- questionId
- content
- isCorrect
- orderIndex

### Question validation

For multiple-choice questions:

- Require at least two options.
- Require at least one correct option.
- Enforce the configured single-answer or multiple-answer policy.

For true/false questions:

- Validate the correct Boolean answer.

For essay questions:

- Do not require fixed answer options.
- Allow reference answers and evaluation criteria when supported.

### AI Question Generation

The Teacher supplies:

- Topic
- Subject
- Question type
- Difficulty
- Quantity
- Lesson context or teaching material
- Learning objectives or keywords

Implement this workflow:

1. Validate input.
2. Construct a structured Gemini prompt.
3. Call Gemini through GeminiProxy.
4. Parse Gemini responses.
5. Validate question content, options, explanations, and answer correctness.
6. Retry or report invalid AI output according to configured limits.
7. Return generated questions for preview.
8. Allow the Teacher to select, edit, accept, or partially accept questions.
9. Save only explicitly approved questions.
10. Associate saved questions with the correct Teacher and existing Question Bank structure.

### Class responsibilities

`QuestionController`

- Exposes question-management and AI-generation endpoints.

`QuestionService`

- Contains business logic and validation.

`QuestionDao`

- Performs persistence and question filtering.

`QuestionUtils`

- Provides reusable question validation and normalization.

`GeminiProxy`

- Acts as the internal abstraction for Gemini requests.

`GeminiApi`

- Performs actual external Gemini API communication.

`QuestionBean`

- Represents question persistence state.

`QuestionOptionBean`

- Represents answer choices.

Avoid duplicate external API implementations if the project already has a reusable Gemini client.

## 7. Module 4 — Enroll Course with Payment

Implement Class Diagram 4.

**Diagram classes:**

- BaseController
- EnrollmentController
- EnrollmentService
- PaymentService
- EnrollmentDao
- PaymentDao
- PayOSClient
- EnrollmentBean
- CourseBean
- PaymentBean
- BaseDao
- BaseBean

### Enrollment requirements

Students must be able to:

1. View public course details.
2. Check whether they are already enrolled.
3. Enroll in free courses.
4. Start checkout for paid courses.
5. Pay using PayOS VietQR.
6. View payment status.
7. Access the course after successful enrollment.

### Free courses

For price = 0:

- Create enrollment without payment.
- Prevent duplicate active enrollments.
- Grant access immediately.

### Paid courses

For price greater than 0:

1. Verify authenticated Student.
2. Verify course is Published.
3. Check existing enrollment.
4. Create a pending payment/order record.
5. Generate a PayOS checkout/payment link.
6. Return checkout information.
7. Show the payment amount and order code.
8. Support a 15-minute payment session if supported by the checkout configuration.
9. Receive PayOS webhook notifications.
10. Validate the webhook signature and payment reference.
11. Confirm the amount and currency.
12. Mark successful payment as PAID.
13. Create or activate the enrollment.
14. Return payment confirmation.

### Critical payment rules

- Do not mark a payment as successful based only on frontend polling.
- Do not trust an arbitrary client-submitted amount.
- Use the stored order amount for payment verification.
- Validate all payment webhook signatures.
- Handle duplicate webhook deliveries idempotently.
- Prevent duplicated enrollments.
- Ensure payment status updates and enrollment creation are transactionally consistent.
- Do not delete payment history when a course is removed.
- Keep payment-provider secrets server-side only.

### Payment statuses

Use existing statuses where available or map to:

- PENDING
- PAID
- FAILED
- CANCELLED
- EXPIRED

### Class responsibilities

`EnrollmentController`

- Handles enrollment and checkout APIs.

`EnrollmentService`

- Implements enrollment rules, duplicate prevention, and course-access decisions.

`PaymentService`

- Creates payments, verifies callbacks, and manages payment states.

`EnrollmentDao`

- Persists enrollment records.

`PaymentDao`

- Persists payment records.

`PayOSClient`

- Encapsulates communication with PayOS APIs.

`EnrollmentBean`

- Represents student-to-course enrollment.

`PaymentBean`

- Represents payment transactions.

Use a separate payment webhook endpoint if appropriate.

## 8. Module 5 — Create and Take Practice Quiz

Implement Class Diagram 5.

**Diagram classes:**

- BaseController
- QuizController
- QuizService
- GeminiAIAdapter
- QuizDao
- BaseDao
- QuizAttemptBean
- QuestionBean
- BaseBean

Add other classes required for fully working functionality, such as Quiz, QuizQuestion, QuizResult, and QuizAnswer.

### Teacher — Quiz Management

Teachers can:

- View all quizzes they own.
- Search quizzes by title (maximum 100 characters).
- Filter by Draft, Published, or All.
- Paginate quiz results.
- Create quizzes.
- Update quizzes.
- Delete quizzes.
- Publish quizzes.
- Add questions from the existing Question Bank.
- Remove questions from quizzes.
- Change question order and score allocation.
- Configure a time limit.
- Enable or disable AI evaluation.

### Quiz fields

- id
- title
- courseId
- teacherId or ownership derived securely from course
- description
- timeLimitMinutes
- aiEvaluationEnabled
- status
- createdAt
- updatedAt

### Quiz–Question relationship

A Quiz contains multiple Questions.

A Question may belong to multiple Quizzes.

Use an explicit many-to-many mapping entity:

`QuizQuestion`

- quizId
- questionId
- orderIndex
- points

Do not use a simple direct many-to-many relationship if it would lose orderIndex or points.

### Student — Take Practice Quiz

Students can:

1. View quizzes accessible through enrolled courses.
2. Start a quiz attempt.
3. Retrieve questions for the attempt.
4. Submit answers.
5. Receive a result.
6. View scores and appropriate explanations.
7. Review previous attempts if supported.

### Attempt lifecycle

- IN_PROGRESS
- SUBMITTED
- GRADED
- EXPIRED

Store:

- attemptId
- studentId
- quizId
- startedAt
- submittedAt
- status
- score

Store each submitted answer:

- attemptId
- questionId
- selected options or text answer
- awarded points
- evaluation feedback
- correctness when determinable

### Quiz evaluation

**Multiple Choice**

- Evaluate against correct options.

**True/False**

- Evaluate against the stored correct answer.

**Essay**

- If AI evaluation is disabled, support manual grading or an explicitly ungraded state.
- If AI evaluation is enabled, use GeminiAIAdapter and a scoring rubric.
- Validate and constrain AI-generated scores.
- Store AI feedback.
- Permit teacher review or overrides when necessary.

Never expose correct answers in student-facing quiz-start responses before submission.

Use server-side time enforcement for timed quizzes.

Prevent submission modification after an attempt is finalized.

### Quiz access

- Teachers manage only their authorized quizzes.
- Students take quizzes only for enrolled or otherwise explicitly accessible courses.
- Guests cannot submit quiz attempts.
- Admin access follows the existing security design.

### Class responsibilities

`QuizController`

- Exposes quiz creation, management, attempt, and result endpoints.

`QuizService`

- Handles quiz business logic and grading orchestration.

`QuizDao`

- Persists and queries quizzes and related data.

`GeminiAIAdapter`

- Converts essay-grading requests into Gemini API requests and validates responses.

`QuizAttemptBean`

- Represents quiz-taking attempts.

`QuestionBean`

- Reuses the Question Bank entity.

## 9. Database Relationships

Review the existing database and ensure the following logical relationships are supported.

| Relationship              | Cardinality |
| ------------------------- | ----------- |
| Teacher → Course          | 1:N         |
| Course → Chapter          | 1:N         |
| Chapter → Lesson          | 1:N         |
| Teacher → Question        | 1:N         |
| Question → QuestionOption | 1:N         |
| Course → Quiz             | 1:N         |
| Quiz → QuizQuestion       | 1:N         |
| Question → QuizQuestion   | 1:N         |
| Student → Enrollment      | 1:N         |
| Course → Enrollment       | 1:N         |
| Student → Payment/Order   | 1:N         |
| Quiz → QuizAttempt        | 1:N         |
| Student → QuizAttempt     | 1:N         |
| QuizAttempt → QuizAnswer  | 1:N         |

Use database constraints for integrity.

Apply suitable foreign keys, indexes, unique constraints, and transactional boundaries.

Preserve the actual existing ERD when it already supports these requirements.

Use migration scripts for schema changes instead of dropping and recreating the database.

## 10. REST API Requirements

Inspect existing endpoints and reuse their names where practical.

The following paths are illustrative; do not create redundant endpoints if equivalent APIs already exist.

**Authentication**

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

**Courses**

- `GET /api/courses`
- `GET /api/courses/{id}`
- `POST /api/teacher/courses`
- `PUT /api/teacher/courses/{id}`
- `DELETE /api/teacher/courses/{id}`
- `POST /api/teacher/courses/{id}/publish`
- `POST /api/teacher/courses/generate-ai`

**Question Bank**

- `GET /api/teacher/questions`
- `POST /api/teacher/questions`
- `PUT /api/teacher/questions/{id}`
- `DELETE /api/teacher/questions/{id}`
- `POST /api/teacher/questions/generate-ai`
- `POST /api/teacher/questions/import-generated`

**Enrollment and Payment**

- `POST /api/enrollments`
- `GET /api/enrollments/me`
- `POST /api/payments/checkout`
- `GET /api/payments/{id}/status`
- `POST /api/payments/payos/webhook`

**Quiz**

- `GET /api/teacher/quizzes`
- `POST /api/teacher/quizzes`
- `PUT /api/teacher/quizzes/{id}`
- `DELETE /api/teacher/quizzes/{id}`
- `POST /api/teacher/quizzes/{id}/publish`
- `POST /api/quizzes/{id}/attempts`
- `POST /api/quiz-attempts/{id}/submit`
- `GET /api/quiz-attempts/{id}/result`

Apply correct HTTP methods, validation, authentication, and role-based authorization.

## 11. Error Handling and Security

Implement centralized exception handling using `@RestControllerAdvice`.

Return consistent errors for:

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity where appropriate
- 500 Internal Server Error
- 502/503 for relevant external integration failures

Include meaningful error messages without exposing stack traces or secrets.

Use DTOs instead of exposing JPA entities directly.

Validate request data with Jakarta Validation.

Apply method-level authorization where appropriate using `@PreAuthorize`.

Protect against IDOR by checking ownership and enrollment on the backend, not only checking roles.

External API integrations must use configured timeouts and handle failures safely.

Use environment variables for:

- Database credentials
- JWT secrets
- Google OAuth credentials
- Gemini API keys
- PayOS credentials

Never hardcode production credentials.

## 12. Integration with Existing React Frontend

Inspect existing frontend API usage if the frontend directory is available.

Ensure the backend supports the existing screens for Guest, Student, Teacher, and Admin.

Preserve existing request and response contracts whenever possible.

If endpoint contracts must change:

- Update the frontend API service accordingly.
- Update TypeScript interfaces.
- Fix affected authentication and route-guard behavior.
- Ensure JWT handling works consistently.
- Ensure Google authentication redirects and callbacks work.
- Ensure PayOS checkout and payment-result screens work.

Do not redesign the frontend unless necessary for functional compatibility.

## 13. Testing Requirements

After implementation, verify all modules.

Create or update automated tests for:

**Authentication**

- Register
- Login
- Google authentication
- Refresh token
- Logout
- Role authorization

**Courses**

- Create
- Update
- Delete or archive
- Publish
- AI outline generation
- Ownership restrictions

**Question Bank**

- Create question
- Update question
- Validate options
- Delete question
- Generate questions with AI
- Accept selected generated questions

**Payment**

- Free enrollment
- Checkout creation
- Payment confirmation
- Invalid webhook signature
- Duplicate webhook
- Duplicate enrollment prevention
- Failed/expired payments

**Quiz**

- Create quiz
- Attach questions
- Start attempt
- Submit answers
- Calculate objective scores
- AI essay grading with mocked external responses
- Enforce time limits
- Access-control restrictions

Mock Google, Gemini, and PayOS in automated tests where appropriate.

Do not make live paid API calls during automated testing.

## 14. Build and Execution

Once implementation is complete:

1. Run Maven compilation.
2. Run the available automated tests.
3. Fix compile errors and failing tests caused by the implementation.
4. Verify dependency injection and Spring application startup.
5. Verify JPA entity mappings.
6. Verify database migration compatibility.
7. Inspect Spring Security configuration for authorization errors.
8. Check affected endpoints and their response contracts.
9. Check frontend compatibility if the frontend is available.
10. Ensure no secrets appear in source control or logs.

Use appropriate commands such as:

```bash
mvn clean test
mvn spring-boot:run
```

Do not claim tests passed unless they were actually executed successfully.

If database credentials, external services, or other required dependencies are unavailable, clearly report what could not be tested.

## 15. Final Deliverables

Provide:

1. A summary of the existing project architecture.
2. A mapping of the five UML Class Diagrams to actual source-code classes.
3. A list of reused, added, and modified classes.
4. Completed backend source code.
5. Required database migrations.
6. Updated frontend integration code if necessary.
7. Automated test results.
8. Build and startup results.
9. Remaining configuration requirements.
10. Known limitations or unverified external integrations.

**Important:** Do not stop after analysis or generate only UML skeleton classes.

Implement the actual LMS functionality using the existing project as the foundation.

Prioritize code quality, correct business logic, data integrity, authorization, maintainability, and compatibility with the existing React frontend.

Start by inspecting the repository, then implement all five modules and verify the result.
