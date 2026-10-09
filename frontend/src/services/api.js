export const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:8000'
).replace(/\/+$/, '')


export async function apiRequest(
  endpoint,
  options = {},
  token = null,
) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  )

  let data = null

  if (response.status !== 204) {
    data = await response.json()
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.detail ||
      'Something went wrong'

    throw new Error(message)
  }

  return data
}