export const GENERIC_SERVICE_ERROR =
  "Something went wrong. Please contact support.";

const serviceFailurePattern =
  /\b(supabase|vtu[\s_-]*gate|upstream|gateway|backend|internal server|internal error|database|postgres|fetch|network request|edge function|temporarily unavailable|could not reach|http error|status code|postgrest|pgrst|row[- ]level security|permission denied|invalid api key|jwt)\b/i;

type ToastEventDetail = { type: "error"; message: string };

export function isServiceFailure(message: string, status?: number): boolean {
  return (typeof status === "number" && status >= 500) ||
    serviceFailurePattern.test(message);
}

export function showErrorToast(message = GENERIC_SERVICE_ERROR): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>("abbakano:toast", {
      detail: { type: "error", message },
    }),
  );
}

export function reportServiceFailure(error: unknown): void {
  console.error("AbbaKano service request failed:", error);
  showErrorToast();
}

export function sanitizeServiceMessage(message: string): string {
  if (!isServiceFailure(message)) return message;
  console.error("Service returned an internal/provider error:", message);
  showErrorToast();
  return GENERIC_SERVICE_ERROR;
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  if (error.message === GENERIC_SERVICE_ERROR) return "";
  return sanitizeServiceMessage(error.message);
}
