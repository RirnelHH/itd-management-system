import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { GradesService } from '../src/teaching/grades.service';
import { createMockFn } from './helpers/prisma.mock';

function createPrismaMock() {
  return {
    major: {
      findUnique: createMockFn(async () => ({ id: 'major-1', name: '软件技术' })),
    },
    grade: {
      create: createMockFn(async (args) => ({ id: 'grade-1', ...args.data })),
      findFirst: createMockFn(async () => null),
      findUnique: createMockFn(async () => ({
        id: 'grade-1',
        name: '2023级',
        majorId: 'major-1',
        status: 'ACTIVE',
        graduatedAt: null,
      })),
      update: createMockFn(async (args) => ({ id: args.where.id, ...args.data })),
      delete: createMockFn(async () => ({ id: 'grade-1' })),
    },
    teachingPlan: {
      count: createMockFn(async () => 0),
    },
  };
}

test('GradesService: 同一专业下年级名称必须唯一', async () => {
  const prisma = createPrismaMock();
  const service = new GradesService(prisma as any);

  prisma.grade.findFirst = createMockFn(async () => ({
    id: 'existing-grade',
    name: '2024级',
    majorId: 'major-1',
  }));

  await assert.rejects(
    service.create({
      name: '2024级',
      majorId: 'major-1',
      educationSystem: 'THREE_YEAR',
    } as any),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '同一专业下年级名称已存在');
      return true;
    },
  );
});

test('GradesService: 更新为已毕业状态时自动补毕业时间', async () => {
  const prisma = createPrismaMock();
  const service = new GradesService(prisma as any);

  const result = await service.update('grade-1', {
    status: 'GRADUATED',
  } as any);

  assert.equal(result.status, 'GRADUATED');
  assert.ok(result.graduatedAt instanceof Date);
});

test('GradesService: 存在教学计划的年级不能删除', async () => {
  const prisma = createPrismaMock();
  const service = new GradesService(prisma as any);

  prisma.teachingPlan.count = createMockFn(async () => 2);

  await assert.rejects(
    service.remove('grade-1'),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '年级已有关联教学计划，不能删除');
      return true;
    },
  );
});
