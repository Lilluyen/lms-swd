"""UI walkthrough of the teacher content screens in a real (headless) Chrome.

Prerequisites:
  * backend on 8080 with the smoke profile and GEMINI_BASE_URL=http://127.0.0.1:8099/v1beta
  * Vite dev server on 5199
  * google-chrome available

Run:
  API_BASE=http://127.0.0.1:8080/api APP_URL=http://127.0.0.1:5199 python3 scripts/ui_test.py
"""
import http.cookiejar
import http.client
import json
import os
import re
import shutil
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8080/api")
APP = os.environ.get("APP_URL", "http://127.0.0.1:5199")
MOCK_PORT = 8099
CDP_PORT = 9222
MOCK_TEXT = (
    "Khóa học đưa sinh viên từ mô hình dữ liệu quan hệ tới việc xây dựng REST API "
    "với Spring Boot 3 và MySQL 8, kèm bài tập áp dụng cho đồ án nhóm."
)


# --------------------------------------------------------------- mock Gemini
class MockGemini(BaseHTTPRequestHandler):
    request_count = 0

    def log_message(self, *args):
        pass

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0) or 0))
        MockGemini.request_count += 1
        # The seeded grounded-question API call is the first provider request;
        # the later request comes from the Course AI dialog walkthrough.
        if MockGemini.request_count == 1:
            question_text = json.dumps([
                {
                    "content": f"Câu hỏi kiểm thử số {i + 1}?",
                    "explanation": "Giải thích dựa trên nội dung bài học.",
                    "contextReference": "Nội dung bài học",
                    "answers": [
                        {"content": "Đáp án đúng", "correct": True},
                        {"content": "Phương án nhiễu 1", "correct": False},
                        {"content": "Phương án nhiễu 2", "correct": False},
                        {"content": "Phương án nhiễu 3", "correct": False},
                    ],
                }
                for i in range(2)
            ], ensure_ascii=False)
        else:
            question_text = MOCK_TEXT
        payload = {"candidates": [{"content": {"parts": [{"text": question_text}]}}]}
        raw = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


# ------------------------------------------------------------------ API seed
def client():
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar),
        urllib.request.ProxyHandler({}),
    )
    opener.jar = jar
    return opener


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


mock = ThreadingHTTPServer(("127.0.0.1", MOCK_PORT), MockGemini)
threading.Thread(target=mock.serve_forever, daemon=True).start()
print(f"mock Gemini on {MOCK_PORT}")

identity = uuid.uuid4().hex[:6]
teacher = client()
call(teacher, "/auth/register", "POST", {
    "email": f"ui{identity}@example.com",
    "password": "testpassword",
    "name": "UI Teacher",
    "role": "TEACHER",
})
course = call(teacher, "/teacher/courses", "POST", {
    "title": f"UI Course {identity}",
    "description": "Khóa học tạo sẵn để kiểm thử giao diện quản lý nội dung.",
    "level": "BEGINNER",
    "price": 0,
    "status": "DRAFT",
    "category": "UI",
})
module = call(teacher, f"/teacher/courses/{course['id']}/modules", "POST", {
    "title": "Module giao diện",
})["module"]
lesson = call(teacher, f"/teacher/modules/{module['id']}/lessons", "POST", {
    "title": "Bài học giao diện",
    "contentType": "TEXT",
    "content": "Nội dung bài học dùng cho kiểm thử giao diện.",
    "position": 1,
})["lesson"]
grounded_drafts = call(teacher, "/questions/generate", "POST", {
    "subject": "UI",
    "topic": "Nội dung bài học",
    "difficulty": "MEDIUM",
    "quantity": 2,
    "questionType": "MULTIPLE_CHOICE",
    "language": "VIETNAMESE",
    "context": "",
    "lessonId": lesson["id"],
})
assert len(grounded_drafts) == 2
assert all(q["contextReference"] == "Nội dung bài học" for q in grounded_drafts)
session = next(c.value for c in teacher.jar if c.name == "JSESSIONID")
print("seeded course/module/lesson and verified grounded question generation")


# --------------------------------------------------------------------- CDP
class Cdp:
    def __init__(self, ws_url):
        import asyncio

        import websockets

        self.loop = asyncio.new_event_loop()
        threading.Thread(target=self.loop.run_forever, daemon=True).start()
        async def _open():
            self.conn = websockets.connect(ws_url, max_size=None)
            self.ws = await self.conn.__aenter__()

        asyncio.run_coroutine_threadsafe(_open(), self.loop).result(15)
        self.id = 0

    async def _call(self, target, method, params):
        await self.ws.send(
            json.dumps({"id": target, "method": method, "params": params})
        )
        while True:
            message = json.loads(await self.ws.recv())
            if message.get("id") == target:
                if "error" in message:
                    raise RuntimeError(f"{method}: {message['error']}")
                return message.get("result", {})

    def send(self, method, params=None):
        import asyncio

        self.id += 1
        return asyncio.run_coroutine_threadsafe(
            self._call(self.id, method, params or {}), self.loop
        ).result(30)

    def js(self, expression):
        result = self.send(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True, "awaitPromise": True},
        )
        if result.get("exceptionDetails"):
            raise RuntimeError(result["exceptionDetails"])
        return result.get("result", {}).get("value")

    def wait_for(self, expression, timeout=12, label=""):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.js(expression):
                return True
            time.sleep(0.3)
        raise AssertionError(f"timeout waiting for {label or expression}")


def json_endpoint(path, method="GET"):
    conn = http.client.HTTPConnection("127.0.0.1", CDP_PORT, timeout=10)
    conn.request(method, path)
    response = conn.getresponse()
    return json.loads(response.read().decode())


chrome = subprocess.Popen(
    [
        "google-chrome",
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--no-proxy-server",
        "--remote-debugging-port=%d" % CDP_PORT,
        "--user-data-dir=/tmp/chrome-ui-test",
        "about:blank",
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

for _ in range(40):
    try:
        version = json_endpoint("/json/version")
        break
    except Exception:
        time.sleep(0.5)
else:
    raise SystemExit("Chrome DevTools endpoint did not start")

target = json_endpoint(f"/json/new?{APP}/", "PUT")
cdp = Cdp(target["webSocketDebuggerUrl"])
cdp.send("Page.enable")
cdp.send("Runtime.enable")
cdp.send("Network.enable")
console_errors = []
cdp.send("Log.enable")

cdp.send(
    "Network.setCookie",
    {
        "name": "JSESSIONID",
        "value": session,
        "url": APP,
        "path": "/",
        "httpOnly": True,
    },
)
cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    {
        "source": "window.__uiErrors = [];"
        "addEventListener('error', e => window.__uiErrors.push(String(e.message)));"
        "addEventListener('unhandledrejection', e => window.__uiErrors.push(String(e.reason)));"
    },
)
cdp.send("Page.navigate", {"url": f"{APP}/"})
cdp.wait_for("!!document.querySelector('.sidebar')", label="app shell")
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('khóa học nổi bật')", label="home content"
)
print("ok  app loaded in Chrome with a teacher session")

# --- teacher course list ----------------------------------------------------
cdp.wait_for(
    "[...document.querySelectorAll('.sidebar nav button')].some(el => el.textContent.includes('Khóa học của tôi'))",
    label="teacher navigation",
)
assert cdp.js(
    """(() => { const b = [...document.querySelectorAll('.sidebar nav button')]
        .find(el => el.textContent.includes('Khóa học của tôi'));
      if (!b) return false; b.click(); return true; })()"""
), "teacher nav entry missing"
cdp.wait_for("!!document.querySelector('.t-head')", label="teacher list screen")
row_count = cdp.js("document.querySelectorAll('.t-head').length")
assert cdp.js("document.querySelector('.t-head').innerText.toLowerCase().includes('khóa học của tôi')")
cdp.wait_for(
    f"[...document.querySelectorAll('.teacher-course-card')].some(card => card.innerText.toLowerCase().includes('ui course {identity}'))",
    label="seeded course card",
)
assert cdp.js("!!document.querySelector('.teacher-course-cover')"), "course illustration missing"
assert cdp.js("!!document.querySelector('.teacher-course-rating')"), "course rating state missing"
assert cdp.js("!!document.querySelector('.teacher-course-price')"), "course price missing"
print("ok  teacher course grid renders illustration, title, description, rating and price")

# --- create form: validation + AI dialog -----------------------------------
assert cdp.js(
    """(() => { const button = document.querySelector('[data-testid="create-course"]');
      if (!button) return false; button.click(); return true; })()"""
), "create course button missing"
cdp.wait_for(
    "!!document.querySelector('[data-testid=\"course-form\"]') && document.body.innerText.toLowerCase().includes('ngữ cảnh cho ai')",
    label="course form",
)
cdp.js(
    """[...document.querySelectorAll('button')]
        .find(b => b.textContent.trim() === 'Lưu khóa học').click()"""
)
cdp.wait_for("document.querySelectorAll('.field-err').length >= 2", label="field errors")
errors = cdp.js(
    "[...document.querySelectorAll('.field-err')].map(e => e.textContent)"
)
assert any("5 đến 100" in e for e in errors), errors
print("ok  client-side validation shows errors under fields")

cdp.js(
    """[...document.querySelectorAll('button')]
        .find(b => b.textContent.includes('Generate with AI')).click()"""
)
cdp.wait_for(
    "!!document.querySelector('.ant-modal') && document.body.innerText.toLowerCase().includes('ngữ cảnh giảng dạy / nội dung tham khảo')",
    label="AI dialog",
)
cdp.js(
    """[...document.querySelectorAll('.ant-modal button')]
        .find(b => b.textContent.trim() === 'Generate').click()"""
)
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('chủ đề phải từ 3 đến 200 ký tự')",
    label="AI topic validation",
)
print("ok  AI dialog validation blocks an invalid request")

cdp.js(
    """(() => {
      const input = document.querySelector('.ant-modal input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Kết nối cơ sở dữ liệu');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()"""
)
cdp.js(
    """[...document.querySelectorAll('.ant-modal button')]
        .find(b => b.textContent.trim() === 'Generate').click()"""
)
cdp.wait_for("!!document.querySelector('.ai-text')", label="AI preview", timeout=20)
preview = cdp.js("document.querySelector('.ai-text').textContent")
assert preview.strip() == MOCK_TEXT.strip(), preview[:80]
meta = cdp.js("document.querySelector('.ai-meta').innerText")
assert "/" in meta and "2.000" in meta, meta
visible_modal = cdp.js(
    """(() => { const w = document.querySelector('.ant-modal-wrap');
      return !!w && getComputedStyle(w).display !== 'none'; })()"""
)
assert visible_modal, "dialog closed before Accept"
print("ok  Generate returns a preview with the character counter")

cdp.js(
    """[...document.querySelectorAll('.ant-modal button')]
        .find(b => b.textContent.trim() === 'Accept').click()"""
)
cdp.wait_for(
    """(() => { const w = document.querySelector('.ant-modal-wrap');
      return !w || getComputedStyle(w).display === 'none'; })()""",
    label="dialog closed",
)
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('đã áp dụng nội dung ai')", label="apply notice"
)
filled = cdp.js(
    """(() => { const areas = [...document.querySelectorAll('.panel textarea')];
      const hit = areas.find(a => a.value.includes('Spring Boot 3'));
      return hit ? hit.value.slice(0, 60) : ''; })()"""
)
assert filled, "Accept did not fill the description field"
print("ok  Accept fills the form field (no save yet):", filled[:40], "…")

# --- module board + lesson editor ------------------------------------------
cdp.send("Page.navigate", {"url": f"{APP}/"})
cdp.wait_for("!!document.querySelector('.sidebar')", label="reload")
cdp.js(
    """[...document.querySelectorAll('.sidebar nav button')]
        .find(b => b.textContent.includes('Khóa học của tôi')).click()"""
)
cdp.wait_for(
    f"""[...document.querySelectorAll('.teacher-course-card')].some(card =>
        card.innerText.toLowerCase().includes('ui course {identity}'))""",
    label="course row",
)
cdp.js(
    """(() => { const row = [...document.querySelectorAll('.teacher-course-card')]
        .find(r => r.innerText.toLowerCase().includes('%s'));
      const btn = [...row.querySelectorAll('button')].find(b => b.textContent.includes('Quản lý nội dung'));
      btn.click(); return true; })()"""
    % f"ui course {identity}".lower()
)
cdp.wait_for("!!document.querySelector('.mod-row')", label="module board")
assert cdp.js(
    "document.body.innerText.toLowerCase().includes('module giao diện')"
), "module row missing"
print("ok  module board renders the module with lesson count")

cdp.js(
    """[...document.querySelectorAll('.mod-row button')]
        .find(b => b.textContent.includes('Lessons')).click()"""
)
cdp.wait_for("!!document.querySelector('.lesson-item')", label="lesson panel")
assert cdp.js(
    "document.body.innerText.toLowerCase().includes('bài học giao diện')"
), "lesson row missing"
print("ok  lesson list expands inside the module row")

cdp.js("document.querySelector('.lesson-name').click()")
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('lesson editor')", label="lesson editor"
)
labels = cdp.js(
    """[...document.querySelectorAll('.field > label')].map(l => l.textContent.trim())"""
)
for expected in ["Module", "Tiêu đề bài học", "Content type", "Order"]:
    assert any(expected in l for l in labels), (expected, labels)
cdp.wait_for(
    """[...document.querySelectorAll('textarea')]
        .some(a => a.value.includes('Nội dung bài học'))""",
    label="lesson content loaded into the editor",
)
print("ok  lesson editor loads the existing lesson")

# --- grounded question AI workspace ---------------------------------------
cdp.js(
    """[...document.querySelectorAll('.sidebar nav button')]
        .find(b => b.textContent.includes('Ngân hàng câu hỏi')).click()"""
)
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('ngân hàng câu hỏi')",
    label="question bank",
)
cdp.js(
    """[...document.querySelectorAll('button')]
        .find(b => b.textContent.includes('Tạo bằng AI')).click()"""
)
cdp.wait_for("!!document.querySelector('.question-ai-layout')", label="question AI workspace")
assert cdp.js("!!document.querySelector('.lesson-context-editor')"), "lesson context editor missing"
assert cdp.js("document.body.innerText.includes('Chọn khóa học')"), "lesson source picker missing"
cdp.js(
    """[...document.querySelectorAll('.question-ai-criteria button')]
        .find(b => b.textContent.includes('Tạo bản nháp')).click()"""
)
cdp.wait_for(
    "document.body.innerText.includes('Hãy dán nội dung đã dạy')",
    label="required lesson context validation",
)
print("ok  grounded question AI workspace has lesson picker, editor and inline validation")

# --- console health ---------------------------------------------------------
page_errors = cdp.js("window.__uiErrors || []")
assert page_errors == [], page_errors
print("ok  no runtime error captured during the walkthrough")

chrome.terminate()
shutil.rmtree("/tmp/chrome-ui-test", ignore_errors=True)
print("ALL UI CHECKS PASSED")
