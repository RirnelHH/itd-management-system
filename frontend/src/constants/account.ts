type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

const ACCOUNT_TYPE_NAMES: Record<string, string> = {
  ADMIN: '管理员',
  DIRECTOR: '主任',
  VICE_DIRECTOR: '副主任',
  GROUP_LEADER: '教研组长',
  STUDENT_STAFF: '学生管理干事',
  TEACHER: '教师',
  STUDENT: '学生',
}

const ACCOUNT_TYPE_TAGS: Record<string, TagType> = {
  ADMIN: 'danger',
  DIRECTOR: 'warning',
  VICE_DIRECTOR: 'warning',
  GROUP_LEADER: 'success',
  STUDENT_STAFF: 'success',
  TEACHER: 'info',
  STUDENT: 'info',
}

const ACCOUNT_STATUS_NAMES: Record<string, string> = {
  PENDING_APPROVAL: '待审批',
  ACTIVE: '正常',
  DISABLED: '禁用',
}

const ACCOUNT_STATUS_TAGS: Record<string, TagType> = {
  PENDING_APPROVAL: 'warning',
  ACTIVE: 'success',
  DISABLED: 'danger',
}

export const getAccountTypeName = (type: string) => ACCOUNT_TYPE_NAMES[type] || type

export const getAccountTypeTag = (type: string): TagType => ACCOUNT_TYPE_TAGS[type] || 'info'

export const getStatusName = (status: string) => ACCOUNT_STATUS_NAMES[status] || status

export const getStatusTag = (status: string): TagType => ACCOUNT_STATUS_TAGS[status] || 'info'
