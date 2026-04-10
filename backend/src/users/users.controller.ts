import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { AccountType, AccountStatus, ACCOUNT_TYPE_LIST, ACCOUNT_STATUS_LIST } from '../common/constants/account.constants';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  private getUserId(req: any): string {
    return req?.user?.userId || req?.user?.id || req?.user?.sub;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '管理员创建用户' })
  create(@Body() data: {
    username: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    accountType: AccountType;
  }) {
    return this.usersService.create(data);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'accountType', required: false, enum: ACCOUNT_TYPE_LIST })
  @ApiQuery({ name: 'status', required: false, enum: ACCOUNT_STATUS_LIST })
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

  @Get('public')
  @ApiOperation({ summary: '通讯录搜索' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'accountType', required: false, enum: ACCOUNT_TYPE_LIST })
  findPublicUsers(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('keyword') keyword?: string,
    @Query('accountType') accountType?: AccountType,
  ) {
    return this.usersService.findPublicUsers({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      keyword,
      accountType,
    });
  }

  @Put('me/privacy')
  @ApiOperation({ summary: '更新当前用户隐私设置' })
  updateMyPrivacy(@Request() req, @Body() data: { phonePublic?: boolean; emailPublic?: boolean }) {
    return this.usersService.updatePrivacySettings(this.getUserId(req), data);
  }

  @Put(':id/privacy')
  @ApiOperation({ summary: '更新隐私设置' })
  updatePrivacy(@Param('id') id: string, @Body() data: { phonePublic?: boolean; emailPublic?: boolean }) {
    return this.usersService.updatePrivacySettings(id, data);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '获取用户详情' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '更新用户信息' })
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; email?: string; phone?: string; accountType?: AccountType },
  ) {
    return this.usersService.update(id, data);
  }

  @Put(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '审批账号（通过）' })
  approve(@Param('id') id: string) {
    return this.usersService.updateStatus(id, 'ACTIVE');
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '启用/禁用账号' })
  updateStatus(@Param('id') id: string, @Body('status') status: AccountStatus) {
    return this.usersService.updateStatus(id, status);
  }

  @Put(':id/password')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '管理员重置密码' })
  resetPassword(@Param('id') id: string, @Body('newPassword') newPassword: string) {
    return this.usersService.resetPassword(id, newPassword);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除用户' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
