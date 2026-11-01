"""Checks for the teacher Course -> Module -> Lesson management screens and the
shared AI dialog. Runs against the in-memory smoke profile only:

  SPRING_PROFILES_ACTIVE=smoke ... java -jar backend/target/lms-0.1.0.jar
  API_BASE=http://127.0.0.1:8080/api python3 scripts/content_test.py
"""
import json
import os
import urllib.error
import urllib.request
import uuid

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8080/api")


def client():
    import http.cookiejar

    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
        urllib.request.ProxyHandler({}),
    )


def raw(o, path, method="GET", body=None, headers=None):
    h = {"Content-Type": "application/json", **(headers or {})}
    if method != "GET":
        h["X-XSRF-TOKEN"] = call(o, "/auth/csrf")["token"]
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body or {}).encode() if method != "GET" else None,
        headers=h,
        method=method,
    )
    return o.open(req, timeout=30)


def call(o, path, method="GET", body=None, headers=None):
    with raw(o, path, method, body, headers) as r:
        text = r.read().decode()
        return json.loads(text) if text else None


def expect_error(o, path, method, body, status, field=None, label=""):
    try:
        call(o, path, method, body)
    except urllib.error.HTTPError as e:
        payload = json.loads(e.read().decode() or "{}")
        assert e.code == status, f"{label}: expected {status}, got {e.code} {payload}"
        if field:
            assert field in payload.get("errors", {}), f"{label}: missing field {field} -> {payload}"
        print(f"ok  rejected {label or path} ({status})")
        return payload
    raise AssertionError(f"{label or path}: expected HTTP {status}")


def multipart(fields, files):
    boundary = "----lms" + uuid.uuid4().hex
    lines = []
    for name, value in fields.items():
        lines.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n")
    for name, (filename, content, ctype) in files.items():
        lines.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\n"
            f"Content-Type: {ctype}\r\n\r\n"
        )
        body = "".join(lines).encode() + content + f"\r\n--{boundary}--\r\n".encode()
        return body, f"multipart/form-data; boundary={boundary}"
    return "".join(lines).encode(), f"multipart/form-data; boundary={boundary}"


def upload(o, kind, filename, content, ctype):
    body, ctype_header = multipart({}, {"file": (filename, content, ctype)})
    token = call(o, "/auth/csrf")["token"]
    req = urllib.request.Request(
        BASE + f"/teacher/uploads?kind={kind}",
        data=body,
        headers={"Content-Type": ctype_header, "X-XSRF-TOKEN": token},
        method="POST",
    )
    with o.open(req, timeout=30) as r:
        return json.loads(r.read().decode())


identity = uuid.uuid4().hex[:6]
t1, t2, anon = client(), client(), client()
call(t1, "/auth/register", "POST", {"email": f"t1{identity}@example.com", "password": "testpassword", "name": "Teacher One", "role": "TEACHER"})
call(t2, "/auth/register", "POST", {"email": f"t2{identity}@example.com", "password": "testpassword", "name": "Teacher Two", "role": "TEACHER"})
print("teachers registered")

course = {
    "title": f"Quản lý nội dung {identity}",
    "description": "Mô tả đủ dài cho khóa học kiểm thử.",
    "level": "BEGINNER",
    "price": 0,
    "status": "DRAFT",
    "category": "Kiểm thử",
}
c = call(t1, "/teacher/courses", "POST", course)
cid = c["id"]
print("created course", cid, c["status"], c["moduleCount"], c["lessonCount"])
assert c["status"] == "DRAFT" and c["moduleCount"] == 0

ctx = call(t1, "/teacher/courses", "POST", dict(
    course,
    title="Khóa học có ngữ cảnh AI",
    context="Sinh viên năm 2 CNTT đã biết Java cơ bản; dùng Spring Boot 3 và MySQL 8; không dạy lại cú pháp.",
))
assert ctx["context"].startswith("Sinh viên năm 2"), ctx.get("context")
assert call(t1, f"/teacher/courses/{ctx['id']}")["context"] == ctx["context"]
expect_error(t1, "/teacher/courses", "POST", dict(course, context="x" * 2001), 400, "context", "course context too long")
print("ok  course AI context stored and returned")

expect_error(t1, "/teacher/courses", "POST", dict(course, title="abc"), 400, "title", "short title")
expect_error(t1, "/teacher/courses", "POST", dict(course, description="short"), 400, "description", "short description")
expect_error(t1, "/teacher/courses", "POST", dict(course, price=-1), 400, "price", "negative price")
expect_error(t1, "/teacher/courses", "POST", dict(course, level="EXPERT"), 400, "level", "bad level")
expect_error(t1, "/teacher/courses", "POST", dict(course, status="ARCHIVED"), 400, "status", "bad status")
expect_error(t1, "/teacher/courses", "POST", dict(course, price=100000001), 400, "price", "price above max")

# ownership
expect_error(t2, f"/teacher/courses/{cid}", "GET", None, 403, label="other teacher reads course")
expect_error(t2, f"/teacher/courses/{cid}", "PUT", course, 403, label="other teacher edits course")
expect_error(t2, f"/teacher/courses/{cid}", "DELETE", {}, 403, label="other teacher deletes course")
expect_error(t2, f"/teacher/courses/{cid}/modules", "POST", {"title": "Hack"}, 403, label="other teacher adds module")

# search + filter + pagination
names = []
for i in range(12):
    r = call(t1, "/teacher/courses", "POST", dict(course, title=f"Tìm kiếm {identity} {i:02d}", status="PUBLISHED" if i % 2 else "DRAFT"))
    names.append(r["id"])
page0 = call(t1, "/teacher/courses?page=0&size=10")
assert page0["size"] == 10 and page0["total"] >= 13 and len(page0["items"]) == 10
page1 = call(t1, "/teacher/courses?page=1&size=10")
assert page1["page"] == 1 and 0 < len(page1["items"]) <= 10
assert not {x["id"] for x in page0["items"]} & {x["id"] for x in page1["items"]}
found = call(t1, f"/teacher/courses?q={urllib.parse.quote('Tìm kiếm ' + identity)}&size=50")
assert found["total"] == 12, found["total"]
published = call(t1, f"/teacher/courses?q={urllib.parse.quote('Tìm kiếm ' + identity)}&status=PUBLISHED&size=50")
assert published["total"] == 6
mixed = call(t1, f"/teacher/courses?q={urllib.parse.quote('Tìm kiếm ' + identity + ' 03')}&status=DRAFT")
assert mixed["total"] == 0, mixed
print(f"ok  search/filter/pagination (total={page0['total']})")
expect_error(t1, "/teacher/courses?q=" + "x" * 101, "GET", None, 400, "q", "search too long")

# modules
m1 = call(t1, f"/teacher/courses/{cid}/modules", "POST", {"title": "Module một", "description": "Mô tả"})["module"]
m2 = call(t1, f"/teacher/courses/{cid}/modules", "POST", {"title": "Module hai"})["module"]
m3 = call(t1, f"/teacher/courses/{cid}/modules", "POST", {"title": "Module ba"})["module"]
print("modules", m1["position"], m2["position"], m3["position"])
assert (m1["position"], m2["position"], m3["position"]) == (1, 2, 3)
expect_error(t1, f"/teacher/courses/{cid}/modules", "POST", {"title": "ab"}, 400, "title", "module title too short")
expect_error(t1, f"/teacher/courses/{cid}/modules", "POST", {"title": "Hợp lệ", "description": "x" * 501}, 400, "description", "module description too long")
expect_error(t2, f"/teacher/modules/{m1['id']}", "PUT", {"title": "Hijack"}, 403, label="other teacher edits module")

order = [m3["id"], m1["id"], m2["id"]]
after = call(t1, f"/teacher/courses/{cid}/modules/order", "PUT", {"ids": order})["modules"]
assert [x["id"] for x in after] == order and [x["position"] for x in after] == [1, 2, 3]
reloaded = call(t1, f"/teacher/courses/{cid}/modules")["modules"]
assert [x["id"] for x in reloaded] == order
print("ok  drag order persisted", [x["position"] for x in reloaded])
expect_error(t1, f"/teacher/courses/{cid}/modules/order", "PUT", {"ids": [m1["id"]]}, 400, "order", "partial order rejected")

# lessons
lesson_text = {
    "moduleId": m3["id"],
    "title": "Bài học văn bản",
    "contentType": "TEXT",
    "content": "Nội dung bài học đủ dài để vượt qua kiểm tra tối thiểu.",
    "durationMinutes": 20,
    "position": 1,
}
lt = call(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", lesson_text)["lesson"]
assert lt["position"] == 1 and lt["contentType"] == "TEXT"

video = call(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", {
    "title": "Bài học video", "contentType": "VIDEO", "videoUrl": "https://youtu.be/demo", "position": 2,
})["lesson"]
assert video["position"] == 2 and video["videoUrl"].startswith("https://")

file_lesson = call(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", {
    "title": "Bài học tệp", "contentType": "FILE", "fileUrl": "/api/files/demo.pdf", "fileName": "demo.pdf", "position": 3,
})["lesson"]
assert file_lesson["fileUrl"] == "/api/files/demo.pdf"

expect_error(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", dict(lesson_text, content="ngắn"), 400, "content", "short lesson content")
expect_error(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", dict(lesson_text, videoUrl="not-a-url", contentType="VIDEO"), 400, "videoUrl", "bad video url")
expect_error(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", dict(lesson_text, durationMinutes=0), 400, "durationMinutes", "bad duration")
expect_error(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", dict(lesson_text, position=0), 400, "position", "bad position")
expect_error(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", {"title": "Thiếu file", "contentType": "FILE"}, 400, "fileUrl", "file lesson needs file")
expect_error(t1, f"/teacher/modules/{m3['id']}/lessons", "POST", dict(lesson_text, title="ab"), 400, "title", "short lesson title")
expect_error(t2, f"/teacher/modules/{m3['id']}/lessons", "POST", lesson_text, 403, label="other teacher adds lesson")
expect_error(t2, f"/teacher/lessons/{lt['id']}", "PUT", lesson_text, 403, label="other teacher edits lesson")
expect_error(t2, f"/teacher/lessons/{lt['id']}", "DELETE", {}, 403, label="other teacher deletes lesson")

# move lesson to another module of the same course, order stays 1..n
moved = call(t1, f"/teacher/lessons/{video['id']}", "PUT", dict({
    "title": video["title"], "contentType": "VIDEO", "videoUrl": video["videoUrl"],
}, moduleId=m1["id"], position=1))["lessons"]
assert moved[0]["id"] == video["id"] and moved[0]["position"] == 1
remaining = call(t1, f"/teacher/modules/{m3['id']}/lessons")["lessons"]
assert [x["position"] for x in remaining] == [1, 2], remaining
print("ok  lesson moved across modules, positions normalised")

# module delete cascades lessons
call(t1, f"/teacher/modules/{m3['id']}", "DELETE", {})
after_delete = call(t1, f"/teacher/courses/{cid}/modules")["modules"]
assert all(x["id"] != m3["id"] for x in after_delete)
counts = call(t1, f"/teacher/courses/{cid}")
assert counts["lessonCount"] == 1, counts
print("ok  module delete cascades lessons")

# uploads
try:
    upload(t1, "thumbnail", "fake.png", b"not an image", "image/png")
    raise AssertionError("fake image accepted")
except urllib.error.HTTPError as e:
    assert e.code == 400, e.code
print("ok  invalid image rejected")
import struct
import zlib


def tiny_png():
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", 2, 2, 8, 2, 0, 0, 0)
    raw = b"".join(b"\x00" + b"\xff\x00\x00" * 2 for _ in range(2))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


png = tiny_png()
stored = upload(t1, "thumbnail", "pixel.png", png, "image/png")
assert stored["url"].startswith("/api/files/")
try:
    call(anon, stored["url"].replace("/api", "", 1))
    raise AssertionError("anonymous file access allowed")
except urllib.error.HTTPError as e:
    assert e.code == 401, e.code
with raw(t1, stored["url"].replace("/api", "", 1)) as r:
    assert r.status == 200 and len(r.read()) == len(png)
print("ok  thumbnail upload + authenticated file serving")

# AI: validation runs before the provider call
expect_error(t1, "/teacher/ai/generate", "POST", {"topic": "ab", "contentType": "COURSE_DESCRIPTION"}, 400, "topic", "AI topic too short")
expect_error(t1, "/teacher/ai/generate", "POST", {"topic": "Chủ đề hợp lệ", "contentType": "POEM"}, 400, "contentType", "AI bad content type")
expect_error(t1, "/teacher/ai/generate", "POST", {"topic": "Chủ đề hợp lệ", "language": "FRENCH"}, 400, "language", "AI bad language")
expect_error(t1, "/teacher/ai/generate", "POST", {"topic": "Chủ đề hợp lệ", "level": "EXPERT"}, 400, "level", "AI bad level")
expect_error(t1, "/teacher/ai/generate", "POST", {"topic": "Chủ đề hợp lệ", "objective": "x" * 501}, 400, "objective", "AI objective too long")
expect_error(t1, "/teacher/ai/generate", "POST", {"topic": "Chủ đề hợp lệ", "context": "x" * 20001}, 400, "context", "AI context too long")
try:
    call(t1, "/teacher/ai/generate", "POST", {"topic": "Chủ đề hợp lệ", "contentType": "COURSE_DESCRIPTION", "courseId": cid})
    raise AssertionError("AI generated without a key")
except urllib.error.HTTPError as e:
    payload = json.loads(e.read().decode())
    assert e.code == 503, (e.code, payload)
    assert "GEMINI_API_KEY" in payload["message"], payload
print("ok  AI reports missing GEMINI_API_KEY (503), no mock content")
expect_error(t2, "/teacher/ai/generate", "POST", {"topic": "Chủ đề hợp lệ", "contentType": "LESSON_CONTENT", "lessonId": video["id"]}, 403, label="AI on foreign lesson")

# Question AI must be grounded in lesson content and cannot read another teacher's lesson.
question_ai = {
    "subject": "Java",
    "topic": "Spring dependency injection",
    "difficulty": "MEDIUM",
    "quantity": 3,
    "questionType": "MULTIPLE_CHOICE",
    "language": "VIETNAMESE",
}
expect_error(t1, "/questions/generate", "POST", question_ai, 400, "context", "question AI requires lesson context")
expect_error(t2, "/questions/generate", "POST", dict(question_ai, lessonId=video["id"], context="Nội dung hợp lệ"), 403, label="question AI on foreign lesson")
expect_error(t1, "/questions/generate", "POST", dict(question_ai, lessonId=video["id"], context="Nội dung hợp lệ"), 400, "lessonId", "question AI cannot extract video")
expect_error(t1, "/questions/generate", "POST", dict(question_ai, context="Spring injects dependencies through the application context."), 503, label="grounded question AI reports missing key")
print("ok  grounded question AI validation and lesson ownership")

# delete rules
enroll_free = call(client(), "/auth/register", "POST", {"email": f"s{identity}@example.com", "password": "testpassword", "name": "Student", "role": "STUDENT"})
student_client = client()
call(student_client, "/auth/login", "POST", {"email": f"s{identity}@example.com", "password": "testpassword"})
call(t1, f"/teacher/courses/{cid}", "PUT", dict(course, status="PUBLISHED", title=c["title"]))
call(student_client, f"/courses/{cid}/checkout", "POST")
expect_error(t1, f"/teacher/courses/{cid}", "DELETE", {}, 409, label="course with enrollment cannot be deleted")

empty = call(t1, "/teacher/courses", "POST", course)
call(t1, f"/teacher/courses/{empty['id']}", "DELETE", {})
try:
    call(t1, f"/teacher/courses/{empty['id']}")
    raise AssertionError("deleted course still readable")
except urllib.error.HTTPError as e:
    assert e.code == 404
print("ok  course deletion rules")

expect_error(anon, "/teacher/courses", "GET", None, 401, label="anonymous cannot list teacher courses")
print("ALL CONTENT MANAGEMENT CHECKS PASSED")
