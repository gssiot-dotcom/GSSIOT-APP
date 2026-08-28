const apiBaseUrl = (process.env.EXPO_PUBLIC_SERVER_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

function assertConfigured() {
  if (!apiBaseUrl) throw new ApiError("EXPO_PUBLIC_SERVER_BASE_URL is not configured.", 0);
}

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  assertConfigured();
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, { credentials: "include" });
  if (!response.ok) throw new ApiError("Unable to initialize CSRF protection.", response.status);
  const body = (await response.json()) as { csrfToken?: unknown };
  if (typeof body.csrfToken !== "string" || !body.csrfToken) {
    throw new ApiError("The CSRF response is invalid.", 500);
  }
  csrfToken = body.csrfToken;
  return csrfToken;
}

async function rawRequest<T>(path: string, options: RequestInit): Promise<T> {
  assertConfigured();
  const method = options.method ?? "GET";
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(unsafe ? { "x-csrf-token": await ensureCsrfToken() } : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let message = "The request failed.";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string" && body.message) message = body.message;
    } catch {
      // Keep the generic message when the server did not return JSON.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = rawRequest<void>("/auth/refresh", { method: "POST" })
      .then(() => undefined)
      .catch((error) => {
        csrfToken = null;
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    const method = (options.method ?? "GET").toUpperCase();
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);
    if (
      unsafe &&
      error instanceof ApiError &&
      error.status === 403 &&
      error.message.toLowerCase().includes("csrf")
    ) {
      csrfToken = null;
      return rawRequest<T>(path, options);
    }
    if (allowRefresh && error instanceof ApiError && error.status === 401) {
      await refreshSession();
      return rawRequest<T>(path, options);
    }
    throw error;
  }
}

async function rawBlobRequest(path: string): Promise<Blob> {
  assertConfigured();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: { accept: "image/*" },
  });
  if (!response.ok) throw new ApiError("The image request failed.", response.status);
  return response.blob();
}

export async function requestBlob(path: string, allowRefresh = true): Promise<Blob> {
  try {
    return await rawBlobRequest(path);
  } catch (error) {
    if (allowRefresh && error instanceof ApiError && error.status === 401) {
      await refreshSession();
      return rawBlobRequest(path);
    }
    throw error;
  }
}

export function clearCsrfToken() {
  csrfToken = null;
}
