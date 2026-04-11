import type {
  CourseSourceType,
  CourseStatus,
  CourseType,
  EducationSystem,
  GradeStatus,
  TeachingPlanTermType,
} from '../types/teaching'

export const EDUCATION_SYSTEM_OPTIONS: Array<{ label: string; value: EducationSystem }> = [
  { label: '3年制', value: 'THREE_YEAR' },
  { label: '5年制', value: 'FIVE_YEAR' },
]

export const GRADE_STATUS_OPTIONS: Array<{ label: string; value: GradeStatus }> = [
  { label: '在读', value: 'ACTIVE' },
  { label: '已毕业', value: 'GRADUATED' },
]

export const COURSE_TYPE_OPTIONS: Array<{ label: string; value: CourseType }> = [
  { label: '公共课', value: 'PUBLIC' },
  { label: '专业课', value: 'MAJOR' },
]

export const COURSE_SOURCE_TYPE_OPTIONS: Array<{ label: string; value: CourseSourceType }> = [
  { label: '手工维护', value: 'MANUAL' },
  { label: '计划导入', value: 'PLAN_IMPORT' },
]

export const COURSE_STATUS_OPTIONS: Array<{ label: string; value: CourseStatus }> = [
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'DISABLED' },
]

export const TEACHING_PLAN_TERM_TYPE_OPTIONS: Array<{ label: string; value: TeachingPlanTermType }> = [
  { label: '校内教学', value: 'SCHOOL' },
  { label: '岗位实习', value: 'INTERNSHIP' },
]

export const getEducationSystemLabel = (value?: EducationSystem | string | null) =>
  EDUCATION_SYSTEM_OPTIONS.find((option) => option.value === value)?.label || '-'

export const getGradeStatusLabel = (value?: GradeStatus | string | null) =>
  GRADE_STATUS_OPTIONS.find((option) => option.value === value)?.label || '-'

export const getCourseTypeLabel = (value?: CourseType | string | null) =>
  COURSE_TYPE_OPTIONS.find((option) => option.value === value)?.label || '-'

export const getCourseSourceTypeLabel = (value?: CourseSourceType | string | null) =>
  COURSE_SOURCE_TYPE_OPTIONS.find((option) => option.value === value)?.label || '-'

export const getCourseStatusLabel = (value?: CourseStatus | string | null) =>
  COURSE_STATUS_OPTIONS.find((option) => option.value === value)?.label || '-'

export const getTeachingPlanTermTypeLabel = (value?: TeachingPlanTermType | string | null) =>
  TEACHING_PLAN_TERM_TYPE_OPTIONS.find((option) => option.value === value)?.label || '-'

export const isMajorCourse = (courseType?: CourseType | string | null) => courseType === 'MAJOR'

export const normalizeCoursePayload = <T extends { courseType: CourseType; majorId?: string | null }>(
  payload: T,
): T => ({
  ...payload,
  majorId: payload.courseType === 'PUBLIC' ? null : payload.majorId || null,
})

export const toGraduatedAtPayload = (date: string) => {
  if (!date) {
    return null
  }

  return new Date(`${date}T00:00:00+08:00`).toISOString()
}
