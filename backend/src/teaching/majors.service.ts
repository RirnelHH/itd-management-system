import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMajorDto, MajorQueryDto, UpdateMajorDto } from './dto/major.dto';

@Injectable()
export class MajorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMajorDto) {
    await this.ensureNameUnique(dto.name);

    return this.prisma.major.create({
      data: {
        name: dto.name,
        educationSystem: dto.educationSystem as any,
      },
    });
  }

  async findAll(query: MajorQueryDto) {
    const where: Prisma.MajorWhereInput = {
      ...(query.educationSystem ? { educationSystem: query.educationSystem as any } : {}),
      ...(query.keyword ? { name: { contains: query.keyword } } : {}),
    };

    return this.prisma.major.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            grades: true,
            courses: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const major = await this.prisma.major.findUnique({
      where: { id },
      include: {
        grades: {
          orderBy: { createdAt: 'desc' },
        },
        courses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!major) {
      throw new NotFoundException('专业不存在');
    }

    return major;
  }

  async update(id: string, dto: UpdateMajorDto) {
    await this.ensureExists(id);

    if (dto.name) {
      await this.ensureNameUnique(dto.name, id);
    }

    return this.prisma.major.update({
      where: { id },
      data: {
        name: dto.name,
        educationSystem: dto.educationSystem as any,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const [gradeCount, courseCount] = await Promise.all([
      this.prisma.grade.count({ where: { majorId: id } }),
      this.prisma.course.count({ where: { majorId: id } }),
    ]);

    if (gradeCount > 0 || courseCount > 0) {
      throw new BadRequestException('专业存在关联的年级或课程，不能删除');
    }

    await this.prisma.major.delete({ where: { id } });

    return { message: '专业删除成功' };
  }

  private async ensureExists(id: string) {
    const major = await this.prisma.major.findUnique({ where: { id } });
    if (!major) {
      throw new NotFoundException('专业不存在');
    }
    return major;
  }

  private async ensureNameUnique(name: string, currentId?: string) {
    const existing = await this.prisma.major.findUnique({ where: { name } });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException('专业名称已存在');
    }
  }
}
