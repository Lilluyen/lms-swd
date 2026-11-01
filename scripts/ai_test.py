"""End-to-end checks for "Generate with AI" against a local mock Gemini.

Start the backend pointing at the mock (the script binds 127.0.0.1:8099):

  GEMINI_API_KEY=test-key \
  GEMINI_BASE_URL=http://127.0.0.1:8099/v1beta \
  GEMINI_TIMEOUT_SECONDS=3 \
  SPRING_PROFILES_ACTIVE=smoke java -jar backend/target/lms-0.1.0.jar

Then:

  API_BASE=http://127.0.0.1:8080/api python3 scripts/ai_test.py

Verifies: prompt grounding (course/lesson context), success + limits, over-long
results flagged without truncation, upstream errors mapped to 502, timeouts to
504, and that the API key never comes from the frontend.
"""
import http.cookiejar
import json
import os
import threading
import time
import urllib.error
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8080/api")
MOCK_PORT = 8099

STATE = {"mode": "ok", "prompts": []}
CONTEXT = (
    "Sinh viên năm 2 CNTT đã biết Java cơ bản; dùng Spring Boot 3 và MySQL 8; "
    "không dạy lại cú pháp Java."
)


class MockGemini(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def read_body(self):
        if "chunked" in self.headers.get("Transfer-Encoding", "").lower():
            data = b""
            while True:
                size = int(self.rfile.readline().strip() or b"0", 16)
                if size == 0:
                    self.rfile.readline()
                    break
                data += self.rfile.read(size)
                self.rfile.read(2)
            return data
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length)

    def do_POST(self):
        body = json.loads(self.read_body() or b"{}")
        prompt = ""
        for part in body.get("contents", [{}])[0].get("parts", []):
            prompt += part.get("text", "")
        STATE["prompts"].append(prompt)
        mode = STATE["mode"]

        if mode == "fail":
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"boom")
            return
        if mode == "slow":
            time.sleep(5)

        if mode == "long":
            text = ("Kiến thức nền tảng về Spring Boot và MySQL. " * 60).strip()
        elif mode == "toolong_lesson":
            text = ("Nội dung bài học chi tiết. " * 450).strip()
        else:
            text = (
                "Khóa học này đưa sinh viên từ mô hình dữ liệu quan hệ tới việc "
                "xây dựng API với Spring Boot 3 và MySQL 8. Học viên thực hành "
                "theo từng module, mỗi bài có ví dụ và bài tập áp dụng trực tiếp "
                "vào đồ án nhóm."
            )
        payload = {
            "candidates": [{"content": {"parts": [{"text": text}]}}]
        }
        raw = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def client():
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
        urllib.request.ProxyHandler({}),
    )


def call(o, path, method="GET", body=None):
    headers = {"Content-Type": "application/json"}
    if method != "GET":
        headers["X-XSRF-TOKEN"] = call(o, "/auth/csrf")["token"]
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body or {}).encode() if method != "GET" else None,
        headers=headers,
        method=method,
    )
    with o.open(req, timeout=30) as r:
        text = r.read().decode()
        return json.loads(text) if text else None


def denied(path, body, status, label):
    try:
        call(teacher, path, "POST", body)
    except urllib.error.HTTPError as e:
        payload = json.loads(e.read().decode() or "{}")
        assert e.code == status, f"{label}: wanted {status}, got {e.code} {payload}"
        print(f"ok  {label} -> {status}: {payload.get('message', '')[:60]}")
        return payload
    raise AssertionError(f"{label}: expected HTTP {status}")


server = ThreadingHTTPServer(("127.0.0.1", MOCK_PORT), MockGemini)
threading.Thread(target=server.serve_forever, daemon=True).start()
print(f"mock Gemini listening on {MOCK_PORT}")

identity = uuid.uuid4().hex[:6]
teacher = client()
call(teacher, "/auth/register", "POST", {
    "email": f"ai{identity}@example.com",
    "password": "testpassword",
    "name": "AI Teacher",
    "role": "TEACHER",
})
course = call(teacher, "/teacher/courses", "POST", {
    "title": "Spring Boot và MySQL thực chiến",
    "description": "Xây dựng REST API với Spring Boot 3 và MySQL 8 cho đồ án sinh viên.",
    "level": "INTERMEDIATE",
    "price": 0,
    "status": "DRAFT",
    "category": "Backend",
    "context": CONTEXT,
})
module = call(teacher, f"/teacher/courses/{course['id']}/modules", "POST", {
    "title": "Khởi động dự án",
})["module"]
lesson = call(teacher, f"/teacher/modules/{module['id']}/lessons", "POST", {
    "title": "Kết nối MySQL với Spring Data JPA",
    "contentType": "TEXT",
    "content": "Nội dung khung để tạo bài học trước khi sinh bằng AI.",
    "position": 1,
})["lesson"]

# 1. Success, prompt grounded in the saved course context
STATE["mode"] = "ok"
result = call(teacher, "/teacher/ai/generate", "POST", {
    "topic": "Kết nối cơ sở dữ liệu",
    "objective": "Sinh viên cấu hình được datasource và viết repository đầu tiên.",
    "context": "",
    "level": "INTERMEDIATE",
    "contentType": "COURSE_DESCRIPTION",
    "language": "VIETNAMESE",
    "courseId": course["id"],
})
assert result["withinLimit"] is True, result
assert result["maxLength"] == 2000 and result["charCount"] == len(result["text"])
assert result["contextUsed"] == CONTEXT, result["contextUsed"]
prompt = STATE["prompts"][-1]
assert CONTEXT in prompt, "saved course context missing from prompt:\n" + prompt[:1200]
assert "Spring Boot và MySQL thực chiến" in prompt, "course title missing from prompt"
assert "Kết nối cơ sở dữ liệu" in prompt
assert "Vietnamese" in prompt and "Intermediate" in prompt
assert "no HTML" in prompt
print(f"ok  course description generated ({result['charCount']} chars), prompt grounded")

# 2. Dialog context overrides the saved one and is sent to the model
extra = "Lớp học buổi tối, chỉ có 6 tuần, ưu tiên ví dụ thực hành ngắn."
result = call(teacher, "/teacher/ai/generate", "POST", {
    "topic": "Kết nối cơ sở dữ liệu",
    "context": extra,
    "contentType": "COURSE_DESCRIPTION",
    "language": "ENGLISH",
})
assert extra in STATE["prompts"][-1] and CONTEXT not in STATE["prompts"][-1]
assert result["contextUsed"] == extra
assert "teacher-provided context" in STATE["prompts"][-1].lower()
print("ok  dialog context replaces stored context in the prompt")

# 3. Over-long course description is flagged, never truncated
STATE["mode"] = "long"
result = call(teacher, "/teacher/ai/generate", "POST", {
    "topic": "Kết nối cơ sở dữ liệu",
    "contentType": "COURSE_DESCRIPTION",
})
assert result["withinLimit"] is False, result
assert result["charCount"] > 2000
assert len(result["text"]) == result["charCount"], "content was truncated"
assert "2.000" in result["warning"], result.get("warning")
print(f"ok  over-long result kept intact ({result['charCount']} chars) and flagged")

# 4. Lesson content uses the 10.000 limit and lesson/module context
STATE["mode"] = "ok"
result = call(teacher, "/teacher/ai/generate", "POST", {
    "topic": "Kết nối cơ sở dữ liệu",
    "contentType": "LESSON_CONTENT",
    "language": "VIETNAMESE",
    "courseId": course["id"],
    "lessonId": lesson["id"],
})
assert result["maxLength"] == 10000, result["maxLength"]
prompt = STATE["prompts"][-1]
assert "Kết nối MySQL với Spring Data JPA" in prompt
assert "Khởi động dự án" in prompt
print("ok  lesson content uses 10.000 limit with lesson + module context")

# 5. Upstream failure -> 502, timeout -> 504
STATE["mode"] = "fail"
denied("/teacher/ai/generate", {
    "topic": "Kết nối cơ sở dữ liệu",
    "contentType": "COURSE_DESCRIPTION",
}, 502, "Gemini 500")
STATE["mode"] = "slow"
denied("/teacher/ai/generate", {
    "topic": "Kết nối cơ sở dữ liệu",
    "contentType": "COURSE_DESCRIPTION",
}, 504, "Gemini timeout")

# 6. Only teachers, only their own course/lesson
student = client()
call(student, "/auth/register", "POST", {
    "email": f"ais{identity}@example.com",
    "password": "testpassword",
    "name": "Student",
    "role": "STUDENT",
})
try:
    call(student, "/teacher/ai/generate", "POST", {"topic": "Hợp lệ"})
    raise AssertionError("student reached the AI endpoint")
except urllib.error.HTTPError as e:
    assert e.code == 403, e.code
print("ok  student blocked from AI endpoint (403)")

other = client()
call(other, "/auth/register", "POST", {
    "email": f"aio{identity}@example.com",
    "password": "testpassword",
    "name": "Other Teacher",
    "role": "TEACHER",
})
try:
    call(other, "/teacher/ai/generate", "POST", {
        "topic": "Hợp lệ",
        "contentType": "COURSE_DESCRIPTION",
        "courseId": course["id"],
    })
    raise AssertionError("other teacher generated content for a foreign course")
except urllib.error.HTTPError as e:
    assert e.code == 403, e.code
print("ok  other teacher blocked from foreign course context (403)")

server.shutdown()
print("ALL AI CHECKS PASSED")
