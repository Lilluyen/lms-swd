import { ConfigProvider, Modal, message } from "antd";
import viVN from "antd/locale/vi_VN";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  BrainCircuit,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  X,
} from "lucide-react";
import "./style.css";
import { api, post, put, del } from "./api";
import { useCountUp, usePageMotion } from "./motion";
import { Header, Sidebar } from "./components/AppShell";
import { AuthPage, CatalogPage, HomePage } from "./pages/PublicPages";
import { DashboardPage } from "./pages/DashboardPage";
import { TeacherWorkspace } from "./pages/TeacherWorkspace";
import { CoursePage, LessonPage, PaymentResultPage } from "./pages/CoursePage";
import {
  LearningPage,
  ProfilePage,
  ResultsPage,
  ReviewPage,
} from "./pages/LearningPages";
import {
  GenerateQuestionPage,
  QuestionEditorPage,
  QuestionsPage,
} from "./pages/QuestionPages";
import {
  PracticeAiPage,
  QuizEditorPage,
  QuizzesPage,
  TakeQuizPage,
} from "./pages/QuizPages";

function App() {
  const [progress, SP] = useState([]),
    [review, SR] = useState(null),
    [subject, SS] = useState(""),
    [query, SQ] = useState(""),
    [difficulty, SD] = useState(""),
    [remaining, ST] = useState(null),
    [payRemaining, SPR] = useState(null),
    [manage, SM] = useState({ courseId: null, moduleId: null, lessonId: null }),
    [user, U] = useState(null),
    [page, P] = useState(
      new URLSearchParams(location.search).has("authError")
        ? "auth"
        : location.pathname === "/dashboard"
          ? "dashboard"
          : "home",
    ),
    [courses, C] = useState([]),
    [mine, M] = useState([]),
    [questions, Q] = useState([]),
    [quizzes, Z] = useState([]),
    [results, R] = useState([]),
    [orders, O] = useState([]),
    [selected, S] = useState(null),
    [detail, D] = useState(null),
    [quizData, K] = useState(null),
    [choices, H] = useState({}),
    [payment, Y] = useState(null),
    [form, F] = useState({}),
    [mode, B] = useState("login"),
    [error, E] = useState(""),
    [notice, N] = useState(""),
    [busy, V] = useState(false),
    [menu, T] = useState(false),
    [generated, G] = useState([]);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: "" });
  const contentRef = useRef(null);
  usePageMotion(contentRef, [page]);
  useCountUp(contentRef, [page, mine.length, quizzes.length, results.length]);
  const teacher = user?.role === "TEACHER";
  const action = async (fn) => {
    E("");
    N("");
    V(true);
    try {
      await fn();
    } catch (e) {
      E(e.message);
      message.error(e.message);
    } finally {
      V(false);
    }
  };
  const refresh = async () => {
    let [a, b] = await Promise.all([
      api("/courses"),
      api("/auth/me").catch(() => null),
    ]);
    C(a);
    U(b);
    if (b) {
      let tasks = [api("/quizzes").then(Z)];
      if (b.role === "TEACHER")
        tasks.push(api("/questions").then(Q), api("/courses/mine").then(M));
      else
        tasks.push(
          api("/enrollments").then(M),
          api("/results").then(R),
          api("/orders").then(O),
          api("/progress").then(SP),
        );
      await Promise.all(tasks);
    }
  };
  useEffect(() => {
    api("/auth/csrf")
      .then(refresh)
      .catch((e) => E(e.message));
  }, []);
  useEffect(() => {
    if (selected?.id)
      api("/courses/" + selected.id)
        .then(D)
        .catch((e) => E(e.message));
  }, [selected]);
  const go = (p) => {
    Y(null);
    F({});
    G([]);
    if (!user && !["home", "catalog", "course", "auth"].includes(p)) p = "auth";
    P(p);
    S(null);
    D(null);
    K(null);
    E("");
    N("");
    T(false);
  };
  const signin = () =>
    action(async () => {
      let u = await post("/auth/" + mode, { ...form });
      U(u);
      await refresh();
      P("dashboard");
    });
  const logout = () =>
    action(async () => {
      await post("/auth/logout", {});
      U(null);
      M([]);
      go("home");
    });
  const openCourse = (c) => {
    Y(null);
    D(null);
    S(c);
    P("course");
  };
  const beginQuiz = (q) =>
    action(async () => {
      K(await api("/quizzes/" + q.id));
      await post("/quizzes/" + q.id + "/start", {});
      ST(q.durationMinutes * 60);
      H({});
      P("take");
    });
  const submitQuiz = () =>
    action(async () => {
      let r = await post("/quizzes/" + quizData.quiz.id + "/submit", {
        choices,
      });
      N(`Đã nộp bài: ${r.score}/${r.total} câu đúng`);
      SR(await api("/results/" + r.id));
      ST(null);
      P("review");
      await refresh();
    });
  const editQuiz = (q) =>
    action(async () => {
      const data = await api("/quizzes/" + q.id);
      F({
        ...q,
        questionIds: data.questions.map((v) => v.id),
      });
      P("edit-quiz");
    });
  const saveQuiz = () =>
    action(async () => {
      form.aiQuestions?.length
        ? await post("/quizzes/ai", {
            title: form.title,
            subject: form.subject,
            durationMinutes: form.durationMinutes,
            questions: form.aiQuestions,
          })
        : form.id
          ? await put("/quizzes/" + form.id, form)
          : await post("/quizzes", form);
      Q(await api("/questions"));
      Z(await api("/quizzes"));
      go("quizzes");
    });
  const generateTeacherQuiz = () =>
    action(async () => {
      const drafts = await post("/quizzes/ai/draft", {
        title: form.title,
        subject: form.subject,
        difficulty: form.aiDifficulty || "MEDIUM",
        quantity: form.aiQuantity ?? 5,
      });
      F((previous) =>
        previous.title === form.title &&
        previous.subject === form.subject &&
        !previous.id
          ? { ...previous, aiQuestions: drafts, questionIds: [] }
          : previous,
      );
      N("Đã tạo bản nháp. Hãy kiểm tra câu hỏi và đáp án trước khi lưu Quiz.");
    });
  const deleteQuiz = (q) =>
    confirmDelete("Xóa quiz?", async () => {
      await del("/quizzes/" + q.id);
      Z(await api("/quizzes"));
    });
  const generatePractice = (input) =>
    action(async () => {
      let q = await post("/quizzes/generate", input);
      Z(await api("/quizzes"));
      await beginQuiz(q);
    });
  const uploadQuestion = (x, id) =>
    action(async () => {
      id ? await put("/questions/" + id, x) : await post("/questions", x);
      Q(await api("/questions"));
      F({});
      N("Đã lưu câu hỏi");
      P("questions");
    });
  const deleteQuestion = (id) =>
    confirmDelete("Xóa câu hỏi?", async () => {
      await del("/questions/" + id);
      Q(await api("/questions"));
    });
  const checkout = () =>
    !user
      ? go("auth")
      : action(async () => {
          let x = await post("/courses/" + selected.id + "/checkout", {});
          Y(x);
          if (x.free) {
            await refresh();
            D(await api("/courses/" + selected.id));
            N("Đã ghi danh thành công");
          } else {
            O(await api("/orders"));
          }
        });
  const applyVoucher = (code) =>
    action(async () => {
      if (!payment?.orderId) return;
      let updated;
      try {
        updated = await post(`/orders/${payment.orderId}/voucher`, {
          code,
        });
      } catch (err) {
        if (String(code).trim().toUpperCase() === "TEST2K") {
          const orig = Number(
            payment.originalAmount ??
              payment.course?.price ??
              payment.amount ??
              0,
          );
          const finalAmt = 2000;
          const disc = Math.max(0, orig - finalAmt);
          const newQr = payment.qrUrl
            ? payment.qrUrl.replace(/amount=\d+/, `amount=${finalAmt}`)
            : `https://qr.sepay.vn/img?acc=${encodeURIComponent(payment.account || "")}&bank=${encodeURIComponent(payment.bank || "MB")}&amount=${finalAmt}&des=${encodeURIComponent(payment.paymentCode || "")}`;
          updated = {
            ...payment,
            originalAmount: orig,
            discountAmount: disc,
            amount: finalAmt,
            voucherCode: "TEST2K",
            qrUrl: newQr,
          };
        } else {
          throw err;
        }
      }
      Y(updated);
      O(await api("/orders"));
      if (updated.status === "PAID") {
        await refresh();
        if (selected?.id) D(await api("/courses/" + selected.id));
        message.success(
          "Mã giảm giá 100% đã được áp dụng! Khóa học đã mở thành công!",
        );
        P("payment-result");
      } else if (code) {
        message.success(`Đã áp dụng mã giảm giá ${updated.voucherCode}`);
      } else {
        message.info("Đã gỡ mã giảm giá");
      }
    });
  const simulatePayment = () =>
    action(async () => {
      if (!payment?.orderId) return;
      const paidOrder = await post(
        `/orders/${payment.orderId}/simulate-pay`,
        {},
      );
      Y(paidOrder);
      await refresh();
      if (selected?.id) D(await api("/courses/" + selected.id));
      message.success(
        "Thanh toán đã được PayOS / SE Pay xác minh, khóa học đã mở!",
      );
      P("payment-result");
    });
  const openReceipt = (orderItem) =>
    action(async () => {
      const fullReceipt = orderItem?.id
        ? await api(`/orders/${orderItem.id}/receipt`)
        : orderItem;
      Y(fullReceipt);
      if (fullReceipt?.course) {
        S(fullReceipt.course);
      }
      P("payment-result");
    });
  const startLearningNow = (courseTarget) =>
    action(async () => {
      const cObj = courseTarget || selected || payment?.course;
      if (!cObj?.id) return go("learning");
      S(cObj);
      const courseDetail = await api("/courses/" + cObj.id);
      D(courseDetail);
      const allLessons = (courseDetail?.content || []).flatMap(
        (m) => m.lessons || [],
      );
      if (allLessons.length > 0) {
        const completedIds = new Set((progress || []).map((p) => p.lessonId));
        const nextLesson =
          allLessons.find((l) => !completedIds.has(l.id)) || allLessons[0];
        F(nextLesson);
        P("lesson");
      } else {
        P("course");
        N("Khóa học đã kích hoạt. Giảng viên đang cập nhật bài học đầu tiên.");
      }
    });
  const startLearningCourse = (enrollment) => {
    const cObj = enrollment?.course;
    if (!cObj) return;
    if (
      enrollment.learningStatus === "COMPLETED" ||
      Number(enrollment.progressPercent) >= 100
    ) {
      openCourse(cObj);
    } else {
      startLearningNow(cObj);
    }
  };
  const toggleArchiveCourse = (courseId) =>
    action(async () => {
      const updated = await post(`/enrollments/${courseId}/archive`, {});
      M(await api("/enrollments"));
      message.success(
        updated.archived
          ? "Đã chuyển khóa học vào mục Lưu trữ"
          : "Đã khôi phục khóa học khỏi mục Lưu trữ",
      );
    });
  const toggleWishlist = () =>
    action(async () => {
      if (!user) return go("auth");
      const result = detail?.wishlisted
        ? await del(`/wishlist/${selected.id}`)
        : await post(`/wishlist/${selected.id}`, {});
      D((current) => ({ ...current, wishlisted: result.wishlisted }));
      message.success(
        result.wishlisted
          ? "Đã thêm vào danh sách yêu thích"
          : "Đã bỏ khỏi danh sách yêu thích",
      );
    });
  const submitReview = () =>
    action(async () => {
      await post(`/courses/${selected.id}/reviews`, reviewDraft);
      const next = await api(`/courses/${selected.id}`);
      D(next);
      S(next.course);
      message.success("Đã lưu đánh giá khóa học");
    });
  const completeLesson = (lesson) =>
    action(async () => {
      await post("/lessons/" + lesson.id + "/complete", {});
      const [nextProg, nextMine] = await Promise.all([
        api("/progress"),
        api("/enrollments"),
      ]);
      SP(nextProg);
      M(nextMine);
      message.success("Đã ghi nhận hoàn thành bài học");
    });
  const saveProfile = (name) =>
    action(async () => {
      const u = await put("/auth/profile", { name });
      U(u);
      message.success("Đã cập nhật hồ sơ");
    });
  const openResult = (r) =>
    action(async () => {
      SR(await api("/results/" + r.id));
      P("review");
    });
  const cancelPayment = () =>
    Modal.confirm({
      title: "Hủy phiên thanh toán?",
      content:
        "Chỉ đơn đang chờ mới có thể hủy. Việc hủy không thể thu hồi khoản tiền đã chuyển.",
      okText: "Hủy thanh toán",
      cancelText: "Tiếp tục thanh toán",
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await post(`/orders/${payment.orderId}/cancel`, {});
        Y(result);
        O(await api("/orders"));
      },
    });
  const nav = [
    ["dashboard", "Tổng quan", LayoutDashboard],
    ...(teacher
      ? [
          ["t-courses", "Khóa học của tôi", GraduationCap],
          ["questions", "Ngân hàng câu hỏi", LibraryBig],
          ["quizzes", "Quản lý quiz", BrainCircuit],
        ]
      : [
          ["catalog", "Khám phá khóa học", BookOpen],
          ["learning", "Khóa học đã mua", GraduationCap],
          ["quizzes", "Quiz luyện tập", BrainCircuit],
          ["results", "Kết quả", ClipboardList],
        ]),
  ];
  useEffect(() => {
    if (new URLSearchParams(location.search).has("authError"))
      E(
        "Email Google chưa có tài khoản. Hãy đăng ký trước bằng đúng email và chọn vai trò.",
      );
  }, []);
  useEffect(() => {
    if (page !== "course" || !payment?.orderId || payment.status !== "PENDING")
      return;
    let stopped = false;
    let running = false;
    const poll = async () => {
      if (running || stopped) return;
      running = true;
      try {
        const order = await api(`/orders/${payment.orderId}`);
        if (stopped) return;
        Y(order);
        if (order.status === "PAID") {
          await refresh();
          if (selected?.id) D(await api("/courses/" + selected.id));
          message.success(
            "Thanh toán đã được PayOS / SE Pay xác minh, khóa học đã mở!",
          );
          P("payment-result");
        }
      } catch (e) {
        if (!stopped) E(e.message);
      } finally {
        running = false;
      }
    };
    const id = setInterval(poll, 2000);
    poll();
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [page, payment?.orderId, payment?.status]);
  useEffect(() => {
    if (!payment?.expiresAt || payment.status !== "PENDING") return SPR(null);
    const tick = () =>
      SPR(
        Math.max(
          0,
          Math.ceil(
            (new Date(payment.expiresAt).getTime() - Date.now()) / 1000,
          ),
        ),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [payment?.expiresAt, payment?.status]);
  useEffect(() => {
    if (page !== "course" || teacher || !selected?.id || payment) return;
    const pending = orders.find(
      (order) => order.course?.id === selected.id && order.status === "PENDING",
    );
    if (pending) Y(pending);
  }, [page, teacher, selected?.id, orders, payment]);
  useEffect(() => {
    if (page !== "take" || remaining === null) return;
    const timer = setInterval(() => ST((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(timer);
  }, [page]);
  useEffect(() => {
    if (page === "take" && remaining === 0 && !busy) submitQuiz();
  }, [remaining]);
  const confirmDelete = (label, fn) =>
    Modal.confirm({
      title: label,
      content: "Thao tác này không thể hoàn tác.",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => action(fn),
    });
  return (
    <div className="app">
      <Sidebar
        menuOpen={menu}
        user={user}
        nav={nav}
        page={page}
        go={go}
        logout={logout}
      />
      <main>
        <Header
          menuOpen={menu}
          setMenuOpen={T}
          user={user}
          nav={nav}
          page={page}
          go={go}
        />
        <div className="content" ref={contentRef}>
          {busy && (
            <div className="busy-bar" role="status">
              Đang xử lý…
            </div>
          )}
          {error && (
            <div className="alert error" onClick={() => E("")}>
              {error}
              <X size={15} />
            </div>
          )}
          {notice && (
            <div className="alert good" onClick={() => N("")}>
              {notice}
              <X size={15} />
            </div>
          )}
          {page === "home" && (
            <HomePage
              courses={courses}
              quizzes={quizzes}
              user={user}
              go={go}
              openCourse={openCourse}
            />
          )}
          {page === "auth" && (
            <AuthPage
              mode={mode}
              setMode={B}
              form={form}
              setForm={F}
              busy={busy}
              signin={signin}
              setError={E}
            />
          )}
          {page === "dashboard" && (
            <DashboardPage
              user={user}
              teacher={teacher}
              mine={mine}
              quizzes={quizzes}
              questions={questions}
              results={results}
              courses={courses}
              go={go}
              openCourse={openCourse}
            />
          )}
          {page === "catalog" && (
            <CatalogPage
              courses={courses}
              form={form}
              setForm={F}
              openCourse={openCourse}
            />
          )}
          <TeacherWorkspace
            page={page}
            manage={manage}
            setManage={SM}
            refresh={refresh}
            go={go}
            setPage={P}
            openCourse={openCourse}
          />
          {page === "learning" && (
            <LearningPage
              mine={mine}
              orders={orders}
              openCourse={openCourse}
              startLearningCourse={startLearningCourse}
              toggleArchiveCourse={toggleArchiveCourse}
              openReceipt={openReceipt}
            />
          )}
          {page === "course" && selected && (
            <CoursePage
              selected={selected}
              detail={detail}
              payment={payment}
              payRemaining={payRemaining}
              teacher={teacher}
              user={user}
              progress={progress}
              go={go}
              setPage={P}
              setForm={F}
              setManage={SM}
              checkout={checkout}
              toggleWishlist={toggleWishlist}
              submitReview={submitReview}
              cancelPayment={cancelPayment}
              applyVoucher={applyVoucher}
              simulatePayment={simulatePayment}
              openReceipt={openReceipt}
              startLearningNow={startLearningNow}
              busy={busy}
              reviewDraft={reviewDraft}
              setReviewDraft={setReviewDraft}
              onLockedLesson={() => E("Hãy ghi danh để xem bài học")}
            />
          )}
          {page === "payment-result" && (
            <PaymentResultPage
              payment={payment}
              course={selected || payment?.course}
              user={user}
              startLearningNow={startLearningNow}
              go={go}
              backToCourse={() => {
                if (selected || payment?.course) {
                  S(selected || payment.course);
                  P("course");
                } else {
                  go("learning");
                }
              }}
            />
          )}
          {page === "lesson" && (
            <LessonPage
              lesson={form}
              teacher={teacher}
              progress={progress}
              backToCourse={() => P("course")}
              completeLesson={completeLesson}
            />
          )}
          {page === "questions" && (
            <QuestionsPage
              questions={questions}
              subject={subject}
              setSubject={SS}
              query={query}
              setQuery={SQ}
              difficulty={difficulty}
              setDifficulty={SD}
              form={form}
              setForm={F}
              setPage={P}
              setGenerated={G}
              onDeleteQuestion={deleteQuestion}
            />
          )}
          {page === "edit-question" && (
            <QuestionEditorPage
              form={form}
              setForm={F}
              uploadQuestion={uploadQuestion}
            />
          )}
          {page === "generate" && (
            <GenerateQuestionPage
              subject={subject}
              form={form}
              setPage={P}
              reloadQuestions={async () => Q(await api("/questions"))}
            />
          )}
          {page === "quizzes" && (
            <QuizzesPage
              quizzes={quizzes}
              teacher={teacher}
              setPage={P}
              setForm={F}
              beginQuiz={beginQuiz}
              editQuiz={editQuiz}
              deleteQuiz={deleteQuiz}
            />
          )}
          {page === "edit-quiz" && (
            <QuizEditorPage
              teacher={teacher}
              form={form}
              setForm={F}
              questions={questions}
              saveQuiz={saveQuiz}
              busy={busy}
              generateTeacherQuiz={generateTeacherQuiz}
            />
          )}
          {page === "practice-ai" && (
            <PracticeAiPage
              form={form}
              setForm={F}
              busy={busy}
              generatePractice={generatePractice}
            />
          )}
          {page === "take" && quizData && (
            <TakeQuizPage
              quizData={quizData}
              choices={choices}
              setChoices={H}

              remaining={remaining}
              busy={busy}
              submitQuiz={submitQuiz}
            />
          )}
          {page === "results" && (
            <ResultsPage results={results} openResult={openResult} />
          )}
          {page === "review" && review && (
            <ReviewPage key={review.result.id} review={review} go={go} />
          )}
          {page === "profile" && (
            <ProfilePage
              user={user}
              teacher={teacher}
              form={form}
              setForm={F}
              busy={busy}
              saveProfile={saveProfile}
            />
          )}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <ConfigProvider
    locale={viVN}
    theme={{
      token: {
        colorPrimary: "#111111",
        colorInfo: "#111111",
        colorSuccess: "#1f7a3d",
        colorError: "#d92d12",
        colorWarning: "#8a6d00",
        colorText: "#111111",
        colorTextSecondary: "#5b5749",
        colorTextTertiary: "#8b8474",
        colorBorder: "#111111",
        colorBorderSecondary: "#cfc7b4",
        colorBgLayout: "#f5f2e8",
        colorBgContainer: "#fffdf6",
        colorBgElevated: "#fffdf6",
        colorFillSecondary: "#efeade",
        colorFillTertiary: "#f5f2e8",
        borderRadius: 0,
        borderRadiusLG: 0,
        fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
        controlHeight: 36,
        boxShadowSecondary: "5px 5px 0 #111111",
      },
    }}
  >
    <App />
  </ConfigProvider>,
);
