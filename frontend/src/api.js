// Обгортка над fetch для звернень до бекенду
const TOKEN_KEY = 'agro_admin_token';

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage недоступний — працюємо без збереження */
  }
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function toQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

async function request(method, url, { body, params } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${url}${toQuery(params)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Немає з'єднання з сервером. Перевірте, чи запущено бекенд", 0);
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(data.error || `Помилка ${response.status}`, response.status, data.fields);
  }
  return data;
}

export const api = {
  get: (url, params) => request('GET', url, { params }),
  post: (url, body) => request('POST', url, { body }),
  put: (url, body) => request('PUT', url, { body }),
  patch: (url, body) => request('PATCH', url, { body }),
  delete: (url) => request('DELETE', url),
};
