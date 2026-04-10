// 账号类型常量（替代 Prisma enum）
export const ACCOUNT_TYPES = ['ADMIN', 'DIRECTOR', 'VICE_DIRECTOR', 'GROUP_LEADER', 'STUDENT_STAFF', 'TEACHER'] as const

export type AccountType = typeof ACCOUNT_TYPES[number]

// 账号状态常量
export const ACCOUNT_STATUSES = ['PENDING_APPROVAL', 'ACTIVE', 'DISABLED'] as const

export type AccountStatus = typeof ACCOUNT_STATUSES[number]

// 有效的账号类型列表
export const ACCOUNT_TYPE_LIST = ACCOUNT_TYPES

// 有效的账号状态列表
export const ACCOUNT_STATUS_LIST = ACCOUNT_STATUSES
