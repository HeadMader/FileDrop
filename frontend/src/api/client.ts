function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[$()*+./?[\\\]^{|}]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface ApiError extends Error {
  status: number;
  data?: unknown;
}

export function makeApiError(message: string, status: number, data?: unknown): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.data = data;
  return err;
}

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  let url = path.startsWith('/api') ? path : `/api${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') params.append(k, String(v));
    }
    const q = params.toString();
    if (q) url += `?${q}`;
  }
  return url;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  let body: BodyInit | undefined;

  if (options.body != null) {
    if (options.body instanceof FormData) {
      body = options.body;
    } else {
      body = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
    }
  }

  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCookie('csrf_token');
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  const res = await fetch(buildUrl(path, options.query), {
    method,
    credentials: 'include',
    headers,
    body,
    signal: options.signal,
  });

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (typeof data === 'object' && data && 'message' in data)
      ? String((data as { message: unknown }).message)
      : res.statusText;
    const err = makeApiError(message, res.status, data);

    if (res.status === 401 && !path.includes('/auth/me') && !path.includes('/auth/login')) {
      // dispatch a custom event that the auth store will listen for
      window.dispatchEvent(new CustomEvent('filedrop:unauthorized'));
    }
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>('POST', path, { body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>('PATCH', path, { body, signal }),
  del: <T>(path: string, signal?: AbortSignal) => request<T>('DELETE', path, { signal }),
};

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export function uploadFile<T>(
  path: string,
  formData: FormData,
  onProgress?: (p: UploadProgress) => void,
): { promise: Promise<T>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const url = path.startsWith('/api') ? path : `/api${path}`;
  const promise = new Promise<T>((resolve, reject) => {
    xhr.open('POST', url, true);
    xhr.withCredentials = true;
    const csrf = getCookie('csrf_token');
    if (csrf) xhr.setRequestHeader('x-csrf-token', csrf);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({ loaded: e.loaded, total: e.total, percent: (e.loaded / e.total) * 100 });
      }
    };
    xhr.onload = () => {
      let data: unknown;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        const msg =
          data && typeof data === 'object' && 'message' in data
            ? String((data as { message: unknown }).message)
            : xhr.statusText;
        reject(makeApiError(msg, xhr.status, data));
      }
    };
    xhr.onerror = () => reject(makeApiError('Network error', 0));
    xhr.onabort = () => reject(makeApiError('Aborted', 0));
    xhr.send(formData);
  });
  return { promise, abort: () => xhr.abort() };
}
