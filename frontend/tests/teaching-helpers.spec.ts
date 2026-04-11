import { describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import { extractErrorMessage } from '../src/utils/api'
import {
  isMajorCourse,
  normalizeCoursePayload,
  toGraduatedAtPayload,
} from '../src/constants/teaching'
import {
  buildTeachingPlanRowGroups,
  createTeachingPlanRowPayload,
  isDisabledCourse,
  normalizeWeeklyHoursValue,
} from '../src/views/teaching/helpers'

describe('teaching helpers', () => {
  it('normalizes public courses to remove major relation', () => {
    expect(
      normalizeCoursePayload({
        name: '高等数学',
        courseType: 'PUBLIC',
        majorId: 'major_1',
      })
    ).toMatchObject({
      courseType: 'PUBLIC',
      majorId: null,
    })

    expect(
      normalizeCoursePayload({
        name: 'Web 前端开发',
        courseType: 'MAJOR',
        majorId: 'major_2',
      })
    ).toMatchObject({
      courseType: 'MAJOR',
      majorId: 'major_2',
    })
  })

  it('detects when a course requires major selection', () => {
    expect(isMajorCourse('MAJOR')).toBe(true)
    expect(isMajorCourse('PUBLIC')).toBe(false)
  })

  it('converts graduated date to backend ISO payload', () => {
    expect(toGraduatedAtPayload('2026-07-01')).toBe('2026-06-30T16:00:00.000Z')
    expect(toGraduatedAtPayload('')).toBeNull()
  })

  it('extracts backend business messages from axios errors', () => {
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

    expect(extractErrorMessage(error, 'fallback')).toBe('课程已被未毕业年级引用，不能删除，只能停用')
    expect(extractErrorMessage(new Error('x'), 'fallback')).toBe('fallback')
  })

  it('groups teaching plan rows by term and keeps school rows first within the same term number', () => {
    const groups = buildTeachingPlanRowGroups([
      {
        id: 'row-3',
        teachingPlanId: 'plan-1',
        termNo: 2,
        termType: 'INTERNSHIP',
        courseId: 'course-3',
        courseName: '企业实践',
        weeklyHoursRaw: '20',
        weeklyHoursValue: '20',
        remark: null,
        sortOrder: 1,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'row-1',
        teachingPlanId: 'plan-1',
        termNo: 1,
        termType: 'SCHOOL',
        courseId: 'course-1',
        courseName: '高等数学',
        weeklyHoursRaw: '4',
        weeklyHoursValue: '4',
        remark: null,
        sortOrder: 1,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'row-2',
        teachingPlanId: 'plan-1',
        termNo: 2,
        termType: 'SCHOOL',
        courseId: 'course-2',
        courseName: 'Java 程序设计',
        weeklyHoursRaw: '5',
        weeklyHoursValue: '5',
        remark: null,
        sortOrder: 1,
        createdAt: '',
        updatedAt: '',
      },
    ])

    expect(groups.map((group) => group.key)).toEqual(['SCHOOL-1', 'SCHOOL-2', 'INTERNSHIP-2'])
    expect(groups[1]?.title).toBe('第2学期 · 校内教学')
  })

  it('normalizes teaching plan row payload and trims optional text fields', () => {
    expect(normalizeWeeklyHoursValue('4.5')).toBe('4.5')
    expect(normalizeWeeklyHoursValue('4学时')).toBeNull()

    expect(
      createTeachingPlanRowPayload({
        termNo: 1,
        termType: 'SCHOOL',
        courseId: 'course-1',
        remark: ' 重点课程 ',
        sortOrder: 2,
      })
    ).toMatchObject({
      remark: '重点课程',
    })
  })

  it('marks disabled courses for front-end restrictions', () => {
    expect(isDisabledCourse({ status: 'DISABLED' } as any)).toBe(true)
    expect(isDisabledCourse({ status: 'ACTIVE' } as any)).toBe(false)
  })
})
