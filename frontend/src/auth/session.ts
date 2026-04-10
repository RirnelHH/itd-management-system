import type { UserInfo } from '../types/auth'

export const TOKEN_KEY = 'token'
export const USER_INFO_KEY = 'userInfo'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const resolveStorage = (storage?: StorageLike): StorageLike | null => {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export const normalizeUserInfo = (raw: unknown): UserInfo | null => {
  if (!raw || typeof raw !== 'object') return null

  const user = raw as UserInfo

  return {
    ...user,
    accountType: user.accountType ?? user.account?.accountType,
    status: user.status ?? user.account?.status,
  }
}

export const readStoredToken = (storage?: StorageLike): string => {
  return resolveStorage(storage)?.getItem(TOKEN_KEY) || ''
}

export const readStoredUserInfo = (storage?: StorageLike): UserInfo | null => {
  const targetStorage = resolveStorage(storage)
  const raw = targetStorage?.getItem(USER_INFO_KEY)
  if (!raw) return null

  try {
    return normalizeUserInfo(JSON.parse(raw))
  } catch {
    targetStorage?.removeItem(USER_INFO_KEY)
    return null
  }
}

export const writeStoredToken = (token: string, storage?: StorageLike) => {
  const targetStorage = resolveStorage(storage)
  if (!targetStorage) return

  if (token) {
    targetStorage.setItem(TOKEN_KEY, token)
    return
  }

  targetStorage.removeItem(TOKEN_KEY)
}

export const writeStoredUserInfo = (userInfo: unknown, storage?: StorageLike) => {
  const targetStorage = resolveStorage(storage)
  if (!targetStorage) return null

  const normalized = normalizeUserInfo(userInfo)
  if (normalized) {
    targetStorage.setItem(USER_INFO_KEY, JSON.stringify(normalized))
    return normalized
  }

  targetStorage.removeItem(USER_INFO_KEY)
  return null
}

export const clearStoredSession = (storage?: StorageLike) => {
  const targetStorage = resolveStorage(storage)
  if (!targetStorage) return

  targetStorage.removeItem(TOKEN_KEY)
  targetStorage.removeItem(USER_INFO_KEY)
}
