import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { access } from 'node:fs/promises';
import * as path from 'node:path';
import { TeachingPlanExcelService } from '../src/teaching/teaching-plan-excel.service';
import { createMockFn } from './helpers/prisma.mock';

function createPrismaMock(educationSystem: 'THREE_YEAR' | 'FIVE_YEAR' = 'FIVE_YEAR') {
  const prisma = {
    teachingPlan: {
      findUnique: createMockFn(async () => ({
        id: 'plan-1',
        name: '2024级软件技术实施性教学计划',
        gradeId: 'grade-1',
        grade: {
          id: 'grade-1',
          name: '2024级',
          majorId: 'major-1',
          educationSystem,
          major: {
            id: 'major-1',
            name: '软件技术',
          },
        },
        rows: [
          {
            id: 'row-old-1',
            termNo: 1,
            termType: 'SCHOOL',
            courseId: 'course-public',
            courseName: '思想道德与法治',
            weeklyHoursRaw: '4',
            weeklyHoursValue: '4.00',
            remark: null,
            sortOrder: 0,
            createdAt: new Date('2026-04-01T00:00:00Z'),
            course: {
              id: 'course-public',
              name: '思想道德与法治',
              courseType: 'PUBLIC',
              weeklyHours: '4.00',
              major: null,
            },
          },
        ],
      })),
    },
    course: {
      findMany: createMockFn(async () => [
        {
          id: 'course-public',
          name: '思想道德与法治',
          courseType: 'PUBLIC',
          weeklyHours: '4.00',
          majorId: null,
          major: null,
        },
        {
          id: 'course-major',
          name: '岗位实习',
          courseType: 'MAJOR',
          weeklyHours: '30.00',
          majorId: 'major-1',
          major: {
            id: 'major-1',
            name: '软件技术',
          },
        },
      ]),
    },
    teachingPlanRow: {
      deleteMany: createMockFn(async () => ({ count: 1 })),
      createMany: createMockFn(async () => ({ count: 2 })),
    },
    $transaction: createMockFn(async (handler: (tx: any) => Promise<unknown>) => handler(prisma)),
  };

  return prisma;
}

async function createWorkbookBuffer(
  educationSystem: 'THREE_YEAR' | 'FIVE_YEAR',
  rows: Array<{
    termNo: number;
    courseName: string;
    weeklyHours: string;
    remark?: string;
    slot?: number;
  }>,
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(process.cwd(), 'resources', `课程实施计划${educationSystem === 'THREE_YEAR' ? '三年制' : '五年制'}.xlsx`));
  const sheet = workbook.worksheets[0];

  const schoolTermStartColumns = educationSystem === 'THREE_YEAR' ? [2, 6, 10, 14] : [2, 6, 10, 14, 18, 22, 26, 30];
  const internshipTermStartColumns = educationSystem === 'THREE_YEAR' ? [18, 20] : [34, 36];

  schoolTermStartColumns.forEach((startColumn) => {
    for (let rowNo = 6; rowNo <= 14; rowNo += 1) {
      sheet.getCell(rowNo, startColumn).value = null;
      sheet.getCell(rowNo, startColumn + 1).value = null;
      sheet.getCell(rowNo, startColumn + 3).value = null;
    }
    sheet.getCell(17, startColumn + 1).value = null;
  });

  internshipTermStartColumns.forEach((startColumn) => {
    sheet.getCell(6, startColumn).value = null;
    sheet.getCell(6, startColumn + 1).value = null;
    sheet.getCell(17, startColumn + 1).value = null;
  });

  rows.forEach((row) => {
    const isSchoolTerm = educationSystem === 'THREE_YEAR' ? row.termNo <= 4 : row.termNo <= 8;
    if (isSchoolTerm) {
      const courseColumn = schoolTermStartColumns[row.termNo - 1];
      const weeklyHoursColumn = courseColumn + 1;
      const remarkColumn = courseColumn + 3;
      const rowNo = 6 + ((row.slot ?? 1) - 1);
      sheet.getCell(rowNo, courseColumn).value = row.courseName;
      sheet.getCell(rowNo, weeklyHoursColumn).value = row.weeklyHours;
      sheet.getCell(rowNo, remarkColumn).value = row.remark || '';
      return;
    }

    const courseColumn = internshipTermStartColumns[row.termNo - (educationSystem === 'THREE_YEAR' ? 5 : 9)];
    sheet.getCell(6, courseColumn).value = row.courseName;
    sheet.getCell(6, courseColumn + 1).value = row.weeklyHours;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function ensureTemplateFiles() {
  await access(path.resolve(process.cwd(), 'resources', '课程实施计划三年制.xlsx'));
  await access(path.resolve(process.cwd(), 'resources', '课程实施计划五年制.xlsx'));
  return async () => undefined;
}

test('TeachingPlanExcelService: 模板周节数与课程库不一致会被阻断', async () => {
  const cleanup = await ensureTemplateFiles();
  const prisma = createPrismaMock('FIVE_YEAR');
  const service = new TeachingPlanExcelService(prisma as any);
  const buffer = await createWorkbookBuffer('FIVE_YEAR', [
    { termNo: 1, courseName: '思想道德与法治', weeklyHours: '6' },
  ]);

  await assert.rejects(
    service.importPlanRows('plan-1', {
      buffer,
      originalname: 'invalid.xlsx',
    }),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      const response = error.getResponse();
      const messages = Array.isArray(response?.message) ? response.message : [error.message];
      assert.match(messages[0], /导入失败，共发现 1 处问题/);
      assert.match(messages[1], /模板周节数为 6/);
      return true;
    },
  );
  await cleanup();
});

test('TeachingPlanExcelService: 模板学制不匹配会明确报错', async () => {
  const cleanup = await ensureTemplateFiles();
  const prisma = createPrismaMock('THREE_YEAR');
  const service = new TeachingPlanExcelService(prisma as any);
  const buffer = await createWorkbookBuffer('FIVE_YEAR', [
    { termNo: 1, courseName: '思想道德与法治', weeklyHours: '4' },
  ]);

  await assert.rejects(
    service.importPlanRows('plan-1', {
      buffer,
      originalname: 'wrong-template.xlsx',
    }),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(error.message, /模板不匹配/);
      assert.match(error.message, /课程实施计划三年制\.xlsx/);
      return true;
    },
  );
  await cleanup();
});

test('TeachingPlanExcelService: 成功导入会替换原计划行并返回模板信息', async () => {
  const cleanup = await ensureTemplateFiles();
  const prisma = createPrismaMock('FIVE_YEAR');
  const service = new TeachingPlanExcelService(prisma as any);
  const buffer = await createWorkbookBuffer('FIVE_YEAR', [
    { termNo: 1, courseName: '思想道德与法治', weeklyHours: '4', slot: 1 },
    { termNo: 9, courseName: '岗位实习', weeklyHours: '30节×18周' },
  ]);

  const result = await service.importPlanRows('plan-1', {
    buffer,
    originalname: 'plan-import.xlsx',
  });

  assert.equal(result.success, true);
  assert.equal(result.importedRows, 2);
  assert.equal(result.replacedRows, 1);
  assert.equal(result.templateFileName, '课程实施计划五年制.xlsx');
  assert.deepEqual(result.termSummaries, [
    { termNo: 1, termType: 'SCHOOL', title: '第一学期', rowCount: 1 },
    { termNo: 9, termType: 'INTERNSHIP', title: '第九学期', rowCount: 1 },
  ]);
  assert.equal(prisma.$transaction.calls.length, 1);
  assert.equal(prisma.teachingPlanRow.deleteMany.calls.length, 1);
  assert.equal(prisma.teachingPlanRow.createMany.calls.length, 1);
  assert.equal(prisma.teachingPlanRow.createMany.calls[0][0].data.length, 2);
  assert.equal(prisma.teachingPlanRow.createMany.calls[0][0].data[0].weeklyHoursRaw, '4.00');
  await cleanup();
});

test('TeachingPlanExcelService: 导出会使用对应学制模板文件名', async () => {
  const cleanup = await ensureTemplateFiles();
  const prisma = createPrismaMock('THREE_YEAR');
  const service = new TeachingPlanExcelService(prisma as any);

  const result = await service.buildExportFile('plan-1');

  assert.ok(Buffer.from(result.buffer).length > 0);
  assert.match(result.fileName, /课程实施计划三年制\.xlsx$/);
  await cleanup();
});
