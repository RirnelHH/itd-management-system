import { Controller, Post, Body, Get, Put, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto, ResetPasswordDto, ForgotPasswordDto, UpdateProfileDto } from './dto/auth.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('register-options')
  @ApiOperation({ summary: '获取注册选项' })
  getRegisterOptions() {
    return this.authService.getRegisterOptions();
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '注册失败' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '登录失败' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '忘记密码 - 发送验证码' })
  @ApiResponse({ status: 200, description: '邮件发送成功' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getProfile(@CurrentUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前用户信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateProfile(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto);
  }

  @Put('password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({ status: 200, description: '修改成功' })
  changePassword(@CurrentUser('userId') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto.oldPassword, dto.newPassword);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置密码 - 验证验证码' })
  @ApiResponse({ status: 200, description: '密码重置成功' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
  }
}
