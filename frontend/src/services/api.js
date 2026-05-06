const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://beckend-production-89a0.up.railway.app/api'
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '')
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '')

async function handleResponse(response, path) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || error.message || `Erro ao processar ${path}`)
  }
  return response.json()
}

export function buildAssetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path}`
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  return handleResponse(response, path)
}

export async function apiSend(path, method, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })

  return handleResponse(response, path)
}

export const apiPost = (path, payload) => apiSend(path, 'POST', payload)
export const apiPut = (path, payload) => apiSend(path, 'PUT', payload)
export const apiDelete = (path) => apiSend(path, 'DELETE')