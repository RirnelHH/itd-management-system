import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CoursesService } from '../src/teaching/courses.service';
import { createMockFn } from './helpers/prisma.mock';

function createPrismaMock() {
  return {
    course: {
      create: createMockFn(async (args) => ({ id: 'course-1', ...args.data })),
      findFirst: createMockFn(async () => null),
      findMany: createMockFn(async () => []),
      findUnique: createMockFn(async () => null),
      update: createMockFn(async (args) => ({ id: args.where.id, ...args.data })),
      delete: createMockFn(async () => ({ id: 'deleted-course' })),
    },
    major: {
      findUnique: createMockFn(async () => ({ id: 'major-1', name: 'Software Engineering' })),
    },
    teachingPlanRow: {
      findMany: createMockFn(async () => []),
      updateMany: createMockFn(async () => ({ count: 0 })),
    },
    $transaction: createMockFn(async (operations) => Promise.all(operations)),
  };
}

test('CoursesService: 公共课名称在公共课范围内必须唯一', async () => {
  const prisma = createPrismaMock();
  const service = new CoursesService(prisma as any);

  prisma.course.findFirst = createMockFn(async () => ({
    id: 'existing-public-course',
    name: '大学英语',
    courseType: 'PUBLIC',
  }));

  await assert.rejects(
    service.create({
      name: '大学英语',
      courseType: 'PUBLIC',
    } as any),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '公共课“大学英语”已存在，不能重复创建或保存');
      return true;
    },
  );
});

test('CoursesService: 专业课名称在同一专业下必须唯一', async () => {
  const prisma = createPrismaMock();
  const service = new CoursesService(prisma as any);

  prisma.course.findFirst = createMockFn(async () => ({
    id: 'existing-major-course',
    name: '数据结构',
    courseType: 'MAJOR',
    majorId: 'major-1',
  }));

  await assert.rejects(
    service.create({
      name: '数据结构',
      courseType: 'MAJOR',
      majorId: 'major-1',
    } as any),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '该专业下课程“数据结构”已存在，不能重复创建或保存');
      return true;
    },
  );
});

test('CoursesService: 创建课程时写入周课时', async () => {
  const prisma = createPrismaMock();
  const service = new CoursesService(prisma as any);

  const result = await service.create({
    name: '程序设计基础',
    courseType: 'PUBLIC',
    weeklyHours: '4.50',
  } as any);

  assert.equal(result.name, '程序设计基础');
  assert.ok(result.weeklyHours instanceof Prisma.Decimal);
  assert.equal(result.weeklyHours.toString(), '4.5');
});

test('CoursesService: 专业课必须绑定专业', async () => {
  const prisma = createPrismaMock();
  const service = new CoursesService(prisma as any);

  await assert.rejects(
    service.create({
      name: '操作系统',
      courseType: 'MAJOR',
    } as any),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '专业课必须指定归属专业');
      return true;
    },
  );
});

test('CoursesService: 公共课不能绑定专业', async () => {
  const prisma = createPrismaMock();
  const service = new CoursesService(prisma as any);

  await assert.rejects(
    service.create({
      name: '职业规划',
      courseType: 'PUBLIC',
      majorId: 'major-1',
    } as any),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '公共课不能指定归属专业');
      return true;
    },
  );
});

test('CoursesService: 未被引用的课程可直接删除', async () => {
  const prisma = createPrismaMock();
  const service = new CoursesService(prisma as any);

  prisma.course.findUnique = createMockFn(async () => ({
    id: 'course-1',
    name: '高等数学',
    status: 'ACTIVE',
  }));

  const result = await service.remove('course-1');

  assert.deepEqual(result, {
    message: '课程删除成功',
    deleteMode: 'DIRECT',
  });
  assert.equal(prisma.course.delete.calls.length, 1);
  assert.equal(prisma.$transaction.calls.length, 0);
});

test('CoursesService: 仅被已毕业年级引用的课程可解除引用后删除', async () => {
  const prisma = createPrismaMock();
  const service = new CoursesService(prisma as any);

  prisma.course.findUnique = createMockFn(async () => ({
    id: 'course-1',
    name: '专业综合实训',
    status: 'ACTIVE',
  }));
  prisma.teachingPlanRow.findMany = createMockFn(async () => [
    {
      id: 'row-1',
      teachingPlan: {
        grade: {
          id: 'grade-1',
          status: 'GRADUATED',
        },
      },
    },
  ]);

  const result = await service.remove('course-1');

  assert.deepEqual(result, {
    message: '课程仅被已毕业年级引用，已解除引用并删除',
    deleteMode: 'GRADUATED_REFERENCES_ONLY',
    courseName: '专业综合实训',
  });
  assert.equal(prisma.teachingPlanRow.updateMany.calls.length, 1);
  assert.equal(prisma.course.delete.calls.length, 1);
  assert.equal(prisma.$transaction.calls.length, 1);
});

test('CoursesService: 被未毕业年级引用的课程禁止删除', async () => {
  const prisma = createPrismaMock();
  const service = new CoursesService(prisma as any);

  prisma.course.findUnique = createMockFn(async () => ({
    id: 'course-1',
    name: '数据库原理',
    status: 'ACTIVE',
  }));
  prisma.teachingPlanRow.findMany = createMockFn(async () => [
    {
      id: 'row-1',
      teachingPlan: {
        grade: {
          id: 'grade-1',
          status: 'ACTIVE',
        },
      },
    },
  ]);

  await assert.rejects(
    service.remove('course-1'),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '课程已被未毕业年级引用，不能删除，只能停用');
      return true;
    },
  );

  assert.equal(prisma.course.delete.calls.length, 0);
  assert.equal(prisma.teachingPlanRow.updateMany.calls.length, 0);
  assert.equal(prisma.$transaction.calls.length, 0);
});
