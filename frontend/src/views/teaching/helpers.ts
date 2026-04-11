import type {
  CourseStatus,
  CourseQuery,
  CourseType,
  EducationSystem,
  GradeQuery,
  GradeStatus,
  TeachingPlanQuery,
} from '../../types/teaching'
import { extractErrorMessage } from '../../utils/api'
import { isMajorCourse } from '../../constants/teaching'

export const validateRequiredText = (value: string, message: string) => (value.trim() ? '' : message)

export const validateSelection = (value: string, message: string) => (value ? '' : message)

export const validateCourseMajor = (courseType: CourseType, majorId: string) => {
  if (isMajorCourse(courseType) && !majorId) {
    return '专业课必须选择归属专业'
  }

  return ''
}

export const sanitizeCourseMajor = (courseType: CourseType, majorId: string) =>
  (isMajorCourse(courseType) ? majorId : '')

export const getCourseDeleteErrorMessage = (error: unknown) => extractErrorMessage(error, '课程删除失败')

export const getCourseSaveErrorMessage = (error: unknown) => extractErrorMessage(error, '课程保存失败')

export const getMajorSaveErrorMessage = (error: unknown) => extractErrorMessage(error, '专业保存失败')

export const validateGraduatedAt = (status: GradeStatus, graduatedAt: string) => {
  if (status === 'GRADUATED' && !graduatedAt) {
    return '已毕业年级必须填写毕业时间'
  }

  return ''
}

export const buildGradeQuery = (filters: {
  majorId: string
  status: GradeStatus | ''
  keyword: string
}): GradeQuery => ({
  majorId: filters.majorId || undefined,
  status: filters.status || undefined,
  keyword: filters.keyword || undefined,
})

export const getGradeStatusTagType = (status: GradeStatus) => (status === 'GRADUATED' ? 'info' : 'success')

export const buildCourseQuery = (filters: {
  majorId: string
  courseType: CourseType | ''
  status: CourseStatus | ''
  keyword: string
}): CourseQuery => ({
  majorId: filters.majorId || undefined,
  courseType: filters.courseType || undefined,
  status: filters.status || undefined,
  keyword: filters.keyword || undefined,
})

export const buildTeachingPlanQuery = (filters: {
  gradeId: string
  keyword: string
}): TeachingPlanQuery => ({
  gradeId: filters.gradeId || undefined,
  keyword: filters.keyword || undefined,
})

export const buildTeachingPlanDetailPath = (id: string) => `/teaching/plans/${id}`

export const validateMajorForm = (form: { name: string; educationSystem: EducationSystem | '' }) => ({
  name: validateRequiredText(form.name, '请输入专业名称'),
  educationSystem: validateSelection(form.educationSystem, '请选择学制'),
})

export const validateTeachingPlanForm = (form: { name: string; gradeId: string }) => ({
  name: validateRequiredText(form.name, '请输入教学计划名称'),
  gradeId: validateSelection(form.gradeId, '请选择所属年级'),
})
