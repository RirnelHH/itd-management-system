import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CourseQueryDto, CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    await this.validateMajorRelation(dto.courseType, dto.majorId);
    await this.ensureUnique(dto.name, dto.courseType, dto.majorId);

    return this.prisma.course.create({
      data: {
        name: dto.name,
        courseType: dto.courseType as any,
        sourceType: (dto.sourceType as any) || 'MANUAL',
        status: (dto.status as any) || 'ACTIVE',
        majorId: dto.majorId || null,
      },
      include: {
        major: true,
      },
    });
  }

  async findAll(query: CourseQueryDto) {
    const where: Prisma.CourseWhereInput = {
      ...(query.courseType ? { courseType: query.courseType as any } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.majorId ? { majorId: query.majorId } : {}),
      ...(query.keyword ? { name: { contains: query.keyword } } : {}),
    };

    return this.prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        major: true,
        _count: {
          select: { teachingPlanRows: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        major: true,
        teachingPlanRows: {
          include: {
            teachingPlan: {
              include: {
                grade: true,
              },
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

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const current = await this.ensureExists(id);
    const courseType = dto.courseType || current.courseType;
    const majorId = dto.majorId === undefined ? current.majorId : dto.majorId || null;
    const name = dto.name || current.name;

    await this.validateMajorRelation(courseType, majorId);
    await this.ensureUnique(name, courseType, majorId, id);

    return this.prisma.course.update({
      where: { id },
      data: {
        name: dto.name,
        courseType: dto.courseType as any,
        sourceType: dto.sourceType as any,
        status: dto.status as any,
        majorId,
      },
      include: {
        major: true,
      },
    });
  }

  async remove(id: string) {
    const course = await this.ensureExists(id);
    const references = await this.prisma.teachingPlanRow.findMany({
      where: { courseId: id },
      include: {
        teachingPlan: {
          include: {
            grade: true,
          },
        },
      },
    });

    if (references.length === 0) {
      await this.prisma.course.delete({ where: { id } });
      return { message: '课程删除成功', deleteMode: 'DIRECT' };
    }

    const hasActiveReference = references.some(
      (row) => row.teachingPlan.grade.status !== 'GRADUATED',
    );

    if (hasActiveReference) {
      throw new BadRequestException('课程已被未毕业年级引用，不能删除，只能停用');
    }

    await this.prisma.$transaction([
      this.prisma.teachingPlanRow.updateMany({
        where: { courseId: id },
        data: { courseId: null },
      }),
      this.prisma.course.delete({ where: { id } }),
    ]);

    return {
      message: '课程仅被已毕业年级引用，已解除引用并删除',
      deleteMode: 'GRADUATED_REFERENCES_ONLY',
      courseName: course.name,
    };
  }

  private async ensureExists(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    return course;
  }

  private async validateMajorRelation(courseType: string, majorId?: string | null) {
    if (courseType === 'MAJOR' && !majorId) {
      throw new BadRequestException('专业课必须指定归属专业');
    }

    if (courseType === 'PUBLIC' && majorId) {
      throw new BadRequestException('公共课不能指定归属专业');
    }

    if (majorId) {
      const major = await this.prisma.major.findUnique({ where: { id: majorId } });
      if (!major) {
        throw new BadRequestException('归属专业不存在');
      }
    }
  }

  private async ensureUnique(name: string, courseType: string, majorId?: string | null, currentId?: string) {
    const where: Prisma.CourseWhereInput =
      courseType === 'PUBLIC'
        ? { courseType: 'PUBLIC', name }
        : { majorId: majorId || null, name };

    const existing = await this.prisma.course.findFirst({ where });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException('课程名称已存在');
    }
  }
}
