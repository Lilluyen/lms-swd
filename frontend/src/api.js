// Shared API client: session cookies + CSRF for every mutating call.
// Errors carry `fields` so forms can show the message under the right input.

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

async function csrfToken() {
  const r = await fetch("/api/auth/csrf", { credentials: "include" });
  if (!r.ok) throw new ApiError("Không lấy được CSRF token", r.status);
  return (await r.json()).token;
}

async function parse(r) {
  const text = await r.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!r.ok) {
    throw new ApiError(
      body?.message || body?.detail || `Yêu cầu thất bại (${r.status})`,
      r.status,
      body?.errors,
    );
  }
  return body;
}

export async function api(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const headers = { ...(opts.headers || {}) };
  let body = opts.body;

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["X-XSRF-TOKEN"] = (await (async () => {
      try {
        return await csrfToken();
      } catch (e) {
        throw new ApiError(
          "Không kết nối được backend. Kiểm tra Spring Boot đang chạy ở cổng 8080.",
          e.status || 0,
        );
      }
    })());
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
  }

  let r;
  try {
    r = await fetch("/api" + path, {
      credentials: "include",
      method,
      headers,
      body,
    });
  } catch {
    throw new ApiError(
      "Không kết nối được backend. Kiểm tra Spring Boot ở cổng 8080 và Vite ở cổng 5173.",
      0,
    );
  }
  return parse(r);
}

export const post = (path, body) => api(path, { method: "POST", body });
export const put = (path, body) => api(path, { method: "PUT", body });
export const del = (path) => api(path, { method: "DELETE" });

export async function upload(path, file, kind) {
  const token = await csrfToken();
  const data = new FormData();
  data.append("file", file);
  let r;
  try {
    r = await fetch(`/api${path}?kind=${encodeURIComponent(kind)}`, {
      method: "POST",
      credentials: "include",
      headers: { "X-XSRF-TOKEN": token },
      body: data,
    });
  } catch {
    throw new ApiError("Không tải được tệp lên máy chủ", 0);
  }
  return parse(r);
}
