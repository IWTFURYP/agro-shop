// Обгортка над fetch для звернень до бекенду
const TOKEN_KEY = 'agro_admin_token';
const CUSTOMER_TOKEN_KEY = 'agro_customer_token';

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

// Токен покупця (особистий кабінет) зберігається окремо від токена адміністратора
export function getCustomerToken() {
  try {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCustomerToken(token) {
  try {
    if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    /* localStorage недоступний — працюємо без збереження */
  }
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

let onCustomerUnauthorized = null;
export function setCustomerUnauthorizedHandler(fn) {
  onCustomerUnauthorized = fn;
}

const isAdminUrl = (url) => url.startsWith('/admin') || url.startsWith('/auth');

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
  const adminRequest = isAdminUrl(url);
  const token = adminRequest ? getToken() : getCustomerToken();
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
    if (response.status === 401 && token) {
      if (adminRequest) onUnauthorized?.();
      else onCustomerUnauthorized?.();
    }
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
