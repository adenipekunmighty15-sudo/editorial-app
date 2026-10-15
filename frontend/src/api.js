// In production the API is served from the same origin (single-service deploy),
// so the base URL is empty by default. During local dev, set VITE_API_URL in
// frontend/.env to point at the backend (e.g. http://localhost:5000).
const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || `Request failed (${response.status})`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  getBooks: () => request('/api/books'),
  addBook: (book) => request('/api/books', { method: 'POST', body: JSON.stringify(book) }),
  getClubs: () => request('/api/clubs'),
  addClub: (club) => request('/api/clubs', { method: 'POST', body: JSON.stringify(club) }),
  getStories: () => request('/api/stories'),
  addStory: (story) => request('/api/stories', { method: 'POST', body: JSON.stringify(story) }),
}

export const ai = {
  write: (input) => request('/api/ai/write', { method: 'POST', body: JSON.stringify(input) }),
  analyzeGenre: (input) => request('/api/ai/genre', { method: 'POST', body: JSON.stringify(input) }),
  recommend: (input) => request('/api/ai/recommendations', { method: 'POST', body: JSON.stringify(input) }),
  clubGuide: (input) => request('/api/ai/club-guide', { method: 'POST', body: JSON.stringify(input) }),
  chat: (input) => request('/api/ai/chat', { method: 'POST', body: JSON.stringify(input) }),
}

export default api
