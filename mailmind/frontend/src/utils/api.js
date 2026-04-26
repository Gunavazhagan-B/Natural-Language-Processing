import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
})

export const authApi = {
  getLoginUrl: () => api.get('/auth/login').then(r => r.data.auth_url),
  getStatus:   () => api.get('/auth/status').then(r => r.data),
  logout:      () => api.post('/auth/logout'),
}

export const emailsApi = {
  getDashboard:    () => api.get('/emails/dashboard').then(r => r.data),
  syncBlocking:    () => api.post('/emails/sync/blocking').then(r => r.data),
  syncBackground:  () => api.post('/emails/sync'),
}

export const tasksApi = {
  toggleDone: (emailId, taskIndex) =>
    api.post('/tasks/toggle', { email_id: emailId, task_index: taskIndex }).then(r => r.data),
}

export const chatApi = {
  ask: (question, history) =>
    api.post('/chat/', { question, history }).then(r => r.data),
}

export default api
