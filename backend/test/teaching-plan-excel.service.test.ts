import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { TeachingPlanExcelService } from '../src/teaching/teaching-plan-excel.service';
import { createMockFn } from './helpers/prisma.mock';

function createPrismaMock() {
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
          educationSystem: 'FIVE_YEAR',
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

async function createWorkbookBuffer(rows: Array<Array<string | number>>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('教学计划');

  sheet.getCell('A1').value = '教学计划 Excel 导入模板';
  sheet.getCell('A2').value = '模板版本：v1';
  sheet.getCell('A3').value = '说明';
  sheet.getCell('A4').value = '学制：五年制';
  sheet.getCell('A5').value = '规则说明';

  const headers = ['学期序号', '学期类型', '课程ID', '课程名称', '课程类型', '归属专业', '周学时', '任课教师', '备注', '排序'];
  headers.forEach((header, index) => {
    sheet.getRow(7).getCell(index + 1).value = header;
  });

  rows.forEach((values, rowIndex) => {
    values.forEach((value, valueIndex) => {
      sheet.getRow(8 + rowIndex).getCell(valueIndex + 1).value = value;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function ensureTemplateFile() {
  const templatePath = path.resolve(process.cwd(), 'resources', '实施性教学计划模板.xlsx');
  await mkdir(path.dirname(templatePath), { recursive: true });
  const buffer = await createWorkbookBuffer([]);
  await writeFile(templatePath, buffer);
  return async () => {
    await rm(templatePath, { force: true });
  };
}

test('TeachingPlanExcelService: 五年制非法实习学期会被阻断', async () => {
  const cleanup = await ensureTemplateFile();
  const prisma = createPrismaMock();
  const service = new TeachingPlanExcelService(prisma as any);
  const buffer = await createWorkbookBuffer([
    [8, '企业实习', 'course-major', '岗位实习', '专业课', '软件技术', '30节×18周', '', '', 1],
  ]);

  await assert.rejects(
    service.importPlanRows('plan-1', {
      buffer,
      originalname: 'invalid.xlsx',
    }),
    (error: any) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(error.message, /五年制企业实习学期必须在 9-10 学期/);
      return true;
    },
  );
  await cleanup();
});

test('TeachingPlanExcelService: 成功导入会替换原计划行', async () => {
  const cleanup = await ensureTemplateFile();
  const prisma = createPrismaMock();
  const service = new TeachingPlanExcelService(prisma as any);
  const buffer = await createWorkbookBuffer([
    [1, '在校', 'course-public', '思想道德与法治', '公共课', '', '4', '李老师', '', 1],
    [9, '企业实习', 'course-major', '岗位实习', '专业课', '软件技术', '30节×18周', '', '集中实习', 2],
  ]);

  const result = await service.importPlanRows('plan-1', {
    buffer,
    originalname: 'plan-import.xlsx',
  });

  assert.equal(result.importedRows, 2);
  assert.equal(result.replacedRows, 1);
  assert.equal(prisma.$transaction.calls.length, 1);
  assert.equal(prisma.teachingPlanRow.deleteMany.calls.length, 1);
  assert.equal(prisma.teachingPlanRow.createMany.calls.length, 1);
  assert.equal(prisma.teachingPlanRow.createMany.calls[0][0].data.length, 2);
  assert.equal(prisma.teachingPlanRow.createMany.calls[0][0].data[0].weeklyHoursRaw, '4.00');
  await cleanup();
});

test('TeachingPlanExcelService: 导出会生成 xlsx 缓冲和文件名', async () => {
  const cleanup = await ensureTemplateFile();
  const prisma = createPrismaMock();
  const service = new TeachingPlanExcelService(prisma as any);

  const result = await service.buildExportFile('plan-1');

  assert.ok(Buffer.from(result.buffer).length > 0);
  assert.match(result.fileName, /教学计划导出\.xlsx$/);
  await cleanup();
});
