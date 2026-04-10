import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  // 获取所有权限列表
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    // 按模块分组
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return { permissions, grouped };
  }

  // 获取角色的权限
  async getRolePermissions(accountType: AccountType) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { accountType },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  // 更新角色权限
  async updateRolePermissions(accountType: AccountType, permissionIds: string[]) {
    // 删除原有权限
    await this.prisma.rolePermission.deleteMany({
      where: { accountType },
    });

    // 添加新权限
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          accountType,
          permissionId,
        })),
      });
    }

    return { message: '权限更新成功' };
  }

  // 获取菜单树（根据用户角色）
  async getMenus(accountType: AccountType) {
    // 获取角色权限
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { accountType },
      include: { permission: true },
    });

    const permissionCodes = rolePermissions.map((rp) => rp.permission.code);

    // 定义菜单结构
    const allMenus = [
      {
        path: '/dashboard',
        name: 'Dashboard',
        icon: 'home',
        title: '首页',
        permissions: ['dashboard.read'],
      },
      {
        path: '/users',
        name: 'Users',
        icon: 'user',
        title: '用户管理',
        permissions: ['user.read'],
        roles: [AccountType.ADMIN],
      },
      {
        path: '/students',
        name: 'Students',
        icon: 'student',
        title: '学生管理',
        permissions: ['student.read'],
      },
      {
        path: '/teachers',
        name: 'Teachers',
        icon: 'teacher',
        title: '教师管理',
        permissions: ['teacher.read'],
      },
      {
        path: '/teaching-plan',
        name: 'TeachingPlan',
        icon: 'plan',
        title: '授课计划',
        permissions: ['teaching-plan.read'],
      },
      {
        path: '/schedule',
        name: 'Schedule',
        icon: 'schedule',
        title: '排课管理',
        permissions: ['schedule.read'],
      },
      {
        path: '/grade',
        name: 'Grade',
        icon: 'grade',
        title: '成绩管理',
        permissions: ['grade.read'],
      },
      {
        path: '/leave',
        name: 'Leave',
        icon: 'leave',
        title: '请假管理',
        permissions: ['leave.read'],
      },
      {
        path: '/attendance',
        name: 'Attendance',
        icon: 'attendance',
        title: '签到管理',
        permissions: ['attendance.read'],
      },
      {
        path: '/statistics',
        name: 'Statistics',
        icon: 'statistics',
        title: '课时统计',
        permissions: ['statistics.read'],
      },
      {
        path: '/settings',
        name: 'Settings',
        icon: 'settings',
        title: '系统设置',
        permissions: ['settings.read'],
      },
    ];

    // 根据权限过滤菜单
    return allMenus.filter((menu) => {
      // 如果指定了角色限制，检查用户角色
      if (menu.roles && !(menu.roles as string[]).includes(accountType as string)) {
        return false;
      }
      // 如果没有权限要求，则显示
      if (!menu.permissions || menu.permissions.length === 0) {
        return true;
      }
      // 检查用户是否有任一权限
      return menu.permissions.some((code) => permissionCodes.includes(code));
    });
  }
}
