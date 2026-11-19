// API Client with automatic token injection and error handling

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  responseType?: "json" | "blob" | "text";
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T = any>(endpoint: string, method: string = "GET", body?: any, options: RequestOptions = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
  
  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers: Record<string, string> = {
    "Accept": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let requestBody = body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });
  } catch (err: any) {
    if (err?.message === "Failed to fetch" || err?.name === "TypeError") {
      throw new ApiError(
        "Backend server is offline or unreachable at http://localhost:8000. Please start the backend server (run start_backend.bat or 'python -m uvicorn main:app --reload' in the backend folder).",
        0
      );
    }
    throw err;
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    let errorData = null;
    try {
      errorData = await response.json();
      if (errorData.detail) {
        errorDetail = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
      } else if (errorData.message) {
        errorDetail = errorData.message;
      }
    } catch {
      // Body wasn't JSON
    }
    throw new ApiError(errorDetail, response.status, errorData);
  }

  if (options.responseType === "blob") {
    return (await response.blob()) as unknown as T;
  }

  if (options.responseType === "text") {
    return (await response.text()) as unknown as T;
  }

  return await response.json();
}

export const api = {
  get: <T = any>(url: string, options?: RequestOptions) => request<T>(url, "GET", undefined, options),
  post: <T = any>(url: string, body?: any, options?: RequestOptions) => request<T>(url, "POST", body, options),
  put: <T = any>(url: string, body?: any, options?: RequestOptions) => request<T>(url, "PUT", body, options),
  delete: <T = any>(url: string, options?: RequestOptions) => request<T>(url, "DELETE", undefined, options),
};

export default api;
