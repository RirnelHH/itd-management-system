import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '../types/auth'
import {
  clearStoredSession,
  readStoredToken,
  readStoredUserInfo,
  writeStoredToken,
  writeStoredUserInfo,
} from '../auth/session'
import {
  changePasswordRequest,
  fetchProfileRequest,
  loginRequest,
  registerRequest,
} from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(readStoredToken())
  const userInfo = ref<UserInfo | null>(readStoredUserInfo())
  const isInitialized = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.accountType === 'ADMIN')

  const setToken = (newToken: string) => {
    token.value = newToken
    writeStoredToken(newToken)
  }

  const setUserInfo = (info: unknown) => {
    userInfo.value = writeStoredUserInfo(info)
  }

  const fetchUserInfo = async () => {
    if (!token.value) return null

    try {
      setUserInfo(await fetchProfileRequest())
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
      const data = await loginRequest(username, password)
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
      return await registerRequest(userData)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '注册失败')
    }
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    isInitialized.value = true
    clearStoredSession()
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await changePasswordRequest(oldPassword, newPassword)
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
