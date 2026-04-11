import { describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import {
  buildCourseQuery,
  buildGradeQuery,
  buildTeachingPlanDetailPath,
  buildTeachingPlanQuery,
  getCourseDeleteErrorMessage,
  getGradeStatusTagType,
  getMajorSaveErrorMessage,
  sanitizeCourseMajor,
  validateCourseMajor,
  validateGraduatedAt,
  validateMajorForm,
  validateTeachingPlanForm,
} from '../src/views/teaching/helpers'

describe('teaching page logic helpers', () => {
  it('hides course major relation when switching to public courses', () => {
    expect(sanitizeCourseMajor('PUBLIC', 'major_1')).toBe('')
    expect(sanitizeCourseMajor('MAJOR', 'major_1')).toBe('major_1')
  })

  it('requires a major selection for major courses only', () => {
    expect(validateCourseMajor('MAJOR', '')).toBe('专业课必须选择归属专业')
    expect(validateCourseMajor('MAJOR', 'major_1')).toBe('')
    expect(validateCourseMajor('PUBLIC', '')).toBe('')
  })

  it('builds course queries by removing empty filters', () => {
    expect(
      buildCourseQuery({
        majorId: '',
        courseType: '',
        status: '',
        keyword: '',
      })
    ).toEqual({
      majorId: undefined,
      courseType: undefined,
      status: undefined,
      keyword: undefined,
    })

    expect(
      buildCourseQuery({
        majorId: 'major_1',
        courseType: 'MAJOR',
        status: 'ACTIVE',
        keyword: 'Web',
      })
    ).toEqual({
      majorId: 'major_1',
      courseType: 'MAJOR',
      status: 'ACTIVE',
      keyword: 'Web',
    })
  })

  it('extracts backend business messages for course deletion failures', () => {
    const error = new AxiosError('Bad Request')
    error.response = {
      data: {
        message: '课程已被未毕业年级引用，不能删除，只能停用',
      },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {
        headers: {} as any,
      },
    }

    expect(getCourseDeleteErrorMessage(error)).toBe('课程已被未毕业年级引用，不能删除，只能停用')
    expect(getCourseDeleteErrorMessage(new Error('x'))).toBe('课程删除失败')
  })

  it('validates the major form for create and edit dialogs', () => {
    expect(validateMajorForm({ name: '', educationSystem: '' })).toEqual({
      name: '请输入专业名称',
      educationSystem: '请选择学制',
    })

    expect(validateMajorForm({ name: '软件技术', educationSystem: 'THREE_YEAR' })).toEqual({
      name: '',
      educationSystem: '',
    })
  })

  it('extracts major save fallback messages', () => {
    expect(getMajorSaveErrorMessage(new Error('x'))).toBe('专业保存失败')
  })

  it('builds grade queries by major and status filters', () => {
    expect(
      buildGradeQuery({
        majorId: 'major_1',
        status: 'GRADUATED',
        keyword: '2023',
      })
    ).toEqual({
      majorId: 'major_1',
      status: 'GRADUATED',
      keyword: '2023',
    })

    expect(getGradeStatusTagType('ACTIVE')).toBe('success')
    expect(getGradeStatusTagType('GRADUATED')).toBe('info')
  })

  it('requires graduated time only for graduated grades', () => {
    expect(validateGraduatedAt('GRADUATED', '')).toBe('已毕业年级必须填写毕业时间')
    expect(validateGraduatedAt('GRADUATED', '2026-07-01')).toBe('')
    expect(validateGraduatedAt('ACTIVE', '')).toBe('')
  })

  it('builds teaching plan detail paths and strips empty search filters', () => {
    expect(buildTeachingPlanDetailPath('plan_1')).toBe('/teaching/plans/plan_1')
    expect(
      buildTeachingPlanQuery({
        gradeId: '',
        keyword: '',
      })
    ).toEqual({
      gradeId: undefined,
      keyword: undefined,
    })
  })

  it('validates the teaching plan basic form fields', () => {
    expect(validateTeachingPlanForm({ name: '', gradeId: '' })).toEqual({
      name: '请输入教学计划名称',
      gradeId: '请选择所属年级',
    })

    expect(validateTeachingPlanForm({ name: '2026 软件技术教学计划', gradeId: 'grade_1' })).toEqual({
      name: '',
      gradeId: '',
    })
  })
})
