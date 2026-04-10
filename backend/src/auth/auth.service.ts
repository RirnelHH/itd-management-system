import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 获取注册选项（可自主注册的身份列表）
  getRegisterOptions() {
    // 从允许自主注册的身份列表中获取
    const allowedSelfRegister = ['TEACHER', 'STUDENT', 'STUDENT_STAFF'];
    const accountTypeNames: Record<string, string> = {
      TEACHER: '教师',
      STUDENT: '学生',
      STUDENT_STAFF: '学生管理干事',
    };
    return allowedSelfRegister.map((type) => ({
      value: type,
      label: accountTypeNames[type] || type,
    }));
  }

  // 用户注册
  async register(data: {
    username: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    accountType: string;
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

    // 非 TEACHER 角色不允许自主注册
    const allowedSelfRegister = ['TEACHER'];
    if (!allowedSelfRegister.includes(data.accountType)) {
      throw new BadRequestException('不允许自主注册此角色，请联系管理员');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 检查是否是第一个账号
    const accountCount = await this.prisma.account.count();
    const isFirstAccount = accountCount === 0;

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
            accountType: isFirstAccount ? 'ADMIN' : data.accountType as any,
            status: isFirstAccount ? 'ACTIVE' : 'PENDING_APPROVAL',
          },
        },
      },
      include: { account: true },
    });

    return {
      message: isFirstAccount ? '注册成功，已自动成为管理员' : '注册成功，请等待审批',
      userId: user.id,
      username: user.username,
      accountType: user.account.accountType,
      status: user.account.status,
    };
  }

  // 用户登录
  async login(username: string, password: string) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { account: true },
    });

    if (!user || !user.account) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.account.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查账号状态
    if (user.account.status === 'PENDING_APPROVAL') {
      throw new UnauthorizedException('账号待审批，请联系管理员');
    }

    if (user.account.status === 'DISABLED') {
      throw new UnauthorizedException('账号已禁用，请联系管理员');
    }

    // 生成 JWT Token
    const payload = {
      sub: user.id,
      username: user.username,
      accountType: user.account.accountType,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
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

  // 获取当前用户信息
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { account: { select: { accountType: true, status: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return user;
  }

  // 修改密码
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { account: true },
    });

    if (!user || !user.account) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.account.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('原密码错误');
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.account.update({
      where: { userId: user.id },
      data: { password: hashedPassword },
    });

    return { message: '密码修改成功' };
  }

  // 管理员重置密码
  async adminResetPassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.account.update({
      where: { userId },
      data: { password: hashedPassword },
    });

    return { message: '密码重置成功' };
  }
}
