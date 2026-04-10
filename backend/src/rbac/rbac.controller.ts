import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/current-user.decorator';
import { RbacService } from './rbac.service';
import { AccountType } from '../common/constants/account.constants';

@ApiTags('权限管理')
@Controller('rbac')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RbacController {
  constructor(private rbacService: RbacService) {}

  @Get('permissions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '获取所有权限列表' })
  getAllPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Get('permissions/:accountType')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '获取角色权限' })
  getRolePermissions(@Param('accountType') accountType: AccountType) {
    return this.rbacService.getRolePermissions(accountType);
  }

  @Put('permissions/:accountType')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新角色权限' })
  updateRolePermissions(
    @Param('accountType') accountType: AccountType,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.rbacService.updateRolePermissions(accountType, permissionIds);
  }

  @Get('menus')
  @ApiOperation({ summary: '获取当前用户的菜单' })
  getMenus(@CurrentUser('accountType') accountType: AccountType) {
    return this.rbacService.getMenus(accountType);
  }
}
