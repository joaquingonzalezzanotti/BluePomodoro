import axios from 'axios'

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.toString().trim() || '/api'
const apiKey = import.meta.env.VITE_API_KEY?.toString().trim()

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey
  }
  return config
})
