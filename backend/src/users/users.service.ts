import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountStatus, AccountType } from '../common/constants/account.constants';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 管理员创建用户（直接创建已激活的账号）
  async create(data: {
    username: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    accountType: AccountType;
  }) {
    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new BadRequestException('邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 创建用户和账号
    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        name: data.name,
        email: data.email,
        phone: data.phone,
        account: {
          create: {
            password: hashedPassword,
            accountType: data.accountType,
            status: 'ACTIVE', // 管理员创建的账号直接激活
          },
        },
      },
      include: { account: true },
    });

    return {
      message: '账号创建成功',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        accountType: user.account.accountType,
        status: user.account.status,
      },
    };
  }

  // 获取用户列表
  async findAll(params: {
    page?: number;
    pageSize?: number;
    accountType?: AccountType;
    status?: AccountStatus;
    keyword?: string;
  }) {
    const { page = 1, pageSize = 10, accountType, status, keyword } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (accountType) {
      where.account = { accountType };
    }
    if (status) {
      where.account = { ...where.account, status };
    }
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { name: { contains: keyword } },
        { email: { contains: keyword } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          account: {
            select: { accountType: true, status: true, createdAt: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      list: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 获取用户详情
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  // 更新用户信息
  async update(id: string, data: { name?: string; email?: string; phone?: string; accountType?: AccountType }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        account: data.accountType
          ? { update: { accountType: data.accountType } }
          : undefined,
      },
      include: { account: true },
    });
  }

  // 启用/禁用账号
  async updateStatus(id: string, status: AccountStatus) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.prisma.account.update({
      where: { userId: id },
      data: { status },
    });

    return { message: `账号已${status === 'ACTIVE' ? '启用' : '禁用'}` };
  }

  // 管理员重置密码
  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.account.update({
      where: { userId: id },
      data: { password: hashedPassword },
    });

    return { message: '密码重置成功' };
  }

  // 删除用户
  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.prisma.account.delete({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });

    return { message: '用户已删除' };
  }
}
