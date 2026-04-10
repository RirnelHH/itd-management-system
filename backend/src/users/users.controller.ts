import { Controller, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { AccountType, AccountStatus } from '@prisma/client';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(AccountType.ADMIN)
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'accountType', required: false, enum: AccountType })
  @ApiQuery({ name: 'status', required: false, enum: AccountStatus })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('accountType') accountType?: AccountType,
    @Query('status') status?: AccountStatus,
    @Query('keyword') keyword?: string,
  ) {
    return this.usersService.findAll({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      accountType,
      status,
      keyword,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(AccountType.ADMIN)
  @ApiOperation({ summary: '获取用户详情' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(AccountType.ADMIN)
  @ApiOperation({ summary: '更新用户信息' })
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; email?: string; phone?: string; accountType?: AccountType },
  ) {
    return this.usersService.update(id, data);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(AccountType.ADMIN)
  @ApiOperation({ summary: '启用/禁用账号' })
  updateStatus(@Param('id') id: string, @Body('status') status: AccountStatus) {
    return this.usersService.updateStatus(id, status);
  }

  @Put(':id/password')
  @UseGuards(RolesGuard)
  @Roles(AccountType.ADMIN)
  @ApiOperation({ summary: '管理员重置密码' })
  resetPassword(@Param('id') id: string, @Body('newPassword') newPassword: string) {
    return this.usersService.resetPassword(id, newPassword);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(AccountType.ADMIN)
  @ApiOperation({ summary: '删除用户' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
