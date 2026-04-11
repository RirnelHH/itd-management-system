import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { MajorsService } from '../src/teaching/majors.service';
import { createMockFn } from './helpers/prisma.mock';

function createPrismaMock() {
  return {
    major: {
      create: createMockFn(async (args) => ({ id: 'major-1', ...args.data })),
      findUnique: createMockFn(async () => null),
      update: createMockFn(async (args) => ({ id: args.where.id, ...args.data })),
      delete: createMockFn(async () => ({ id: 'major-1' })),
    },
    grade: {
      count: createMockFn(async () => 0),
    },
    course: {
      count: createMockFn(async () => 0),
    },
  };
}

test('MajorsService: 专业名称必须唯一', async () => {
  const prisma = createPrismaMock();
  const service = new MajorsService(prisma as any);

  prisma.major.findUnique = createMockFn(async () => ({
    id: 'existing-major',
    name: '计算机应用技术',
  }));

  await assert.rejects(
    service.create({
      name: '计算机应用技术',
      educationSystem: 'THREE_YEAR',
    } as any),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '专业名称已存在');
      return true;
    },
  );
});

test('MajorsService: 存在关联年级或课程时不能删除专业', async () => {
  const prisma = createPrismaMock();
  const service = new MajorsService(prisma as any);

  prisma.major.findUnique = createMockFn(async () => ({
    id: 'major-1',
    name: '软件技术',
  }));
  prisma.grade.count = createMockFn(async () => 1);

  await assert.rejects(
    service.remove('major-1'),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, '专业存在关联的年级或课程，不能删除');
      return true;
    },
  );
});
