import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTeachingPlanDto,
  CreateTeachingPlanRowDto,
  TeachingPlanQueryDto,
  UpdateTeachingPlanDto,
  UpdateTeachingPlanRowDto,
} from './dto/teaching-plan.dto';

@Injectable()
export class TeachingPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeachingPlanDto) {
    await this.ensureGradeExists(dto.gradeId);

    return this.prisma.teachingPlan.create({
      data: {
        gradeId: dto.gradeId,
        name: dto.name,
      },
      include: {
        grade: {
          include: { major: true },
        },
      },
    });
  }

  async findAll(query: TeachingPlanQueryDto) {
    const where: Prisma.TeachingPlanWhereInput = {
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.keyword ? { name: { contains: query.keyword } } : {}),
    };

    return this.prisma.teachingPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        grade: {
          include: { major: true },
        },
        _count: {
          select: { rows: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.teachingPlan.findUnique({
      where: { id },
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
          orderBy: [
            { termNo: 'asc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('教学计划不存在');
    }

    return plan;
  }

  async update(id: string, dto: UpdateTeachingPlanDto) {
    await this.ensurePlanExists(id);

    if (dto.gradeId) {
      await this.ensureGradeExists(dto.gradeId);
    }

    return this.prisma.teachingPlan.update({
      where: { id },
      data: {
        gradeId: dto.gradeId,
        name: dto.name,
      },
      include: {
        grade: {
          include: { major: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.ensurePlanExists(id);

    await this.prisma.$transaction([
      this.prisma.teachingPlanRow.deleteMany({
        where: { teachingPlanId: id },
      }),
      this.prisma.teachingPlan.delete({
        where: { id },
      }),
    ]);

    return { message: '教学计划删除成功' };
  }

  async createRow(teachingPlanId: string, dto: CreateTeachingPlanRowDto) {
    await this.ensurePlanExists(teachingPlanId);
    const course = await this.ensureCourseUsable(dto.courseId);
    const weeklyHours = this.buildWeeklyHoursSnapshot(course.weeklyHours);

    return this.prisma.teachingPlanRow.create({
      data: {
        teachingPlanId,
        termNo: dto.termNo,
        termType: dto.termType as any,
        courseId: dto.courseId,
        courseName: dto.courseName || course.name,
        weeklyHoursRaw: weeklyHours.raw,
        weeklyHoursValue: weeklyHours.value,
        remark: dto.remark,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        course: true,
      },
    });
  }

  async updateRow(teachingPlanId: string, rowId: string, dto: UpdateTeachingPlanRowDto) {
    const row = await this.ensureRowExists(teachingPlanId, rowId);
    const course = dto.courseId ? await this.ensureCourseUsable(dto.courseId) : null;
    const sourceCourse = course || (row.courseId ? await this.prisma.course.findUnique({ where: { id: row.courseId } }) : null);
    const weeklyHours = this.buildWeeklyHoursSnapshot(sourceCourse?.weeklyHours);

    return this.prisma.teachingPlanRow.update({
      where: { id: rowId },
      data: {
        termNo: dto.termNo,
        termType: dto.termType as any,
        courseId: dto.courseId,
        courseName: dto.courseName || course?.name,
        weeklyHoursRaw: weeklyHours.raw,
        weeklyHoursValue: weeklyHours.value,
        remark: dto.remark,
        sortOrder: dto.sortOrder,
      },
      include: {
        course: true,
      },
    });
  }

  async removeRow(teachingPlanId: string, rowId: string) {
    await this.ensureRowExists(teachingPlanId, rowId);
    await this.prisma.teachingPlanRow.delete({
      where: { id: rowId },
    });

    return { message: '教学计划行删除成功' };
  }

  private async ensureGradeExists(id: string) {
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) {
      throw new BadRequestException('年级不存在');
    }
    return grade;
  }

  private async ensurePlanExists(id: string) {
    const plan = await this.prisma.teachingPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('教学计划不存在');
    }
    return plan;
  }

  private async ensureRowExists(teachingPlanId: string, rowId: string) {
    const row = await this.prisma.teachingPlanRow.findFirst({
      where: {
        id: rowId,
        teachingPlanId,
      },
    });

    if (!row) {
      throw new NotFoundException('教学计划行不存在');
    }

    return row;
  }

  private async ensureCourseUsable(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new BadRequestException('课程不存在');
    }
    if (course.status !== 'ACTIVE') {
      throw new BadRequestException('停用课程不能新增或修改到教学计划中');
    }
    return course;
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
}
