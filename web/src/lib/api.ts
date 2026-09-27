export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let csrfToken: string | null = null;

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.message || "Something went wrong. Please try again.", response.status);
  }
  return payload;
}

async function refreshCsrfToken() {
  const csrfResponse = await fetch("/api/auth/csrf", { credentials: "include" });
  const csrfPayload = await readResponse(csrfResponse);
  csrfToken = csrfPayload.csrfToken || null;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("X-Client-Platform", "web");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (method !== "GET" && method !== "HEAD") {
    if (!csrfToken) {
      await refreshCsrfToken();
    }
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }

  let response = await fetch(`/api/auth${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 403 && method !== "GET" && method !== "HEAD") {
    csrfToken = null;
    await refreshCsrfToken();
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
    response = await fetch(`/api/auth${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  }

  return readResponse(response) as Promise<T>;
}
