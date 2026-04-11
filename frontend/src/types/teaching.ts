export type EducationSystem = 'THREE_YEAR' | 'FIVE_YEAR'
export type GradeStatus = 'ACTIVE' | 'GRADUATED'
export type CourseType = 'PUBLIC' | 'MAJOR'
export type CourseSourceType = 'MANUAL' | 'PLAN_IMPORT'
export type CourseStatus = 'ACTIVE' | 'DISABLED'
export type TeachingPlanTermType = 'SCHOOL' | 'INTERNSHIP'

export interface Major {
  id: string
  name: string
  educationSystem: EducationSystem
  createdAt: string
  updatedAt: string
  _count?: {
    grades: number
    courses: number
  }
}

export interface Grade {
  id: string
  name: string
  majorId: string
  educationSystem: EducationSystem
  status: GradeStatus
  graduatedAt: string | null
  createdAt: string
  updatedAt: string
  major?: Major
  _count?: {
    teachingPlans: number
  }
}

export interface Course {
  id: string
  name: string
  weeklyHours: string | null
  courseType: CourseType
  sourceType: CourseSourceType
  status: CourseStatus
  majorId: string | null
  createdAt: string
  updatedAt: string
  major?: Major | null
  _count?: {
    teachingPlanRows: number
  }
}

export interface TeachingPlan {
  id: string
  name: string
  gradeId: string
  createdAt: string
  updatedAt: string
  grade?: Grade
  _count?: {
    rows: number
  }
}

export interface TeachingPlanRow {
  id: string
  teachingPlanId: string
  termNo: number
  termType: TeachingPlanTermType
  courseId: string | null
  courseName: string
  weeklyHoursRaw: string
  weeklyHoursValue: string | null
  teacherName: string | null
  remark: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  course?: Course | null
}

export interface TeachingPlanDetail extends TeachingPlan {
  rows: TeachingPlanRow[]
}

export interface MajorQuery {
  keyword?: string
  educationSystem?: EducationSystem | ''
}

export interface GradeQuery {
  keyword?: string
  majorId?: string
  status?: GradeStatus | ''
}

export interface CourseQuery {
  keyword?: string
  majorId?: string
  courseType?: CourseType | ''
  status?: CourseStatus | ''
}

export interface TeachingPlanQuery {
  keyword?: string
  gradeId?: string
}

export interface MajorPayload {
  name: string
  educationSystem: EducationSystem
}

export interface GradePayload {
  name: string
  majorId: string
  educationSystem: EducationSystem
  status?: GradeStatus
  graduatedAt?: string | null
}

export interface CoursePayload {
  name: string
  weeklyHours?: string | null
  courseType: CourseType
  sourceType?: CourseSourceType
  status?: CourseStatus
  majorId?: string | null
}

export interface TeachingPlanPayload {
  name: string
  gradeId: string
}

export interface TeachingPlanRowPayload {
  termNo: number
  termType: TeachingPlanTermType
  courseId: string
  courseName?: string
  weeklyHoursRaw: string
  weeklyHoursValue?: string | null
  teacherName?: string | null
  remark?: string | null
  sortOrder?: number
}

export interface TeachingPlanExcelImportResult {
  message: string
  importedRows: number
  replacedRows: number
  educationSystem: EducationSystem
  templateVersion: string
  fileName: string
}
