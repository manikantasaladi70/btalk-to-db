import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})

export default api

export const authApi = {
  register: (email: string, password: string, full_name: string) =>
    api.post('/api/auth/register', { email, password, full_name }),
  login: (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return api.post('/api/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
}

export const connectionsApi = {
  list: () => api.get('/api/connections/'),
  create: (name: string, db_type: string, connection_string: string, allow_writes = false) =>
    api.post('/api/connections/', { name, db_type, connection_string, allow_writes }),
  delete: (id: number) => api.delete(`/api/connections/${id}`),
  refreshSchema: (id: number) => api.post(`/api/connections/${id}/refresh-schema`),
  getSchema: (id: number) => api.get(`/api/connections/${id}/schema`),
  setAllowWrites: (id: number, allow_writes: boolean) =>
    api.patch(`/api/connections/${id}/allow-writes`, { allow_writes }),
}

export const queryApi = {
  run: (connection_id: number, question: string) =>
    api.post('/api/query/', { connection_id, question }),
  preview: (connection_id: number, question: string) =>
    api.post('/api/query/preview', { connection_id, question }),
  confirm: (connection_id: number, question: string, sql: string) =>
    api.post('/api/query/confirm', { connection_id, question, sql }),
  history: (limit = 30) => api.get(`/api/query/history?limit=${limit}`),
  stats: () => api.get('/api/query/stats'),
}
