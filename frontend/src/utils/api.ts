import axios from 'axios'

export const extractErrorMessage = (error: unknown, fallback = '请求失败') => {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const message = error.response?.data?.message

  if (Array.isArray(message)) {
    return message.join('；')
  }

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return fallback
}

export const isDialogCancel = (error: unknown) => error === 'cancel' || error === 'close'
