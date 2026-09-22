const API_BASE = '/api';

export function getStoredToken() {
  return localStorage.getItem('guardrails_jwt_token') || '';
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('guardrails_jwt_token', token.trim());
  } else {
    localStorage.removeItem('guardrails_jwt_token');
  }
}

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);

  if (res.status === 204) {
    return null;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth & Token management
  getToken: getStoredToken,
  setToken: setStoredToken,
  register: (credentials) => request('/auth/register', { method: 'POST', body: credentials }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  logout: () => setStoredToken(''),
  issueToken: (payload) => request('/auth/token', { method: 'POST', body: payload }),
  verifyToken: (token) => request('/auth/verify', { method: 'POST', body: { token } }),
  getMe: () => request('/auth/me'),

  // Users
  getUsers: () => request('/users'),
  createUser: (userData) => request('/users', { method: 'POST', body: userData }),

  // Bots
  getBots: () => request('/bots'),
  createBot: (botData) => request('/bots', { method: 'POST', body: botData }),

  // Posts
  getPosts: () => request('/posts'),
  getPost: (id) => request(`/posts/${id}`),
  createPost: (postData) => request('/posts', { method: 'POST', body: postData }),
  getTopViral: (limit = 10) => request(`/posts/top-viral?limit=${limit}`),
  getVirality: (postId) => request(`/posts/${postId}/virality`),

  // Comments
  getComments: (postId) => request(`/posts/${postId}/comments`),
  addComment: (postId, commentData) =>
    request(`/posts/${postId}/comments`, { method: 'POST', body: commentData }),

  // Likes
  likePost: (postId, userName) =>
    request(`/posts/${postId}/like`, { method: 'POST', body: { userName } }),
  unlikePost: (postId, userName) =>
    request(`/posts/${postId}/like/${userName}`, { method: 'DELETE' }),
  getLikeCount: (postId) => request(`/posts/${postId}/like/count`),

  // Notifications
  getPendingUsers: () => request('/notifications/pending'),
  getPendingNotifications: (userId) => request(`/notifications/pending/${userId}`),
  flushUserNotifications: (userId) =>
    request(`/notifications/flush/${userId}`, { method: 'POST' }),
  flushAllNotifications: () => request('/notifications/flush', { method: 'POST' })
};

export default api;
