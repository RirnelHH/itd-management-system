import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TeachingPlansService } from '../src/teaching/teaching-plans.service';
import { createMockFn } from './helpers/prisma.mock';

function createPrismaMock() {
  return {
    grade: {
      findUnique: createMockFn(async () => ({ id: 'grade-1', name: '2023级' })),
    },
    course: {
      findUnique: createMockFn(async () => null),
    },
    teachingPlan: {
      findUnique: createMockFn(async () => ({ id: 'plan-1', gradeId: 'grade-1', name: '2023级教学计划' })),
    },
    teachingPlanRow: {
      create: createMockFn(async (args) => ({
        id: 'row-1',
        ...args.data,
      })),
      update: createMockFn(async (args) => ({
        id: args.where.id,
        ...args.data,
      })),
      findFirst: createMockFn(async () => ({
        id: 'row-1',
        teachingPlanId: 'plan-1',
      })),
      delete: createMockFn(async () => ({ id: 'row-1' })),
    },
  };
}

test('TeachingPlansService: 停用课程不能新增到教学计划', async () => {
  const prisma = createPrismaMock();
  const service = new TeachingPlansService(prisma as any);

  prisma.course.findUnique = createMockFn(async () => ({
    id: 'course-1',
    name: '数据库系统',
    status: 'DISABLED',
  }));

  await assert.rejects(
    service.createRow('plan-1', {
      courseId: 'course-1',
      termNo: 1,
      termType: 'SCHOOL',
      weeklyHoursRaw: '4',
    } as any),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '停用课程不能新增或修改到教学计划中');
      return true;
    },
  );
});

test('TeachingPlansService: 停用课程不能修改到教学计划', async () => {
  const prisma = createPrismaMock();
  const service = new TeachingPlansService(prisma as any);

  prisma.course.findUnique = createMockFn(async () => ({
    id: 'course-1',
    name: '数据库系统',
    status: 'DISABLED',
  }));

  await assert.rejects(
    service.updateRow('plan-1', 'row-1', {
      courseId: 'course-1',
      weeklyHoursValue: '4.5',
    } as any),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '停用课程不能新增或修改到教学计划中');
      return true;
    },
  );
});

test('TeachingPlansService: 新增教学计划行会回填课程名并转换周学时', async () => {
  const prisma = createPrismaMock();
  const service = new TeachingPlansService(prisma as any);

  prisma.course.findUnique = createMockFn(async () => ({
    id: 'course-1',
    name: 'Java 程序设计',
    status: 'ACTIVE',
  }));

  const result = await service.createRow('plan-1', {
    courseId: 'course-1',
    termNo: 2,
    termType: 'SCHOOL',
    weeklyHoursRaw: '4.5',
    weeklyHoursValue: '4.5',
  } as any);

  assert.equal(result.courseName, 'Java 程序设计');
  assert.ok(result.weeklyHoursValue instanceof Prisma.Decimal);
  assert.equal(prisma.teachingPlanRow.create.calls.length, 1);
});
