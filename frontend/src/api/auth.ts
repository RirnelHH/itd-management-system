import api from './client'
import type { UserInfo } from '../types/auth'

export type LoginResponse = {
  access_token: string
  user: UserInfo
}

export const loginRequest = async (username: string, password: string) => {
  const { data } = await api.post<LoginResponse>('/auth/login', { username, password })
  return data
}

export const registerRequest = async (userData: {
  username: string
  name: string
  email: string
  phone?: string
  password: string
  accountType: string
}) => {
  const { data } = await api.post('/auth/register', userData)
  return data
}

export const fetchProfileRequest = async () => {
  const { data } = await api.get<UserInfo>('/auth/profile')
  return data
}

export const updateProfileRequest = async (profile: {
  name: string
  email: string
  phone?: string
}) => {
  const { data } = await api.put<UserInfo>('/auth/profile', profile)
  return data
}

export const changePasswordRequest = async (oldPassword: string, newPassword: string) => {
  const { data } = await api.put('/auth/password', { oldPassword, newPassword })
  return data
}

export const fetchRegisterOptionsRequest = async () => {
  const { data } = await api.get<Array<{ value: string; label: string }>>('/auth/register-options')
  return data
}

export const forgotPasswordRequest = async (email: string) => {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export const resetPasswordRequest = async (payload: {
  email: string
  token: string
  newPassword: string
}) => {
  const { data } = await api.post('/auth/reset-password', payload)
  return data
}
