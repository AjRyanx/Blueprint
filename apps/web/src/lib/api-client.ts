const API = process.env.NEXT_PUBLIC_API_URL;

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  accessToken?: string,
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const authHeaders: Record<string, string> = { ...headers };
  if (accessToken) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.error ?? 'Unknown error');
  }

  return json.data;
}
