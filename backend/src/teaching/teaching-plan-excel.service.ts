import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { access, readFile } from 'node:fs/promises';
import * as path from 'node:path';
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
  | 'remark'
  | 'sortOrder';

type ParsedImportRow = {
  termNo: number;
  termType: TeachingPlanTermType;
  courseId: string;
  courseName: string;
  weeklyHoursRaw: string;
  weeklyHoursValue: Prisma.Decimal | null;
  remark: string | null;
  sortOrder: number;
};

type TemplateContext = {
  worksheet: ExcelJS.Worksheet;
  headerRowNo: number;
  columns: Partial<Record<TemplateColumnKey, number>>;
};

const TEMPLATE_FILE_NAME = '实施性教学计划模板.xlsx';
const TEMPLATE_FILE_PATH = path.resolve(process.cwd(), 'resources', TEMPLATE_FILE_NAME);

const TERM_TYPE_LABELS: Record<TeachingPlanTermType, string> = {
  SCHOOL: '在校',
  INTERNSHIP: '企业实习',
};

const COURSE_TYPE_LABELS: Record<string, string> = {
  PUBLIC: '公共课',
  MAJOR: '专业课',
};

const FIVE_YEAR_RULE = {
  maxTermNo: 10,
  schoolTermRange: [1, 8] as const,
  internshipTermRange: [9, 10] as const,
};

const TEMPLATE_HEADER_ALIASES: Record<TemplateColumnKey, string[]> = {
  termNo: ['学期序号', '学期号', '学期', '学年学期'],
  termType: ['学期类型', '教学形式', '学期性质'],
  courseId: ['课程ID', '课程 Id', '课程编号', '课程代码'],
  courseName: ['课程名称', '课程名'],
  courseType: ['课程类型', '课程类别'],
  majorName: ['归属专业', '所属专业', '适用专业', '专业'],
  weeklyHoursRaw: ['周学时', '周课时'],
  remark: ['备注', '说明'],
  sortOrder: ['排序', '序号'],
};

@Injectable()
export class TeachingPlanExcelService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer() {
    return this.readTemplateFileBuffer();
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
    await workbook.xlsx.load(await this.readTemplateFileBuffer() as any);
    const template = this.locateTemplateContext(workbook);

    this.fillPlanRows(template, plan.rows, plan.grade.major.name);

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
    const template = this.locateTemplateContext(workbook);

    const allowedCourses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ courseType: 'PUBLIC' }, { majorId: plan.grade.majorId }],
      },
      include: { major: true },
      orderBy: [{ courseType: 'asc' }, { name: 'asc' }],
    });

    const parsedRows = this.parseDataRows(template, {
      educationSystem: plan.grade.educationSystem as EducationSystem,
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
            weeklyHoursValue: row.weeklyHoursValue,
            remark: row.remark,
            sortOrder: row.sortOrder,
          })),
        });
      }
    });

    return {
      message: `教学计划导入成功，共导入 ${parsedRows.length} 行，替换原有 ${plan.rows.length} 行`,
      importedRows: parsedRows.length,
      replacedRows: plan.rows.length,
      educationSystem: plan.grade.educationSystem,
      templateVersion: TEMPLATE_FILE_NAME,
      fileName: file.originalname,
    };
  }

  private async readTemplateFileBuffer() {
    try {
      await access(TEMPLATE_FILE_PATH);
      return await readFile(TEMPLATE_FILE_PATH);
    } catch {
      throw new InternalServerErrorException(
        `模板文件不存在，请将原始模板放到 ${TEMPLATE_FILE_PATH}`,
      );
    }
  }

  private locateTemplateContext(workbook: ExcelJS.Workbook): TemplateContext {
    for (const worksheet of workbook.worksheets) {
      for (let rowNo = 1; rowNo <= Math.min(worksheet.rowCount, 40); rowNo += 1) {
        const columns = this.matchHeaderColumns(worksheet.getRow(rowNo));
        if (columns.courseName && columns.termNo) {
          return {
            worksheet,
            headerRowNo: rowNo,
            columns,
          };
        }
      }
    }

    throw new BadRequestException(
      '模板不匹配：未识别到“学期/课程名称”等表头，请使用 backend/resources/实施性教学计划模板.xlsx 原模板',
    );
  }

  private matchHeaderColumns(row: ExcelJS.Row) {
    const columns: Partial<Record<TemplateColumnKey, number>> = {};

    for (let columnNo = 1; columnNo <= row.cellCount; columnNo += 1) {
      const text = this.normalizeHeader(this.getCellText(row.getCell(columnNo)));
      if (!text) {
        continue;
      }

      for (const [key, aliases] of Object.entries(TEMPLATE_HEADER_ALIASES) as Array<[TemplateColumnKey, string[]]>) {
        if (aliases.some((alias) => text === this.normalizeHeader(alias))) {
          columns[key] = columnNo;
        }
      }
    }

    return columns;
  }

  private fillPlanRows(template: TemplateContext, rows: Array<any>, fallbackMajorName: string) {
    const { worksheet, headerRowNo, columns } = template;
    const dataStartRowNo = headerRowNo + 1;
    const clearToRowNo = Math.max(worksheet.rowCount, dataStartRowNo + rows.length + 20);

    for (let rowNo = dataStartRowNo; rowNo <= clearToRowNo; rowNo += 1) {
      this.clearMappedCells(worksheet.getRow(rowNo), columns);
    }

    rows.forEach((row, index) => {
      const excelRow = worksheet.getRow(dataStartRowNo + index);
      this.writeMappedCell(excelRow, columns.termNo, row.termNo);
      this.writeMappedCell(excelRow, columns.termType, TERM_TYPE_LABELS[row.termType as TeachingPlanTermType]);
      this.writeMappedCell(excelRow, columns.courseId, row.courseId || '');
      this.writeMappedCell(excelRow, columns.courseName, row.courseName);
      this.writeMappedCell(
        excelRow,
        columns.courseType,
        row.course?.courseType ? COURSE_TYPE_LABELS[row.course.courseType] : '',
      );
      this.writeMappedCell(excelRow, columns.majorName, row.course?.major?.name || fallbackMajorName || '');
      this.writeMappedCell(excelRow, columns.weeklyHoursRaw, row.weeklyHoursRaw || '');
      this.writeMappedCell(excelRow, columns.remark, row.remark || '');
      this.writeMappedCell(excelRow, columns.sortOrder, row.sortOrder);
    });
  }

  private parseDataRows(
    template: TemplateContext,
    context: {
      educationSystem: EducationSystem;
      planMajorName: string;
      allowedCourses: Array<{
        id: string;
        name: string;
        status: string;
        courseType: string;
        weeklyHours: Prisma.Decimal | null;
        majorId: string | null;
        major?: { id: string; name: string } | null;
      }>;
    },
  ) {
    const { worksheet, headerRowNo, columns } = template;
    const errors: string[] = [];
    const parsedRows: ParsedImportRow[] = [];
    const dataStartRowNo = headerRowNo + 1;
    const lastRowNumber = Math.max(worksheet.rowCount, dataStartRowNo - 1);

    for (let rowNumber = dataStartRowNo; rowNumber <= lastRowNumber; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const rawValues = this.readTemplateRow(row, columns);
      if (this.isRowEmpty(rawValues)) {
        continue;
      }

      const rowErrors: string[] = [];
      const termNo = this.parseInteger(rawValues.termNo);
      const termType = this.parseTermType(rawValues.termType) || (termNo ? this.inferTermType(context.educationSystem, termNo) : null);
      const sortOrder = this.parseInteger(rawValues.sortOrder) ?? parsedRows.length;

      if (!termNo) {
        rowErrors.push(`第 ${rowNumber} 行：学期序号不能为空，且必须为正整数`);
      }
      if (!rawValues.courseName.trim()) {
        rowErrors.push(`第 ${rowNumber} 行：课程名称不能为空`);
      }
      if (!termType) {
        rowErrors.push(`第 ${rowNumber} 行：无法识别学期类型，请补充学期类型列或使用可推断的学期范围`);
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

      if (!('error' in course) && course.weeklyHours == null) {
        rowErrors.push(`第 ${rowNumber} 行：课程“${course.name}”未维护周课时，无法自动带出`);
      }

      if (rowErrors.length) {
        errors.push(...rowErrors);
        continue;
      }

      const weeklyHours = this.buildWeeklyHoursSnapshot((course as { weeklyHours: Prisma.Decimal }).weeklyHours);
      parsedRows.push({
        termNo: termNo as number,
        termType: termType as TeachingPlanTermType,
        courseId: (course as { id: string }).id,
        courseName: rawValues.courseName.trim(),
        weeklyHoursRaw: weeklyHours.raw,
        weeklyHoursValue: weeklyHours.value,
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
      weeklyHours: Prisma.Decimal | null;
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

  private readTemplateRow(
    row: ExcelJS.Row,
    columns: Partial<Record<TemplateColumnKey, number>>,
  ): Record<TemplateColumnKey, string> {
    return {
      termNo: this.readMappedCell(row, columns.termNo),
      termType: this.readMappedCell(row, columns.termType),
      courseId: this.readMappedCell(row, columns.courseId),
      courseName: this.readMappedCell(row, columns.courseName),
      courseType: this.readMappedCell(row, columns.courseType),
      majorName: this.readMappedCell(row, columns.majorName),
      weeklyHoursRaw: this.readMappedCell(row, columns.weeklyHoursRaw),
      remark: this.readMappedCell(row, columns.remark),
      sortOrder: this.readMappedCell(row, columns.sortOrder),
    };
  }

  private readMappedCell(row: ExcelJS.Row, columnNo?: number) {
    if (!columnNo) {
      return '';
    }

    return this.getCellText(row.getCell(columnNo));
  }

  private writeMappedCell(row: ExcelJS.Row, columnNo: number | undefined, value: string | number) {
    if (!columnNo) {
      return;
    }
    row.getCell(columnNo).value = value;
  }

  private clearMappedCells(row: ExcelJS.Row, columns: Partial<Record<TemplateColumnKey, number>>) {
    Object.values(columns).forEach((columnNo) => {
      if (columnNo) {
        row.getCell(columnNo).value = null;
      }
    });
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

  private normalizeHeader(value: string) {
    return value.replace(/\s+/g, '').replace(/[：:]/g, '').trim().toUpperCase();
  }

  private parseInteger(value: string) {
    if (!value.trim()) {
      return null;
    }
    const matched = value.trim().match(/\d+/);
    if (!matched) {
      return null;
    }
    return Number(matched[0]);
  }

  private parseTermType(value: string): TeachingPlanTermType | null {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (['SCHOOL', '在校', '校内', '校内教学'].includes(normalized) || ['在校', '校内', '校内教学'].includes(value.trim())) {
      return 'SCHOOL';
    }
    if (
      ['INTERNSHIP', '企业实习', '实习', '岗位实习'].includes(normalized) ||
      ['企业实习', '实习', '岗位实习'].includes(value.trim())
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

  private inferTermType(educationSystem: EducationSystem, termNo: number): TeachingPlanTermType | null {
    if (educationSystem !== 'FIVE_YEAR') {
      return 'SCHOOL';
    }

    if (termNo >= FIVE_YEAR_RULE.schoolTermRange[0] && termNo <= FIVE_YEAR_RULE.schoolTermRange[1]) {
      return 'SCHOOL';
    }
    if (termNo >= FIVE_YEAR_RULE.internshipTermRange[0] && termNo <= FIVE_YEAR_RULE.internshipTermRange[1]) {
      return 'INTERNSHIP';
    }
    return null;
  }

  private buildWeeklyHoursSnapshot(value?: Prisma.Decimal | string | number | null) {
    if (value == null || value === '') {
      return {
        raw: '',
        value: null,
      };
    }

    const normalized = typeof value === 'string' ? value : value.toString();
    return {
      raw: normalized,
      value: new Prisma.Decimal(normalized),
    };
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
    }

    return '';
  }

  private buildFileName(fileName: string) {
    return fileName.replace(/[\\/:*?"<>|]/g, '_');
  }
}
