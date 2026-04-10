import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/client'

const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'

type UserInfo = {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  accountType?: string
  status?: string
  phonePublic?: boolean
  emailPublic?: boolean
  account?: {
    accountType?: string
    status?: string
  }
}

const normalizeUserInfo = (raw: any): UserInfo | null => {
  if (!raw || typeof raw !== 'object') return null

  return {
    ...raw,
    accountType: raw.accountType ?? raw.account?.accountType,
    status: raw.status ?? raw.account?.status
  }
}

const readStoredUserInfo = (): UserInfo | null => {
  const raw = localStorage.getItem(USER_INFO_KEY)
  if (!raw) return null

  try {
    return normalizeUserInfo(JSON.parse(raw))
  } catch {
    localStorage.removeItem(USER_INFO_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const userInfo = ref<UserInfo | null>(readStoredUserInfo())
  const isInitialized = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.accountType === 'ADMIN')

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  const setUserInfo = (info: any) => {
    const normalized = normalizeUserInfo(info)
    userInfo.value = normalized

    if (normalized) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(normalized))
    } else {
      localStorage.removeItem(USER_INFO_KEY)
    }
  }

  const fetchUserInfo = async () => {
    if (!token.value) return null

    try {
      const { data } = await api.get('/auth/profile')
      setUserInfo(data)
      return userInfo.value
    } catch (error: any) {
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        logout()
      }
      throw error
    }
  }

  const initializeAuth = async () => {
    if (isInitialized.value) return

    if (token.value && !userInfo.value) {
      try {
        await fetchUserInfo()
      } catch {
        // 已在 fetchUserInfo 内按状态码处理
      }
    }

    isInitialized.value = true
  }

  const login = async (username: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { username, password })
      setToken(data.access_token)
      setUserInfo(data.user)
      isInitialized.value = true
      return data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '登录失败')
    }
  }

  const register = async (userData: {
    username: string
    name: string
    email: string
    phone?: string
    password: string
    accountType: string
  }) => {
    try {
      const { data } = await api.post('/auth/register', userData)
      return data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '注册失败')
    }
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    isInitialized.value = true
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await api.put('/auth/password', { oldPassword, newPassword })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '密码修改失败')
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    isInitialized,
    setToken,
    setUserInfo,
    initializeAuth,
    login,
    register,
    fetchUserInfo,
    logout,
    changePassword
  }
})
