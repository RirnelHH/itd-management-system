import api from './client'
import type {
  Course,
  CoursePayload,
  CourseQuery,
  Grade,
  GradePayload,
  GradeQuery,
  Major,
  MajorPayload,
  MajorQuery,
  TeachingPlan,
  TeachingPlanPayload,
  TeachingPlanQuery,
} from '../types/teaching'

export const fetchMajorsRequest = async (params: MajorQuery = {}) => {
  const { data } = await api.get<Major[]>('/majors', { params })
  return data
}

export const createMajorRequest = async (payload: MajorPayload) => {
  const { data } = await api.post<Major>('/majors', payload)
  return data
}

export const updateMajorRequest = async (id: string, payload: Partial<MajorPayload>) => {
  const { data } = await api.patch<Major>(`/majors/${id}`, payload)
  return data
}

export const deleteMajorRequest = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/majors/${id}`)
  return data
}

export const fetchGradesRequest = async (params: GradeQuery = {}) => {
  const { data } = await api.get<Grade[]>('/grades', { params })
  return data
}

export const createGradeRequest = async (payload: GradePayload) => {
  const { data } = await api.post<Grade>('/grades', payload)
  return data
}

export const updateGradeRequest = async (id: string, payload: Partial<GradePayload>) => {
  const { data } = await api.patch<Grade>(`/grades/${id}`, payload)
  return data
}

export const deleteGradeRequest = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/grades/${id}`)
  return data
}

export const fetchCoursesRequest = async (params: CourseQuery = {}) => {
  const { data } = await api.get<Course[]>('/courses', { params })
  return data
}

export const createCourseRequest = async (payload: CoursePayload) => {
  const { data } = await api.post<Course>('/courses', payload)
  return data
}

export const updateCourseRequest = async (id: string, payload: Partial<CoursePayload>) => {
  const { data } = await api.patch<Course>(`/courses/${id}`, payload)
  return data
}

export const deleteCourseRequest = async (id: string) => {
  const { data } = await api.delete<{ message: string; deleteMode?: string }>(`/courses/${id}`)
  return data
}

export const fetchTeachingPlansRequest = async (params: TeachingPlanQuery = {}) => {
  const { data } = await api.get<TeachingPlan[]>('/teaching-plans', { params })
  return data
}

export const createTeachingPlanRequest = async (payload: TeachingPlanPayload) => {
  const { data } = await api.post<TeachingPlan>('/teaching-plans', payload)
  return data
}

export const updateTeachingPlanRequest = async (id: string, payload: Partial<TeachingPlanPayload>) => {
  const { data } = await api.patch<TeachingPlan>(`/teaching-plans/${id}`, payload)
  return data
}

export const deleteTeachingPlanRequest = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/teaching-plans/${id}`)
  return data
}
