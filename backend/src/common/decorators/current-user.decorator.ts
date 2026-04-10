import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AccountType } from '../constants/account.constants';

// 获取当前登录用户
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// 角色权限装饰器
export const ROLES_KEY = 'roles';
export const Roles = (...roles: AccountType[]) => SetMetadata(ROLES_KEY, roles);
