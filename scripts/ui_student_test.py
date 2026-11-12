"""UI walkthrough of the student screens in a real (headless) Chrome.

Prerequisites:
  * backend on 8080 with the smoke profile
  * Vite dev server on 5199
  * google-chrome available

Run:
  API_BASE=http://127.0.0.1:8080/api APP_URL=http://127.0.0.1:5199 python3 scripts/ui_student_test.py
"""
import http.cookiejar
import http.client
import json
import os
import shutil
import subprocess
import threading
import time
import urllib.request
import uuid

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8080/api")
APP = os.environ.get("APP_URL", "http://127.0.0.1:5199")
CDP_PORT = 9223


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


identity = uuid.uuid4().hex[:6]
lesson_text = f"Nội dung bài học học viên {identity} hiển thị trong trình đọc."
quiz_title = f"Quiz học viên {identity}"

teacher = client()
call(teacher, "/auth/register", "POST", {
    "email": f"st{identity}@example.com",
    "password": "testpassword",
    "name": "Student Test Teacher",
    "role": "TEACHER",
})
course = call(teacher, "/teacher/courses", "POST", {
    "title": f"Khóa học học viên {identity}",
    "description": "Khóa học miễn phí dùng để kiểm thử màn hình học viên.",
    "level": "BEGINNER",
    "price": 0,
    "status": "PUBLISHED",
    "category": "UI",
})
module = call(teacher, f"/teacher/courses/{course['id']}/modules", "POST", {
    "title": "Chương học viên",
})["module"]
call(teacher, f"/teacher/modules/{module['id']}/lessons", "POST", {
    "title": "Bài học học viên",
    "contentType": "TEXT",
    "content": lesson_text,
    "position": 1,
})
question = call(teacher, "/questions", "POST", {
    "subject": "UI",
    "content": "Câu hỏi kiểm thử giao diện?",
    "difficulty": "EASY",
    "explanation": "Đáp án A là đúng trong bài kiểm thử.",
    "answers": [
        {"content": "Đáp án đúng", "correct": True},
        {"content": "Đáp án sai", "correct": False},
    ],
})
call(teacher, "/quizzes", "POST", {
    "title": quiz_title,
    "subject": "UI",
    "durationMinutes": 10,
    "questionIds": [question["question"]["id"]],
})

student = client()
call(student, "/auth/register", "POST", {
    "email": f"student{identity}@example.com",
    "password": "testpassword",
    "name": "UI Student",
    "role": "STUDENT",
})
call(student, f"/courses/{course['id']}/checkout", "POST", {})
session = next(c.value for c in student.jar if c.name == "JSESSIONID")
print("seeded published course, lesson, quiz and enrollment")


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
        "--user-data-dir=/tmp/chrome-ui-student-test",
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
cdp.wait_for("!!document.querySelector('.course-card')", label="featured courses on home")
assert cdp.js(
    "document.body.innerText.toLowerCase().includes('đăng xuất')"
), "student session not recognised"
print("ok  student session renders the home catalog")

# --- dashboard -------------------------------------------------------------
cdp.js(
    """[...document.querySelectorAll('.sidebar nav button')]
        .find(b => b.textContent.includes('Tổng quan')).click()"""
)
cdp.wait_for("!!document.querySelector('.welcome')", label="dashboard")
assert cdp.js(
    "document.body.innerText.toLowerCase().includes('khóa học đã mua')"
), "dashboard stat for purchased courses missing"
cdp.js(
    """[...document.querySelectorAll('.sidebar nav button')]
        .find(b => b.textContent.includes('Khóa học đã mua')).click()"""
)
cdp.wait_for(
    f"""[...document.querySelectorAll('.course-card')]
        .some(c => c.innerText.toLowerCase().includes('khóa học học viên {identity}'))""",
    label="enrolled course in the library",
)
print("ok  dashboard and course library list the enrollment")

# --- catalog -> course -----------------------------------------------------
cdp.js(
    """[...document.querySelectorAll('.sidebar nav button')]
        .find(b => b.textContent.includes('Khám phá khóa học')).click()"""
)
cdp.wait_for("!!document.querySelector('.search input')", label="catalog search")
cdp.js(
    """(() => { const el = document.querySelector('.search input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, '%s');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true; })()"""
    % f"Khóa học học viên {identity}"
)
cdp.wait_for(
    """document.querySelectorAll('.course-card').length === 1""",
    label="search narrows the catalog to the seeded course",
)
cdp.wait_for(
    """(() => { const card = document.querySelector('.course-card');
      return card && getComputedStyle(card).visibility !== 'hidden'
        && Number(getComputedStyle(card).opacity) > 0.9; })()""",
    label="catalog card entrance animation completed",
)
assert cdp.js(
    """(() => { const cards = [...document.querySelectorAll('.course-card')];
      const card = cards.find(c => c.textContent.toLowerCase().includes('%s'));
      if (!card) return false; card.click(); return true; })()""" % identity
), "seeded course card missing from the catalog"
cdp.wait_for("!!document.querySelector('.course-hero')", label="course detail")
cdp.wait_for(
    f"""(document.querySelector('.course-hero h1') || {{}}).innerText?.toLowerCase()
        .includes('khóa học học viên {identity}')""",
    label="course title on the detail page",
)
cdp.wait_for(
    "!!document.querySelector('.module-card')", label="module list on the course detail page"
)
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('bài học học viên')",
    label="lesson row on the course detail page",
)
print("ok  catalog opens the course detail with module and lesson")

# --- lesson reader + completion --------------------------------------------
cdp.js(
    """[...document.querySelectorAll('.lesson span')]
        .find(s => s.textContent.includes('Bài học học viên')).click()"""
)
cdp.wait_for("!!document.querySelector('.lesson-content')", label="lesson reader")
cdp.wait_for(
    f"document.querySelector('.lesson-content').innerText.includes('{lesson_text[:40]}')",
    label="lesson content rendered",
)
cdp.js(
    """[...document.querySelectorAll('button')]
        .find(b => b.textContent.includes('Đánh dấu hoàn thành')).click()"""
)
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('đã ghi nhận hoàn thành bài học')",
    label="completion notice",
)
cdp.wait_for(
    """[...document.querySelectorAll('button')]
        .some(b => b.textContent.includes('Đã hoàn thành'))""",
    label="lesson marked as completed",
)
print("ok  lesson reader renders content and marks completion")

# --- quiz: take and submit -------------------------------------------------
cdp.js(
    """[...document.querySelectorAll('.sidebar nav button')]
        .find(b => b.textContent.includes('Quiz luyện tập')).click()"""
)
cdp.wait_for("!!document.querySelector('.quiz-card')", label="quiz list")
cdp.wait_for(
    """(() => { const card = document.querySelector('.quiz-card');
      return card && getComputedStyle(card).visibility !== 'hidden'
        && Number(getComputedStyle(card).opacity) > 0.9; })()""",
    label="quiz card entrance animation completed",
)
assert cdp.js(
    f"""(() => {{ const card = [...document.querySelectorAll('.quiz-card')]
        .find(c => c.textContent.includes('{quiz_title}'));
      if (!card) return false;
      card.querySelector('button').click(); return true; }})()"""
), "seeded quiz card missing"
cdp.wait_for("!!document.querySelector('.take-card')", label="quiz taking screen")
assert cdp.js(
    "document.querySelectorAll('.take-card').length === 1"
), "expected exactly one question on the quiz screen"
cdp.js(
    """(() => { const card = document.querySelector('.take-card');
      card.querySelector('input[type=radio]').click(); return true; })()"""
)
cdp.wait_for(
    "!!document.querySelector('.choice.selected')", label="answer selected"
)
assert cdp.js(
    "document.querySelector('.quiz-timer').innerText.includes('1/1')"
), "answered counter did not update"
cdp.js(
    """[...document.querySelectorAll('button')]
        .find(b => b.textContent.includes('Nộp bài')).click()"""
)
cdp.wait_for("!!document.querySelector('.ant-modal-confirm')", label="submit confirm")
cdp.js(
    """[...document.querySelectorAll('.ant-modal-confirm button')]
        .find(b => b.textContent.includes('Nộp bài')).click()"""
)
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('đã nộp bài')",
    label="submission notice",
)
cdp.wait_for(
    "!!document.querySelector('.review-summary h2')",
    label="answer review after submit",
)
score = cdp.js("document.querySelector('.review-summary h2').innerText")
assert "1/1" in score, score
print("ok  quiz submission records the score:", score)

# --- results history and answer review -------------------------------------
assert cdp.js(
    "document.body.innerText.toLowerCase().includes('đáp án a là đúng')"
), "review after submit is missing the explanation"
cdp.js(
    """[...document.querySelectorAll('.sidebar nav button')]
        .find(b => b.textContent.trim() === 'Kết quả').click()"""
)
cdp.wait_for("!!document.querySelector('.list-row strong')", label="saved result in history")
assert cdp.js("document.querySelector('.list-row strong').innerText") == "1/1"
cdp.js(
    """[...document.querySelectorAll('.list-row button')]
        .find(b => b.textContent.includes('Xem đáp án')).click()"""
)
cdp.wait_for(
    "document.body.innerText.toLowerCase().includes('đáp án đúng')",
    label="answer review screen",
)
assert cdp.js(
    "document.body.innerText.toLowerCase().includes('đáp án a là đúng')"
), "review is missing the explanation"
print("ok  answer review shows the explanation")

# --- console health --------------------------------------------------------
page_errors = cdp.js("window.__uiErrors || []")
assert page_errors == [], page_errors
print("ok  no runtime error captured during the walkthrough")

chrome.terminate()
shutil.rmtree("/tmp/chrome-ui-student-test", ignore_errors=True)
print("ALL STUDENT UI CHECKS PASSED")
