import {
  GENERIC_SERVICE_ERROR,
  isServiceFailure,
  reportServiceFailure,
} from "@/lib/userFeedback";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let csrfToken: string | null = null;

async function readResponse(response: Response, showServiceErrorToast = true) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.message === "string"
      ? payload.message
      : "Something went wrong. Please try again.";
    if (isServiceFailure(message, response.status)) {
      if (showServiceErrorToast) reportServiceFailure(new ApiError(message, response.status));
      throw new ApiError(GENERIC_SERVICE_ERROR, response.status);
    }
    throw new ApiError(message, response.status);
  }
  return payload;
}

async function refreshCsrfToken(showServiceErrorToast: boolean) {
  let csrfResponse: Response;
  try {
    csrfResponse = await fetch("/api/auth/csrf", { credentials: "include" });
  } catch (error) {
    if (showServiceErrorToast) reportServiceFailure(error);
    throw new ApiError(GENERIC_SERVICE_ERROR, 0);
  }
  const csrfPayload = await readResponse(csrfResponse, showServiceErrorToast);
  csrfToken = csrfPayload.csrfToken || null;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { showServiceErrorToast?: boolean } = {},
): Promise<T> {
  const showServiceErrorToast = options.showServiceErrorToast !== false;
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("X-Client-Platform", "web");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (method !== "GET" && method !== "HEAD") {
    if (!csrfToken) {
      await refreshCsrfToken(showServiceErrorToast);
    }
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }

  let response: Response;
  try {
    response = await fetch(`/api/auth${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch (error) {
    if (showServiceErrorToast) reportServiceFailure(error);
    throw new ApiError(GENERIC_SERVICE_ERROR, 0);
  }

  if (response.status === 403 && method !== "GET" && method !== "HEAD") {
    csrfToken = null;
    await refreshCsrfToken(showServiceErrorToast);
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
    try {
      response = await fetch(`/api/auth${path}`, {
        ...init,
        headers,
        credentials: "include",
      });
    } catch (error) {
      if (showServiceErrorToast) reportServiceFailure(error);
      throw new ApiError(GENERIC_SERVICE_ERROR, 0);
    }
  }

  return readResponse(response, showServiceErrorToast) as Promise<T>;
}
