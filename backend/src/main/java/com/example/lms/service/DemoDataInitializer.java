package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.entity.Module;
import com.example.lms.repository.*;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.demo-data", havingValue = "true")
public class DemoDataInitializer implements CommandLineRunner {

  @Autowired
  UserRepository users;

  @Autowired
  CourseRepository courses;

  @Autowired
  ModuleRepository modules;

  @Autowired
  LessonRepository lessons;

  @Autowired
  QuestionRepository questions;

  @Autowired
  AnswerRepository answers;

  @Autowired
  QuizRepository quizzes;

  @Autowired
  QuizQuestionRepository links;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  SupportService support;

  @Autowired
  QuestionService questionService;

  @Autowired
  com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @org.springframework.beans.factory.annotation.Value("${TFT_DEMO_TEACHER_EMAIL:teacher@learnova.local}")
  String tftDemoTeacherEmail;

  @Override
  @Transactional
  public void run(String... args) {
    var existingTeacher = users.findByEmail("teacher@learnova.local");
    if (existingTeacher.isPresent()) {
      seedTftQuestions();
      return;
    }
    User t = new User();
    t.name = "Giáo viên Learnova";
    t.email = "teacher@learnova.local";
    t.passwordHash = encoder.encode("Learnova@123");
    t.role = "TEACHER";
    t.roleDefinition = support.role(t.role);
    users.save(t);
    User student = new User();
    student.name = "Học viên Learnova";
    student.email = "student@learnova.local";
    student.passwordHash = encoder.encode("Learnova@123");
    student.roleDefinition = support.role(student.role);
    users.save(student);
    String[] titles = {
      "Java căn bản cho người mới bắt đầu",
      "Thiết kế giao diện với React",
      "Cơ sở dữ liệu và tư duy SQL",
    };
    String[] subjects = {
      "Lập trình Java",
      "React & Frontend",
      "Cơ sở dữ liệu",
    };
    String[] descriptions = {
      "Làm quen với biến, kiểu dữ liệu và tư duy hướng đối tượng qua các bài tập Java thực tế.",
      "Xây dựng giao diện từ component, quản lý state và thiết kế trải nghiệm học tập trực quan.",
      "Hiểu mô hình quan hệ, khóa chính và viết truy vấn SQL để khai thác dữ liệu hiệu quả.",
    };
    for (int i = 0; i < titles.length; i++) {
      Course c = new Course();
      c.title = titles[i];
      c.description = descriptions[i];
      c.category = subjects[i];
      c.categoryDefinition = support.category(c.category);
      c.teacher = t;
      c.price = i == 2 ? new BigDecimal("599000") : (i == 1 ? new BigDecimal("299000") : BigDecimal.ZERO);
      c.published = true;
      courses.save(c);
      Module m = new Module();
      m.course = c;
      m.title = "Chương 1: Bắt đầu hành trình";
      m.description = "Nắm vững các khái niệm cốt lõi và kiến trúc nền tảng.";
      m.position = 1;
      modules.save(m);
      Lesson l = new Lesson();
      l.module = m;
      l.title = "Bài 1: Giới thiệu và mục tiêu học tập";
      l.position = 1;
      l.durationMinutes = 15;
      l.contentType = "TEXT";
      l.content =
        descriptions[i] +
        "\n\nMục tiêu\n• Nắm được các khái niệm nền tảng.\n• Thực hành qua ví dụ đơn giản.\n• Tự kiểm tra kiến thức bằng bài quiz.\n\nĐây là bài học mẫu để bạn thử luồng ghi danh và theo dõi tiến độ.";
      lessons.save(l);

      Lesson l2 = new Lesson();
      l2.module = m;
      l2.title = "Bài 2: Thực hành chuyên sâu & Case Study thực tế";
      l2.position = 2;
      l2.durationMinutes = 25;
      l2.contentType = "TEXT";
      l2.content =
        "Nội dung thực hành chuyên sâu cho môn " +
        subjects[i] +
        ".\n\n1. Phân tích bài toán thực tế.\n2. Áp dụng kiến trúc chuẩn mực.\n3. Kiểm thử và tối ưu hóa hiệu năng.";
      lessons.save(l2);

      Question q = new Question();
      q.teacher = t;
      q.subject = subjects[i];
      q.bank = support.bank(t, q.subject);
      q.content = new String[] {
        "Kiểu dữ liệu nào lưu số nguyên trong Java?",
        "Hook nào quản lý state trong React?",
        "Khóa chính dùng để làm gì?",
      }[i];
      q.difficulty = "EASY";
      q.explanation = new String[] {
        "int là kiểu dữ liệu số nguyên 32 bit.",
        "useState lưu state và cung cấp hàm cập nhật state.",
        "Khóa chính định danh duy nhất mỗi bản ghi trong bảng.",
      }[i];
      questions.save(q);
      String[][] opts = {
        { "int", "boolean", "String", "void" },
        { "useState", "useEffect", "useRef", "useMemo" },
        {
          "Định danh duy nhất bản ghi",
          "Sắp xếp bảng",
          "Xóa dữ liệu",
          "Tạo biểu đồ",
        },
      };
      for (int n = 0; n < 4; n++) {
        Answer a = new Answer();
        a.question = q;
        a.content = opts[i][n];
        a.correct = n == 0;
        answers.save(a);
      }
      Quiz quiz = new Quiz();
      quiz.title = "Ôn tập: " + subjects[i];
      quiz.subject = subjects[i];
      quiz.owner = t;
      quiz.durationMinutes = 10;
      quizzes.save(quiz);
      QuizQuestion link = new QuizQuestion();
      link.quiz = quiz;
      link.question = q;
      links.save(link);
    }
    seedTftQuestions();
  }

  private void seedTftQuestions() {
    User teacher = users.findByEmail(tftDemoTeacherEmail.trim().toLowerCase(java.util.Locale.ROOT))
      .orElse(null);
    if (teacher == null || !"TEACHER".equals(teacher.role)) {
      org.slf4j.LoggerFactory.getLogger(DemoDataInitializer.class).warn(
        "TFT demo questions skipped: configured account does not exist or is not a teacher"
      );
      return;
    }
    try (var stream = new org.springframework.core.io.ClassPathResource(
      "demo/tft-beginner-questions.json"
    ).getInputStream()) {
      var inputs = objectMapper.readValue(
        stream, com.example.lms.dto.QuestionRequest[].class
      );
      var existing = questions.findByTeacherId(teacher.id);
      for (var input : inputs) {
        boolean present = existing.stream().anyMatch(q ->
          input.subject().equals(q.subject) && input.content().equals(q.content)
        );
        if (!present) questionService.create(teacher, input);
      }
    } catch (java.io.IOException e) {
      throw new IllegalStateException("Cannot load TFT demo questions", e);
    }
  }
}
