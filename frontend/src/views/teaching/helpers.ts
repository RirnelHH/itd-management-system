import type {
  Course,
  CourseStatus,
  CourseQuery,
  CourseType,
  EducationSystem,
  GradeQuery,
  GradeStatus,
  TeachingPlanRow,
  TeachingPlanRowPayload,
  TeachingPlanQuery,
  TeachingPlanTermType,
} from '../../types/teaching'
import { extractErrorMessage } from '../../utils/api'
import { getTeachingPlanTermTypeLabel, isMajorCourse } from '../../constants/teaching'

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

export const formatTeachingPlanTermLabel = (termNo: number, termType: TeachingPlanTermType) =>
  `第${termNo}学期 · ${getTeachingPlanTermTypeLabel(termType)}`

export const buildTeachingPlanRowGroups = (rows: TeachingPlanRow[]) => {
  const groups = new Map<string, { key: string; termNo: number; termType: TeachingPlanTermType; title: string; rows: TeachingPlanRow[] }>()

  rows.forEach((row) => {
    const key = `${row.termType}-${row.termNo}`
    const current =
      groups.get(key) ||
      {
        key,
        termNo: row.termNo,
        termType: row.termType,
        title: formatTeachingPlanTermLabel(row.termNo, row.termType),
        rows: [],
      }

    current.rows.push(row)
    groups.set(key, current)
  })

  return Array.from(groups.values()).sort((left, right) => {
    if (left.termNo !== right.termNo) {
      return left.termNo - right.termNo
    }

    if (left.termType === right.termType) {
      return 0
    }

    return left.termType === 'SCHOOL' ? -1 : 1
  })
}

export const buildTeachingPlanTermSchema = (educationSystem?: EducationSystem | null) => {
  if (educationSystem === 'FIVE_YEAR') {
    return Array.from({ length: 10 }, (_, index) => {
      const termNo = index + 1
      const termType: TeachingPlanTermType = termNo <= 8 ? 'SCHOOL' : 'INTERNSHIP'
      return {
        key: `${termType}-${termNo}`,
        termNo,
        termType,
        title: formatTeachingPlanTermLabel(termNo, termType),
        slotCount: termType === 'SCHOOL' ? 9 : 1,
      }
    })
  }

  return Array.from({ length: 6 }, (_, index) => {
    const termNo = index + 1
    const termType: TeachingPlanTermType = termNo <= 4 ? 'SCHOOL' : 'INTERNSHIP'
    return {
      key: `${termType}-${termNo}`,
      termNo,
      termType,
      title: formatTeachingPlanTermLabel(termNo, termType),
      slotCount: termType === 'SCHOOL' ? 9 : 1,
    }
  })
}

export const isDisabledCourse = (course?: Course | null) => course?.status === 'DISABLED'

export const buildTeachingPlanSelectableCourses = (courses: Course[], majorId?: string | null) =>
  courses.filter((course) => course.courseType === 'PUBLIC' || course.majorId === majorId)

export const normalizeWeeklyHoursValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return /^(?:\d+)(?:\.\d{1,2})?$/.test(trimmed) ? trimmed : null
}

export const validateTeachingPlanRowForm = (form: {
  termNo: number | null
  termType: TeachingPlanTermType | ''
  courseId: string
}) => ({
  termNo: form.termNo && form.termNo > 0 ? '' : '请输入正确的学期序号',
  termType: validateSelection(form.termType, '请选择学期类型'),
  courseId: validateSelection(form.courseId, '请选择课程'),
})

export const createTeachingPlanRowPayload = (form: {
  termNo: number
  termType: TeachingPlanTermType
  courseId: string
  remark: string
  sortOrder: number
}): TeachingPlanRowPayload => ({
  termNo: form.termNo,
  termType: form.termType,
  courseId: form.courseId,
  remark: form.remark.trim() || null,
  sortOrder: form.sortOrder,
})

export const validateMajorForm = (form: { name: string; educationSystem: EducationSystem | '' }) => ({
  name: validateRequiredText(form.name, '请输入专业名称'),
  educationSystem: validateSelection(form.educationSystem, '请选择学制'),
})

export const validateTeachingPlanForm = (form: { name: string; gradeId: string }) => ({
  name: validateRequiredText(form.name, '请输入教学计划名称'),
  gradeId: validateSelection(form.gradeId, '请选择所属年级'),
})
