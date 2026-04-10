import { describe, expect, it } from 'vitest'
import {
  USER_INFO_KEY,
  clearStoredSession,
  normalizeUserInfo,
  readStoredToken,
  readStoredUserInfo,
  writeStoredToken,
  writeStoredUserInfo,
} from '../src/auth/session'

const createStorage = () => {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
  }
}

describe('auth session helpers', () => {
  it('normalizes account fields from nested profile payloads', () => {
    expect(
      normalizeUserInfo({
        id: 'u_1',
        username: 'admin',
        name: 'Admin',
        account: {
          accountType: 'ADMIN',
          status: 'ACTIVE',
        },
        phonePublic: true,
      })
    ).toMatchObject({
      id: 'u_1',
      accountType: 'ADMIN',
      status: 'ACTIVE',
      phonePublic: true,
    })
  })

  it('writes and reads token and normalized user data', () => {
    const storage = createStorage()

    writeStoredToken('jwt-token', storage)
    writeStoredUserInfo(
      {
        id: 'u_2',
        username: 'teacher',
        name: 'Teacher',
        account: {
          accountType: 'TEACHER',
          status: 'ACTIVE',
        },
      },
      storage
    )

    expect(readStoredToken(storage)).toBe('jwt-token')
    expect(readStoredUserInfo(storage)).toMatchObject({
      id: 'u_2',
      accountType: 'TEACHER',
      status: 'ACTIVE',
    })
  })

  it('clears invalid cached user payloads and session data', () => {
    const storage = createStorage()

    storage.setItem(USER_INFO_KEY, '{bad json')
    expect(readStoredUserInfo(storage)).toBeNull()

    writeStoredToken('jwt-token', storage)
    writeStoredUserInfo(
      {
        id: 'u_3',
        username: 'contact-user',
        name: 'Contact User',
        accountType: 'STUDENT',
        status: 'PENDING_APPROVAL',
      },
      storage
    )

    clearStoredSession(storage)

    expect(readStoredToken(storage)).toBe('')
    expect(readStoredUserInfo(storage)).toBeNull()
  })
})
