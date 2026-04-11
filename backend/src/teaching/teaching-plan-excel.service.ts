import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

type EducationSystem = 'THREE_YEAR' | 'FIVE_YEAR';
type TeachingPlanTermType = 'SCHOOL' | 'INTERNSHIP';

type TemplateColumnKey =
  | 'termNo'
  | 'termType'
  | 'courseId'
  | 'courseName'
  | 'courseType'
  | 'majorName'
  | 'weeklyHoursRaw'
  | 'teacherName'
  | 'remark'
  | 'sortOrder';

type ParsedImportRow = {
  termNo: number;
  termType: TeachingPlanTermType;
  courseId: string;
  courseName: string;
  weeklyHoursRaw: string;
  weeklyHoursValue: string | null;
  teacherName: string | null;
  remark: string | null;
  sortOrder: number;
};

const TEMPLATE_SHEET_NAME = '教学计划';
const TEMPLATE_VERSION = 'v1';
const HEADER_ROW_NO = 7;
const DATA_START_ROW_NO = 8;

const TEMPLATE_COLUMNS: Array<{ key: TemplateColumnKey; header: string; width: number; required?: boolean }> = [
  { key: 'termNo', header: '学期序号', width: 12, required: true },
  { key: 'termType', header: '学期类型', width: 14, required: true },
  { key: 'courseId', header: '课程ID', width: 40 },
  { key: 'courseName', header: '课程名称', width: 24, required: true },
  { key: 'courseType', header: '课程类型', width: 14 },
  { key: 'majorName', header: '归属专业', width: 20 },
  { key: 'weeklyHoursRaw', header: '周学时', width: 16, required: true },
  { key: 'teacherName', header: '任课教师', width: 16 },
  { key: 'remark', header: '备注', width: 24 },
  { key: 'sortOrder', header: '排序', width: 10 },
];

const TERM_TYPE_LABELS: Record<TeachingPlanTermType, string> = {
  SCHOOL: '在校',
  INTERNSHIP: '企业实习',
};

const COURSE_TYPE_LABELS: Record<string, string> = {
  PUBLIC: '公共课',
  MAJOR: '专业课',
};

const EDUCATION_SYSTEM_LABELS: Record<EducationSystem, string> = {
  FIVE_YEAR: '五年制',
  THREE_YEAR: '三年制',
};

const FIVE_YEAR_RULE = {
  maxTermNo: 10,
  schoolTermRange: [1, 8] as const,
  internshipTermRange: [9, 10] as const,
};

@Injectable()
export class TeachingPlanExcelService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(educationSystemInput?: string) {
    const educationSystem = this.normalizeEducationSystem(educationSystemInput);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME);

    this.setupTemplateSheet(sheet);

    sheet.getCell('A1').value = '教学计划 Excel 导入模板';
    sheet.getCell('A2').value = `模板版本：${TEMPLATE_VERSION}`;
    sheet.getCell('A3').value = '说明：请勿调整表头顺序，导入时会按整份计划覆盖现有计划行。';
    sheet.getCell('A4').value = `学制：${EDUCATION_SYSTEM_LABELS[educationSystem]}`;
    sheet.getCell('A5').value =
      educationSystem === 'FIVE_YEAR'
        ? '五年制规则：1-8 学期为在校，9-10 学期为企业实习。'
        : '三年制模板扩展位已预留，当前导入主链路优先保证五年制。';

    this.writeHeaderRow(sheet);
    this.writeTemplateExampleRows(sheet, educationSystem);

    return workbook.xlsx.writeBuffer();
  }

  async buildExportFile(planId: string) {
    const plan = await this.prisma.teachingPlan.findUnique({
      where: { id: planId },
      include: {
        grade: {
          include: { major: true },
        },
        rows: {
          include: {
            course: {
              include: { major: true },
            },
          },
          orderBy: [{ termNo: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('教学计划不存在');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME);
    this.setupTemplateSheet(sheet);

    const educationSystem = plan.grade.educationSystem as EducationSystem;
    sheet.getCell('A1').value = '教学计划导出';
    sheet.getCell('A2').value = `模板版本：${TEMPLATE_VERSION}`;
    sheet.getCell('A3').value = `教学计划：${plan.name}`;
    sheet.getCell('A4').value = `所属年级：${plan.grade.name}`;
    sheet.getCell('A5').value = `所属专业：${plan.grade.major.name}`;
    sheet.getCell('A6').value = `学制：${EDUCATION_SYSTEM_LABELS[educationSystem]}`;

    this.writeHeaderRow(sheet);

    plan.rows.forEach((row, index) => {
      const excelRow = sheet.getRow(DATA_START_ROW_NO + index);
      excelRow.getCell(1).value = row.termNo;
      excelRow.getCell(2).value = TERM_TYPE_LABELS[row.termType as TeachingPlanTermType];
      excelRow.getCell(3).value = row.courseId || '';
      excelRow.getCell(4).value = row.courseName;
      excelRow.getCell(5).value = row.course?.courseType ? COURSE_TYPE_LABELS[row.course.courseType] : '';
      excelRow.getCell(6).value = row.course?.major?.name || plan.grade.major.name || '';
      excelRow.getCell(7).value = row.weeklyHoursRaw;
      excelRow.getCell(8).value = row.teacherName || '';
      excelRow.getCell(9).value = row.remark || '';
      excelRow.getCell(10).value = row.sortOrder;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      fileName: this.buildFileName(`${plan.name}-教学计划导出.xlsx`),
    };
  }

  async importPlanRows(planId: string, file?: { buffer: Buffer; originalname: string }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传 Excel 文件');
    }

    const plan = await this.prisma.teachingPlan.findUnique({
      where: { id: planId },
      include: {
        grade: {
          include: { major: true },
        },
        rows: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('教学计划不存在');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const sheet = workbook.getWorksheet(TEMPLATE_SHEET_NAME) || workbook.worksheets[0];

    if (!sheet) {
      throw new BadRequestException('Excel 中未找到可解析的工作表');
    }

    this.validateHeaderRow(sheet);

    const allowedCourses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ courseType: 'PUBLIC' }, { majorId: plan.grade.majorId }],
      },
      include: { major: true },
      orderBy: [{ courseType: 'asc' }, { name: 'asc' }],
    });

    const parsedRows = this.parseDataRows(sheet, {
      educationSystem: plan.grade.educationSystem as EducationSystem,
      planMajorId: plan.grade.majorId,
      planMajorName: plan.grade.major.name,
      allowedCourses,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.teachingPlanRow.deleteMany({ where: { teachingPlanId: planId } });
      if (parsedRows.length) {
        await tx.teachingPlanRow.createMany({
          data: parsedRows.map((row) => ({
            teachingPlanId: planId,
            termNo: row.termNo,
            termType: row.termType,
            courseId: row.courseId,
            courseName: row.courseName,
            weeklyHoursRaw: row.weeklyHoursRaw,
            weeklyHoursValue: row.weeklyHoursValue ? new Prisma.Decimal(row.weeklyHoursValue) : null,
            teacherName: row.teacherName,
            remark: row.remark,
            sortOrder: row.sortOrder,
          })),
        });
      }
    });

    return {
      message: '教学计划 Excel 导入成功',
      importedRows: parsedRows.length,
      replacedRows: plan.rows.length,
      educationSystem: plan.grade.educationSystem,
      templateVersion: TEMPLATE_VERSION,
      fileName: file.originalname,
    };
  }

  private setupTemplateSheet(sheet: ExcelJS.Worksheet) {
    sheet.properties.defaultRowHeight = 22;
    TEMPLATE_COLUMNS.forEach((column, index) => {
      sheet.getColumn(index + 1).width = column.width;
    });
  }

  private writeHeaderRow(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(HEADER_ROW_NO);
    TEMPLATE_COLUMNS.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  private writeTemplateExampleRows(sheet: ExcelJS.Worksheet, educationSystem: EducationSystem) {
    const examples =
      educationSystem === 'FIVE_YEAR'
        ? [
            [1, '在校', '', '示例课程A', '公共课', '', '4', '张老师', '示例数据，导入前请删除或替换', 1],
            [9, '企业实习', '', '岗位实习', '专业课', '', '30节×18周', '', '五年制实习学期示例', 2],
          ]
        : [[1, '在校', '', '示例课程A', '公共课', '', '4', '张老师', '三年制模板扩展位', 1]];

    examples.forEach((values, index) => {
      const row = sheet.getRow(DATA_START_ROW_NO + index);
      values.forEach((value, valueIndex) => {
        row.getCell(valueIndex + 1).value = value;
      });
    });
  }

  private validateHeaderRow(sheet: ExcelJS.Worksheet) {
    const expectedHeaders = TEMPLATE_COLUMNS.map((item) => item.header);
    const actualHeaders = TEMPLATE_COLUMNS.map((_, index) => this.getCellText(sheet.getRow(HEADER_ROW_NO).getCell(index + 1)));

    const mismatched = expectedHeaders.filter((header, index) => header !== actualHeaders[index]);
    if (mismatched.length) {
      throw new BadRequestException(`模板表头不匹配，请先下载最新模板。期望表头：${expectedHeaders.join('、')}`);
    }
  }

  private parseDataRows(
    sheet: ExcelJS.Worksheet,
    context: {
      educationSystem: EducationSystem;
      planMajorId: string;
      planMajorName: string;
      allowedCourses: Array<{
        id: string;
        name: string;
        status: string;
        courseType: string;
        majorId: string | null;
        major?: { id: string; name: string } | null;
      }>;
    },
  ) {
    const errors: string[] = [];
    const parsedRows: ParsedImportRow[] = [];
    const lastRowNumber = Math.max(sheet.rowCount, DATA_START_ROW_NO - 1);

    for (let rowNumber = DATA_START_ROW_NO; rowNumber <= lastRowNumber; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const rawValues = this.readTemplateRow(row);
      if (this.isRowEmpty(rawValues)) {
        continue;
      }

      const rowErrors: string[] = [];
      const termNo = this.parseInteger(rawValues.termNo);
      const termType = this.parseTermType(rawValues.termType);
      const weeklyHoursRaw = rawValues.weeklyHoursRaw.trim();
      const sortOrder = this.parseInteger(rawValues.sortOrder) ?? parsedRows.length;

      if (!termNo) {
        rowErrors.push(`第 ${rowNumber} 行：学期序号不能为空，且必须为正整数`);
      }
      if (!termType) {
        rowErrors.push(`第 ${rowNumber} 行：学期类型仅支持 在校 / 企业实习`);
      }
      if (!rawValues.courseName.trim()) {
        rowErrors.push(`第 ${rowNumber} 行：课程名称不能为空`);
      }
      if (!weeklyHoursRaw) {
        rowErrors.push(`第 ${rowNumber} 行：周学时不能为空`);
      }

      if (termNo && termType) {
        const termRuleError = this.validateTermRule(context.educationSystem, termNo, termType);
        if (termRuleError) {
          rowErrors.push(`第 ${rowNumber} 行：${termRuleError}`);
        }
      }

      const course = this.resolveCourse(rawValues, context.allowedCourses, context.planMajorName);
      if ('error' in course) {
        rowErrors.push(`第 ${rowNumber} 行：${course.error}`);
      }

      if (rowErrors.length) {
        errors.push(...rowErrors);
        continue;
      }

      parsedRows.push({
        termNo: termNo as number,
        termType: termType as TeachingPlanTermType,
        courseId: (course as { id: string }).id,
        courseName: rawValues.courseName.trim(),
        weeklyHoursRaw,
        weeklyHoursValue: this.normalizeWeeklyHoursValue(weeklyHoursRaw),
        teacherName: rawValues.teacherName.trim() || null,
        remark: rawValues.remark.trim() || null,
        sortOrder,
      });
    }

    if (errors.length) {
      throw new BadRequestException(`Excel 导入校验失败：${errors.join('；')}`);
    }

    return parsedRows;
  }

  private resolveCourse(
    rawValues: Record<TemplateColumnKey, string>,
    allowedCourses: Array<{
      id: string;
      name: string;
      courseType: string;
      majorId: string | null;
      major?: { id: string; name: string } | null;
    }>,
    planMajorName: string,
  ) {
    const courseId = rawValues.courseId.trim();
    if (courseId) {
      const matchedById = allowedCourses.find((course) => course.id === courseId);
      if (!matchedById) {
        return { error: '课程ID不存在，或不属于当前教学计划可用课程范围' };
      }
      return matchedById;
    }

    const courseType = this.parseCourseType(rawValues.courseType);
    const majorName = rawValues.majorName.trim();
    const candidates = allowedCourses.filter((course) => {
      if (course.name !== rawValues.courseName.trim()) {
        return false;
      }
      if (courseType && course.courseType !== courseType) {
        return false;
      }
      if (majorName && course.courseType === 'MAJOR') {
        return course.major?.name === majorName;
      }
      return true;
    });

    if (!candidates.length) {
      const majorHint = majorName || planMajorName;
      return { error: `未找到课程“${rawValues.courseName.trim()}”，请先维护课程库或填写正确的课程ID（专业：${majorHint}）` };
    }
    if (candidates.length > 1) {
      return { error: `课程“${rawValues.courseName.trim()}”匹配到多条记录，请补充课程ID或课程类型` };
    }
    return candidates[0];
  }

  private readTemplateRow(row: ExcelJS.Row): Record<TemplateColumnKey, string> {
    return TEMPLATE_COLUMNS.reduce(
      (result, column, index) => {
        result[column.key] = this.getCellText(row.getCell(index + 1));
        return result;
      },
      {} as Record<TemplateColumnKey, string>,
    );
  }

  private isRowEmpty(values: Record<TemplateColumnKey, string>) {
    return Object.values(values).every((value) => !value.trim());
  }

  private getCellText(cell: ExcelJS.Cell) {
    const value = cell.value;
    if (value == null) {
      return '';
    }
    if (typeof value === 'object' && 'result' in value && value.result != null) {
      return String(value.result).trim();
    }
    if (typeof value === 'object' && 'text' in value && value.text != null) {
      return String(value.text).trim();
    }
    return String(value).trim();
  }

  private parseInteger(value: string) {
    if (!value.trim()) {
      return null;
    }
    if (!/^\d+$/.test(value.trim())) {
      return null;
    }
    return Number(value.trim());
  }

  private parseTermType(value: string): TeachingPlanTermType | null {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (['SCHOOL', '在校', '校内'].includes(normalized) || value.trim() === '在校' || value.trim() === '校内') {
      return 'SCHOOL';
    }
    if (
      ['INTERNSHIP', '企业实习', '实习'].includes(normalized) ||
      value.trim() === '企业实习' ||
      value.trim() === '实习'
    ) {
      return 'INTERNSHIP';
    }
    return null;
  }

  private parseCourseType(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (normalized === 'PUBLIC' || value.trim() === '公共课') {
      return 'PUBLIC';
    }
    if (normalized === 'MAJOR' || value.trim() === '专业课') {
      return 'MAJOR';
    }
    return null;
  }

  private normalizeWeeklyHoursValue(value: string) {
    const trimmed = value.trim();
    return /^(?:\d+)(?:\.\d{1,2})?$/.test(trimmed) ? trimmed : null;
  }

  private validateTermRule(educationSystem: EducationSystem, termNo: number, termType: TeachingPlanTermType) {
    if (educationSystem === 'FIVE_YEAR') {
      if (termNo < 1 || termNo > FIVE_YEAR_RULE.maxTermNo) {
        return '五年制学期序号必须在 1-10 之间';
      }
      if (termType === 'SCHOOL' && (termNo < FIVE_YEAR_RULE.schoolTermRange[0] || termNo > FIVE_YEAR_RULE.schoolTermRange[1])) {
        return '五年制在校学期必须在 1-8 学期';
      }
      if (
        termType === 'INTERNSHIP' &&
        (termNo < FIVE_YEAR_RULE.internshipTermRange[0] || termNo > FIVE_YEAR_RULE.internshipTermRange[1])
      ) {
        return '五年制企业实习学期必须在 9-10 学期';
      }
      return '';
    }

    // 三年制模板的列结构与主流程已预留；后续批次可在这里补充 1-4 在校、5-6 实习的严格校验。
    return '';
  }

  private normalizeEducationSystem(educationSystem?: string): EducationSystem {
    return educationSystem === 'THREE_YEAR' ? 'THREE_YEAR' : 'FIVE_YEAR';
  }

  private buildFileName(fileName: string) {
    return fileName.replace(/[\\/:*?"<>|]/g, '_');
  }
}
