import { API_URL } from '@/lib/config';
import type {
  ApiResponse,
  Dataset,
  DatasetListParams,
  DatasetReport,
  DemoReport,
  FieldError,
  User,
} from './types';

/**
 * The only module that talks to the API.
 *
 * The access token lives in this module's memory, never in storage, so a
 * script injected into the page cannot read it from there. The refresh token
 * is an httpOnly cookie the browser sends with `credentials: 'include'`.
 * When a request gets 401, the client refreshes the access token once and
 * retries; if that fails, the session is over.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Check your connection and try again.';

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function hasAccessToken() {
  return accessToken !== null;
}

// Several requests can fail with 401 at the same moment. They all wait for
// one shared refresh instead of each starting their own.
function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
        return body.data.accessToken;
      })
      .catch(() => null)
      .then((token) => {
        accessToken = token;
        refreshing = null;
        return token;
      });
  }
  return refreshing;
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as {
    message?: string;
    errorMessages?: FieldError[];
  } | null;
  return new ApiError(
    res.status,
    body?.message ?? `The request failed (${res.status}).`,
    body?.errorMessages ?? [],
  );
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  // Public endpoints and the login form must not trigger a token refresh.
  auth?: boolean;
};

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  { method = 'GET', body, query, auth = true }: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const send = () =>
    fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(auth && accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => {
      throw new ApiError(0, NETWORK_ERROR_MESSAGE);
    });

  let res = await send();
  if (res.status === 401 && auth) {
    if (await refreshAccessToken()) {
      res = await send();
    } else {
      onSessionExpired?.();
    }
  }
  if (!res.ok) {
    throw await toApiError(res);
  }
  return (await res.json()) as ApiResponse<T>;
}

type XhrResult = { status: number; body: unknown };

function postFile(
  path: string,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<XhrResult> {
  // fetch cannot report upload progress, so file uploads use XMLHttpRequest.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.withCredentials = true;
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new ApiError(0, NETWORK_ERROR_MESSAGE));

    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

async function uploadDataset(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<Dataset> {
  let result = await postFile('/datasets', file, onProgress);
  if (result.status === 401) {
    if (!(await refreshAccessToken())) {
      onSessionExpired?.();
    } else {
      result = await postFile('/datasets', file, onProgress);
    }
  }

  const body = result.body as {
    data?: Dataset;
    message?: string;
    errorMessages?: FieldError[];
  } | null;
  if (result.status < 200 || result.status >= 300 || !body?.data) {
    throw new ApiError(
      result.status,
      body?.message ?? `The upload failed (${result.status}).`,
      body?.errorMessages ?? [],
    );
  }
  return body.data;
}

async function signIn(
  path: '/auth/login' | '/auth/register',
  payload: object,
): Promise<void> {
  const res = await request<{ accessToken: string }>(path, {
    method: 'POST',
    body: payload,
    auth: false,
  });
  accessToken = res.data.accessToken;
}

export const api = {
  auth: {
    login: (input: { email: string; password: string }) =>
      signIn('/auth/login', input),
    register: (input: { name: string; email: string; password: string }) =>
      signIn('/auth/register', input),
    /** Uses the refresh cookie to start a session after a page load. */
    restoreSession: async () => (await refreshAccessToken()) !== null,
    logOut: async () => {
      try {
        await request<null>('/auth/log-out', { method: 'POST' });
      } finally {
        accessToken = null;
      }
    },
  },
  users: {
    me: async () => (await request<User>('/users/me')).data,
  },
  datasets: {
    list: (params: DatasetListParams) =>
      request<Dataset[]>('/datasets', { query: params }),
    get: async (id: string) => (await request<Dataset>(`/datasets/${id}`)).data,
    remove: async (id: string) => {
      await request<null>(`/datasets/${id}`, { method: 'DELETE' });
    },
    upload: uploadDataset,
  },
  reports: {
    get: async (datasetId: string) =>
      (await request<DatasetReport>(`/reports/${datasetId}`)).data,
    demo: async (slug: string) =>
      (await request<DemoReport>(`/reports/demo/${slug}`, { auth: false }))
        .data,
  },
};
