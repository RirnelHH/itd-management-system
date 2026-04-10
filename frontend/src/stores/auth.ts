import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
})

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<any>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.accountType === 'ADMIN')

  // 设置 Token
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  // 设置用户信息
  const setUserInfo = (info: any) => {
    userInfo.value = info
  }

  // 登录
  const login = async (username: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { username, password })
      setToken(data.access_token)
      setUserInfo(data.user)
      return data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '登录失败')
    }
  }

  // 注册
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

  // 获取用户信息
  const fetchUserInfo = async () => {
    if (!token.value) return
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    try {
      const { data } = await api.get('/auth/profile')
      setUserInfo(data)
    } catch (error) {
      logout()
    }
  }

  // 登出
  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  // 修改密码
  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await api.put('/auth/password', { oldPassword, newPassword })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '密码修改失败')
    }
  }

  // 初始化 - 恢复登录状态
  if (token.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    setToken,
    setUserInfo,
    login,
    register,
    fetchUserInfo,
    logout,
    changePassword
  }
})
