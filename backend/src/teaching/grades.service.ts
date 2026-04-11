import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto, GradeQueryDto, UpdateGradeDto } from './dto/grade.dto';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGradeDto) {
    await this.ensureMajorExists(dto.majorId);
    await this.ensureUnique(dto.majorId, dto.name);

    return this.prisma.grade.create({
      data: {
        name: dto.name,
        majorId: dto.majorId,
        educationSystem: dto.educationSystem as any,
        status: (dto.status as any) || 'ACTIVE',
        graduatedAt: dto.graduatedAt ? new Date(dto.graduatedAt) : dto.status === 'GRADUATED' ? new Date() : null,
      },
      include: {
        major: true,
      },
    });
  }

  async findAll(query: GradeQueryDto) {
    const where: Prisma.GradeWhereInput = {
      ...(query.majorId ? { majorId: query.majorId } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.keyword ? { name: { contains: query.keyword } } : {}),
    };

    return this.prisma.grade.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        major: true,
        _count: {
          select: { teachingPlans: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        major: true,
        teachingPlans: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { rows: true },
            },
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException('年级不存在');
    }

    return grade;
  }

  async update(id: string, dto: UpdateGradeDto) {
    const current = await this.ensureExists(id);
    const majorId = dto.majorId || current.majorId;
    const name = dto.name || current.name;

    if (dto.majorId) {
      await this.ensureMajorExists(dto.majorId);
    }

    if (majorId !== current.majorId || name !== current.name) {
      await this.ensureUnique(majorId, name, id);
    }

    const status = dto.status || current.status;
    const graduatedAt =
      dto.graduatedAt !== undefined
        ? dto.graduatedAt
          ? new Date(dto.graduatedAt)
          : null
        : status === 'GRADUATED'
          ? current.graduatedAt || new Date()
          : null;

    return this.prisma.grade.update({
      where: { id },
      data: {
        name: dto.name,
        majorId: dto.majorId,
        educationSystem: dto.educationSystem as any,
        status: dto.status as any,
        graduatedAt,
      },
      include: {
        major: true,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const planCount = await this.prisma.teachingPlan.count({
      where: { gradeId: id },
    });

    if (planCount > 0) {
      throw new BadRequestException('年级已有关联教学计划，不能删除');
    }

    await this.prisma.grade.delete({ where: { id } });
    return { message: '年级删除成功' };
  }

  private async ensureExists(id: string) {
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) {
      throw new NotFoundException('年级不存在');
    }
    return grade;
  }

  private async ensureMajorExists(id: string) {
    const major = await this.prisma.major.findUnique({ where: { id } });
    if (!major) {
      throw new BadRequestException('归属专业不存在');
    }
  }

  private async ensureUnique(majorId: string, name: string, currentId?: string) {
    const existing = await this.prisma.grade.findFirst({
      where: {
        majorId,
        name,
      },
    });

    if (existing && existing.id !== currentId) {
      throw new BadRequestException('同一专业下年级名称已存在');
    }
  }
}
