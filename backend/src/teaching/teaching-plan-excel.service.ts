import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { access, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

type EducationSystem = 'THREE_YEAR' | 'FIVE_YEAR';
type TeachingPlanTermType = 'SCHOOL' | 'INTERNSHIP';

type TemplateTermLayout = {
  termNo: number;
  termType: TeachingPlanTermType;
  title: string;
  courseColumn: number;
  weeklyHoursColumn: number;
  remarkColumn?: number;
  rowSlots: number[];
  totalRow: number;
};

type TemplateLayout = {
  worksheetName: string;
  titleCell: string;
  majorColumn: number;
  majorRows: number[];
  terms: TemplateTermLayout[];
};

type ParsedImportRow = {
  termNo: number;
  termType: TeachingPlanTermType;
  termTitle: string;
  courseId: string;
  courseName: string;
  weeklyHoursRaw: string;
  weeklyHoursValue: Prisma.Decimal | null;
  remark: string | null;
  sortOrder: number;
};

const EDUCATION_SYSTEM_LABELS: Record<EducationSystem, string> = {
  THREE_YEAR: '三年制',
  FIVE_YEAR: '五年制',
};

const TEMPLATE_FILE_NAMES: Record<EducationSystem, string> = {
  THREE_YEAR: '课程实施计划三年制.xlsx',
  FIVE_YEAR: '课程实施计划五年制.xlsx',
};

const TERM_RULES: Record<
  EducationSystem,
  {
    maxTermNo: number;
    schoolTermRange: readonly [number, number];
    internshipTermRange: readonly [number, number];
  }
> = {
  THREE_YEAR: {
    maxTermNo: 6,
    schoolTermRange: [1, 4],
    internshipTermRange: [5, 6],
  },
  FIVE_YEAR: {
    maxTermNo: 10,
    schoolTermRange: [1, 8],
    internshipTermRange: [9, 10],
  },
};

const SCHOOL_DATA_ROWS = [6, 7, 8, 9, 10, 11, 12, 13, 14];
const MAJOR_NAME_ROWS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const TEMPLATE_ROW_COUNT = 17;

const TEMPLATE_LAYOUTS: Record<EducationSystem, TemplateLayout> = {
  THREE_YEAR: {
    worksheetName: '25（最终版本）',
    titleCell: 'A2',
    majorColumn: 1,
    majorRows: MAJOR_NAME_ROWS,
    terms: [
      { termNo: 1, termType: 'SCHOOL', title: '第一学期', courseColumn: 2, weeklyHoursColumn: 3, remarkColumn: 5, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 2, termType: 'SCHOOL', title: '第二学期', courseColumn: 6, weeklyHoursColumn: 7, remarkColumn: 9, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 3, termType: 'SCHOOL', title: '第三学期', courseColumn: 10, weeklyHoursColumn: 11, remarkColumn: 13, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 4, termType: 'SCHOOL', title: '第四学期', courseColumn: 14, weeklyHoursColumn: 15, remarkColumn: 17, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 5, termType: 'INTERNSHIP', title: '第五学期', courseColumn: 18, weeklyHoursColumn: 19, rowSlots: [6], totalRow: 17 },
      { termNo: 6, termType: 'INTERNSHIP', title: '第六学期', courseColumn: 20, weeklyHoursColumn: 21, rowSlots: [6], totalRow: 17 },
    ],
  },
  FIVE_YEAR: {
    worksheetName: '25（最终版本）',
    titleCell: 'A2',
    majorColumn: 1,
    majorRows: MAJOR_NAME_ROWS,
    terms: [
      { termNo: 1, termType: 'SCHOOL', title: '第一学期', courseColumn: 2, weeklyHoursColumn: 3, remarkColumn: 5, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 2, termType: 'SCHOOL', title: '第二学期', courseColumn: 6, weeklyHoursColumn: 7, remarkColumn: 9, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 3, termType: 'SCHOOL', title: '第三学期', courseColumn: 10, weeklyHoursColumn: 11, remarkColumn: 13, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 4, termType: 'SCHOOL', title: '第四学期', courseColumn: 14, weeklyHoursColumn: 15, remarkColumn: 17, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 5, termType: 'SCHOOL', title: '第五学期', courseColumn: 18, weeklyHoursColumn: 19, remarkColumn: 21, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 6, termType: 'SCHOOL', title: '第六学期', courseColumn: 22, weeklyHoursColumn: 23, remarkColumn: 25, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 7, termType: 'SCHOOL', title: '第七学期', courseColumn: 26, weeklyHoursColumn: 27, remarkColumn: 29, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 8, termType: 'SCHOOL', title: '第八学期', courseColumn: 30, weeklyHoursColumn: 31, remarkColumn: 33, rowSlots: SCHOOL_DATA_ROWS, totalRow: 17 },
      { termNo: 9, termType: 'INTERNSHIP', title: '第九学期', courseColumn: 34, weeklyHoursColumn: 35, rowSlots: [6], totalRow: 17 },
      { termNo: 10, termType: 'INTERNSHIP', title: '第十学期', courseColumn: 36, weeklyHoursColumn: 37, rowSlots: [6], totalRow: 17 },
    ],
  },
};

@Injectable()
export class TeachingPlanExcelService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(educationSystem: EducationSystem = 'FIVE_YEAR') {
    return this.readTemplateFileBuffer(educationSystem);
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

    const educationSystem = plan.grade.educationSystem as EducationSystem;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await this.readTemplateFileBuffer(educationSystem)) as any);
    const layout = this.ensureTemplateLayout(workbook, educationSystem);

    this.fillPlanToTemplate(layout, {
      majorName: plan.grade.major.name,
      gradeName: plan.grade.name,
      rows: plan.rows,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      fileName: this.buildFileName(`${plan.name}-${TEMPLATE_FILE_NAMES[educationSystem]}`),
      templateFileName: TEMPLATE_FILE_NAMES[educationSystem],
    };
  }

  async importPlanRows(planId: string, file?: { buffer?: Buffer; originalname: string }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('导入失败：请上传 Excel 文件');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('导入失败：仅支持 .xlsx 格式的教学计划模板文件');
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

    const educationSystem = plan.grade.educationSystem as EducationSystem;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const layout = this.ensureTemplateLayout(workbook, educationSystem);

    const allowedCourses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ courseType: 'PUBLIC' }, { majorId: plan.grade.majorId }],
      },
      include: { major: true },
      orderBy: [{ courseType: 'asc' }, { name: 'asc' }],
    });

    const parsedRows = this.parseTemplateRows(layout, {
      educationSystem,
      planMajorName: plan.grade.major.name,
      allowedCourses,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.teachingPlanRow.deleteMany({ where: { teachingPlanId: planId } });
      if (parsedRows.length > 0) {
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

    const termSummaries = this.buildImportTermSummaries(parsedRows);

    return {
      success: true,
      message: `教学计划导入成功，已按${TEMPLATE_FILE_NAMES[educationSystem]}模板写入 ${parsedRows.length} 行，并替换原有 ${plan.rows.length} 行`,
      importedRows: parsedRows.length,
      replacedRows: plan.rows.length,
      termSummaries,
      educationSystem,
      templateFileName: TEMPLATE_FILE_NAMES[educationSystem],
      fileName: file.originalname,
    };
  }

  private getTemplateFilePath(educationSystem: EducationSystem) {
    return path.resolve(process.cwd(), 'resources', TEMPLATE_FILE_NAMES[educationSystem]);
  }

  private async readTemplateFileBuffer(educationSystem: EducationSystem) {
    const templateFilePath = this.getTemplateFilePath(educationSystem);

    try {
      await access(templateFilePath);
      return await readFile(templateFilePath);
    } catch {
      throw new InternalServerErrorException(
        `模板资源缺失：请将 ${TEMPLATE_FILE_NAMES[educationSystem]} 放到 ${templateFilePath}`,
      );
    }
  }

  private ensureTemplateLayout(workbook: ExcelJS.Workbook, expectedEducationSystem: EducationSystem) {
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException(`模板不匹配：未找到工作表，请使用 ${TEMPLATE_FILE_NAMES[expectedEducationSystem]}`);
    }

    const detectedEducationSystem = this.detectEducationSystem(worksheet);
    if (detectedEducationSystem && detectedEducationSystem !== expectedEducationSystem) {
      throw new BadRequestException(
        `模板不匹配：当前教学计划为${EDUCATION_SYSTEM_LABELS[expectedEducationSystem]}，请使用 ${TEMPLATE_FILE_NAMES[expectedEducationSystem]}`,
      );
    }

    const layout = TEMPLATE_LAYOUTS[expectedEducationSystem];
    this.assertTemplateShape(worksheet, layout, expectedEducationSystem);
    return { worksheet, layout };
  }

  private detectEducationSystem(worksheet: ExcelJS.Worksheet): EducationSystem | null {
    const headerTexts = Array.from({ length: Math.max(worksheet.columnCount, 1) }, (_, index) =>
      this.getCellText(worksheet.getCell(4, index + 1)),
    ).join(' ');

    if (headerTexts.includes('第十学期') || worksheet.columnCount >= 37) {
      return 'FIVE_YEAR';
    }
    if (worksheet.columnCount >= 21) {
      return 'THREE_YEAR';
    }
    return null;
  }

  private assertTemplateShape(
    worksheet: ExcelJS.Worksheet,
    layout: TemplateLayout,
    educationSystem: EducationSystem,
  ) {
    if (worksheet.rowCount < TEMPLATE_ROW_COUNT) {
      throw new BadRequestException(
        `模板不匹配：行数不足，请使用 ${TEMPLATE_FILE_NAMES[educationSystem]}`,
      );
    }

    for (const term of layout.terms) {
      const header4 = this.getCellText(worksheet.getCell(4, term.courseColumn));
      const header5 = this.getCellText(worksheet.getCell(5, term.courseColumn));
      const weeklyHeader = this.getCellText(worksheet.getCell(5, term.weeklyHoursColumn));

      if (header4 !== term.title || header5 !== '计划课程' || weeklyHeader !== '周节数') {
        throw new BadRequestException(
          `模板不匹配：未识别到 ${term.title} 的固定表格位置，请使用 ${TEMPLATE_FILE_NAMES[educationSystem]}`,
        );
      }
    }
  }

  private fillPlanToTemplate(
    context: { worksheet: ExcelJS.Worksheet; layout: TemplateLayout },
    payload: { majorName: string; gradeName: string; rows: Array<any> },
  ) {
    const { worksheet, layout } = context;
    const groupedRows = new Map<string, Array<any>>();

    payload.rows.forEach((row) => {
      const key = this.buildTermKey(row.termNo, row.termType as TeachingPlanTermType);
      const list = groupedRows.get(key) || [];
      list.push(row);
      groupedRows.set(key, list);
    });

    this.writeTitle(worksheet, layout.titleCell, payload.majorName, payload.gradeName);
    this.writeMajorNameColumn(worksheet, layout, payload.majorName);

    for (const term of layout.terms) {
      const rows = (groupedRows.get(this.buildTermKey(term.termNo, term.termType)) || []).sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return String(left.createdAt || '').localeCompare(String(right.createdAt || ''));
      });

      if (rows.length > term.rowSlots.length) {
        throw new BadRequestException(
          `导出失败：${term.title} 最多只能容纳 ${term.rowSlots.length} 门课程，当前有 ${rows.length} 门`,
        );
      }

      this.clearTermCells(worksheet, term);

      rows.forEach((row, index) => {
        const targetRowNo = term.rowSlots[index];
        const weeklyHours = row.course?.weeklyHours ?? row.weeklyHoursValue ?? row.weeklyHoursRaw ?? '';
        worksheet.getCell(targetRowNo, term.courseColumn).value = row.course?.name || row.courseName || '';
        worksheet.getCell(targetRowNo, term.weeklyHoursColumn).value = weeklyHours ? String(weeklyHours) : '';
        if (term.remarkColumn) {
          worksheet.getCell(targetRowNo, term.remarkColumn).value = row.remark || '';
        }
      });

      worksheet.getCell(term.totalRow, term.weeklyHoursColumn).value = this.sumTermWeeklyHours(worksheet, term);
    }
  }

  private parseTemplateRows(
    context: { worksheet: ExcelJS.Worksheet; layout: TemplateLayout },
    options: {
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
    const { worksheet, layout } = context;
    const errors: string[] = [];
    const parsedRows: ParsedImportRow[] = [];

    for (const term of layout.terms) {
      term.rowSlots.forEach((rowNo, index) => {
        const cellLabel = this.describeTemplateSlot(term, rowNo, index);
        const courseName = this.getCellText(worksheet.getCell(rowNo, term.courseColumn));
        const weeklyHoursRaw = this.getCellText(worksheet.getCell(rowNo, term.weeklyHoursColumn));
        const remark = term.remarkColumn ? this.getCellText(worksheet.getCell(rowNo, term.remarkColumn)) : '';

        if (!courseName && !weeklyHoursRaw && !remark) {
          return;
        }

        const rowErrors: string[] = [];
        const termRuleError = this.validateTermRule(options.educationSystem, term.termNo, term.termType);
        if (termRuleError) {
          rowErrors.push(`${cellLabel}：${termRuleError}`);
        }

        if (!courseName) {
          rowErrors.push(`${cellLabel}：课程名称为空，请填写课程库中的课程名称`);
        }

        const course = courseName
          ? this.resolveCourseByTemplateName(courseName, options.allowedCourses, options.planMajorName)
          : { error: '课程名称不能为空' };

        if ('error' in course) {
          rowErrors.push(`${cellLabel}：${course.error}`);
        }

        if (!('error' in course) && course.weeklyHours == null) {
          rowErrors.push(`${cellLabel}：课程“${course.name}”未维护周课时，无法自动带出`);
        }

        if (!('error' in course) && !weeklyHoursRaw.trim()) {
          rowErrors.push(`${cellLabel}：周节数为空，请保持与课程库周课时一致`);
        }

        if (!('error' in course) && weeklyHoursRaw.trim()) {
          const normalizedTemplateHours = this.normalizeWeeklyHours(weeklyHoursRaw);
          const normalizedCourseHours = this.normalizeWeeklyHours(course.weeklyHours?.toString() || '');
          if (!normalizedTemplateHours) {
            rowErrors.push(`${cellLabel}：周节数格式无法识别，请填写数字或“30节×18周”这类可提取数字的格式`);
          } else if (!normalizedCourseHours || normalizedTemplateHours !== normalizedCourseHours) {
            rowErrors.push(
              `${cellLabel}：模板周节数为 ${weeklyHoursRaw}，但课程库“${course.name}”周课时为 ${course.weeklyHours?.toString() || '-'}，请先修正课程主数据或模板内容`,
            );
          }
        }

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          return;
        }

        const weeklyHours = this.buildWeeklyHoursSnapshot((course as { weeklyHours: Prisma.Decimal }).weeklyHours);
        parsedRows.push({
          termNo: term.termNo,
          termType: term.termType,
          termTitle: term.title,
          courseId: (course as { id: string }).id,
          courseName: (course as { name: string }).name,
          weeklyHoursRaw: weeklyHours.raw,
          weeklyHoursValue: weeklyHours.value,
          remark: remark.trim() || null,
          sortOrder: index,
        });
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException(this.buildImportErrorMessages(errors));
    }

    return parsedRows;
  }

  private resolveCourseByTemplateName(
    courseName: string,
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
    const normalizedCourseName = courseName.trim();
    const candidates = allowedCourses.filter((course) => course.name === normalizedCourseName);

    if (candidates.length === 0) {
      return { error: `未找到课程“${normalizedCourseName}”，请先维护课程库（当前计划专业：${planMajorName}）` };
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    const narrowed = candidates.filter((course) => course.courseType === 'PUBLIC' || course.major?.name === planMajorName);
    if (narrowed.length === 1) {
      return narrowed[0];
    }

    return { error: `课程“${normalizedCourseName}”匹配到多条启用课程，请先整理课程库名称` };
  }

  private describeTemplateSlot(term: TemplateTermLayout, rowNo: number, slotIndex: number) {
    const slotLabel = term.termType === 'INTERNSHIP' ? '实习栏位' : `第 ${slotIndex + 1} 槽位`;
    return `${term.title}${slotLabel}（模板第 ${rowNo} 行）`;
  }

  private buildImportErrorMessages(errors: string[]) {
    const visibleErrors = errors.slice(0, 8);
    const remainingCount = errors.length - visibleErrors.length;

    return [
      `导入失败，共发现 ${errors.length} 处问题，请按提示修正模板后重试`,
      ...visibleErrors.map((error, index) => `${index + 1}. ${error}`),
      ...(remainingCount > 0 ? [`其余 ${remainingCount} 处问题未展开，请继续检查同类模板单元格`] : []),
    ];
  }

  private buildImportTermSummaries(rows: ParsedImportRow[]) {
    const summaryMap = new Map<string, { termNo: number; termType: TeachingPlanTermType; title: string; rowCount: number }>();

    rows.forEach((row) => {
      const key = this.buildTermKey(row.termNo, row.termType);
      const current =
        summaryMap.get(key) || {
          termNo: row.termNo,
          termType: row.termType,
          title: row.termTitle,
          rowCount: 0,
        };

      current.rowCount += 1;
      summaryMap.set(key, current);
    });

    return Array.from(summaryMap.values()).sort((left, right) => left.termNo - right.termNo);
  }

  private writeTitle(worksheet: ExcelJS.Worksheet, cellAddress: string, majorName: string, gradeName: string) {
    worksheet.getCell(cellAddress).value = `${majorName}${gradeName}实施性教学计划安排表`;
  }

  private writeMajorNameColumn(worksheet: ExcelJS.Worksheet, layout: TemplateLayout, majorName: string) {
    layout.majorRows.forEach((rowNo) => {
      worksheet.getCell(rowNo, layout.majorColumn).value = majorName;
    });
  }

  private clearTermCells(worksheet: ExcelJS.Worksheet, term: TemplateTermLayout) {
    term.rowSlots.forEach((rowNo) => {
      worksheet.getCell(rowNo, term.courseColumn).value = null;
      worksheet.getCell(rowNo, term.weeklyHoursColumn).value = null;
      if (term.remarkColumn) {
        worksheet.getCell(rowNo, term.remarkColumn).value = null;
      }
    });
    worksheet.getCell(term.totalRow, term.weeklyHoursColumn).value = null;
  }

  private sumTermWeeklyHours(worksheet: ExcelJS.Worksheet, term: TemplateTermLayout) {
    let total = 0;
    let hasNumericValue = false;

    for (const rowNo of term.rowSlots) {
      const normalized = this.normalizeWeeklyHours(this.getCellText(worksheet.getCell(rowNo, term.weeklyHoursColumn)));
      if (!normalized) {
        continue;
      }
      total += Number(normalized);
      hasNumericValue = true;
    }

    return hasNumericValue ? total : '';
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

  private buildTermKey(termNo: number, termType: TeachingPlanTermType) {
    return `${termType}-${termNo}`;
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

  private normalizeWeeklyHours(value: string) {
    const matched = value.trim().match(/\d+(?:\.\d+)?/);
    if (!matched) {
      return null;
    }

    return new Prisma.Decimal(matched[0]).toString();
  }

  private validateTermRule(educationSystem: EducationSystem, termNo: number, termType: TeachingPlanTermType) {
    const rule = TERM_RULES[educationSystem];
    const label = EDUCATION_SYSTEM_LABELS[educationSystem];

    if (termNo < 1 || termNo > rule.maxTermNo) {
      return `${label}学期序号必须在 1-${rule.maxTermNo} 之间`;
    }
    if (termType === 'SCHOOL' && (termNo < rule.schoolTermRange[0] || termNo > rule.schoolTermRange[1])) {
      return `${label}在校学期必须在 ${rule.schoolTermRange[0]}-${rule.schoolTermRange[1]} 学期`;
    }
    if (
      termType === 'INTERNSHIP' &&
      (termNo < rule.internshipTermRange[0] || termNo > rule.internshipTermRange[1])
    ) {
      return `${label}企业实习学期必须在 ${rule.internshipTermRange[0]}-${rule.internshipTermRange[1]} 学期`;
    }

    return '';
  }

  private buildFileName(fileName: string) {
    return fileName.replace(/[\\/:*?"<>|]/g, '_');
  }
}
