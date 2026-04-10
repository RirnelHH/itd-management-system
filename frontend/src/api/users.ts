import api from './client'

export const fetchUsersRequest = async (params: Record<string, unknown>) => {
  const { data } = await api.get('/users', { params })
  return data
}

export const createUserRequest = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/users', payload)
  return data
}

export const updateUserRequest = async (id: string, payload: Record<string, unknown>) => {
  const { data } = await api.put(`/users/${id}`, payload)
  return data
}

export const approveUserRequest = async (id: string) => {
  const { data } = await api.put(`/users/${id}/approve`)
  return data
}

export const updateUserStatusRequest = async (id: string, status: string) => {
  const { data } = await api.put(`/users/${id}/status`, { status })
  return data
}

export const deleteUserRequest = async (id: string) => {
  const { data } = await api.delete(`/users/${id}`)
  return data
}

export const updateMyPrivacyRequest = async (payload: {
  phonePublic: boolean
  emailPublic: boolean
}) => {
  const { data } = await api.put('/users/me/privacy', payload)
  return data
}

export const fetchPublicUsersRequest = async (params: Record<string, unknown>) => {
  const { data } = await api.get('/users/public', { params })
  return data
}
