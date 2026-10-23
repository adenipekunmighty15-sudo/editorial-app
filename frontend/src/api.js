import { supabase } from './supabaseClient'

// In production the API is served from the same origin (single-service deploy),
// so the base URL is empty by default. During local dev, set VITE_API_URL in
// frontend/.env to point at the backend (e.g. http://localhost:5000).
const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function authHeader() {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(await authHeader()), ...options.headers },
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || `Request failed (${response.status})`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  getBooks: () => request('/api/books'),
  addBook: (book) => request('/api/books', { method: 'POST', body: JSON.stringify(book) }),
  updateBookProgress: (title, progress) => request(`/api/books/${encodeURIComponent(title)}/progress`, { 
    method: 'PATCH', 
    body: JSON.stringify({ progress }) 
  }),
  toggleBookSave: (title) => request(`/api/books/${encodeURIComponent(title)}/save`, { method: 'POST' }),
  getClubs: () => request('/api/clubs'),
  addClub: (club) => request('/api/clubs', { method: 'POST', body: JSON.stringify(club) }),
  joinClub: (clubTitle) => request(`/api/clubs/${encodeURIComponent(clubTitle)}/join`, { method: 'POST' }),
  getStories: () => request('/api/stories'),
  addStory: (story) => request('/api/stories', { method: 'POST', body: JSON.stringify(story) }),
  likeStory: (title) => request(`/api/stories/${encodeURIComponent(title)}/like`, { method: 'POST' }),
  postNote: (note) => request('/api/notes', { method: 'POST', body: JSON.stringify({ content: note }) }),
  // Newsletter & Subscriptions
  subscribeToAuthor: (author) => request('/api/subscriptions', { 
    method: 'POST', 
    body: JSON.stringify({ author }) 
  }),
  getSubscriptions: () => request('/api/subscriptions'),
  // Writer Dashboard
  getWriterStats: () => request('/api/writer/stats'),
  getMyStories: () => request('/api/writer/stories'),
}

export const writer = {
  profile: () => request('/api/writer/profile'),
  join: (input) => request('/api/writer/profile', { method: 'POST', body: JSON.stringify(input) }),
  stories: () => request('/api/writer/stories'),
  stats: () => request('/api/writer/stats'),
  directory: () => request('/api/writers'),
  create: (story) => request('/api/writer/stories', { method: 'POST', body: JSON.stringify(story) }),
  update: (id, story) => request(`/api/writer/stories/${id}`, { method: 'PATCH', body: JSON.stringify(story) }),
  remove: (id) => request(`/api/writer/stories/${id}`, { method: 'DELETE' }),
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

export const studio = {
  myBooks: () => request('/api/my/books'),
  createBook: (book) => request('/api/my/books', json('POST', book)),
  updateBook: (id, book) => request(`/api/my/books/${id}`, json('PATCH', book)),
  deleteBook: (id) => request(`/api/my/books/${id}`, { method: 'DELETE' }),
  chapters: (bookId) => request(`/api/books/${bookId}/chapters`),
  addChapter: (bookId, chapter) => request(`/api/my/books/${bookId}/chapters`, json('POST', chapter)),
  updateChapter: (id, chapter) => request(`/api/my/chapters/${id}`, json('PATCH', chapter)),
  deleteChapter: (id) => request(`/api/my/chapters/${id}`, { method: 'DELETE' }),
  moveChapter: (id, direction) => request(`/api/my/chapters/${id}/move`, json('POST', { direction })),
}

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const COVER_MAX_BYTES = 2 * 1024 * 1024

// Uploads a cover image to Supabase Storage via a one-time URL from the backend.
export async function uploadCover(file) {
  if (!COVER_TYPES.includes(file.type)) throw new Error('Covers must be JPG, PNG or WebP images.')
  if (file.size > COVER_MAX_BYTES) throw new Error('Covers must be 2 MB or smaller.')
  const signed = await request('/api/uploads/cover', json('POST', { contentType: file.type }))
  const { error } = await supabase.storage
    .from('covers')
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type })
  if (error) throw new Error(error.message || 'Cover upload failed.')
  return signed.publicUrl
}

export const library = {
  mine: () => request('/api/me/library'),
}

export const ai = {
  write: (input) => request('/api/ai/write', { method: 'POST', body: JSON.stringify(input) }),
  analyzeGenre: (input) => request('/api/ai/genre', { method: 'POST', body: JSON.stringify(input) }),
  recommend: (input) => request('/api/ai/recommendations', { method: 'POST', body: JSON.stringify(input) }),
  clubGuide: (input) => request('/api/ai/club-guide', { method: 'POST', body: JSON.stringify(input) }),
  chat: (input) => request('/api/ai/chat', { method: 'POST', body: JSON.stringify(input) }),
}

export default api
