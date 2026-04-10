import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'zhangsan', description: '用户名' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: '张三', description: '姓名' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'zhangsan@example.com', description: '邮箱' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '13800138000', description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'password123', description: '密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'TEACHER', description: '账号类型' })
  @IsString()
  accountType: string;
}

export class LoginDto {
  @ApiProperty({ example: 'zhangsan', description: '用户名' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123', description: '密码' })
  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '原密码' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '邮箱' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '验证码' })
  @IsString()
  token: string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'zhangsan@example.com', description: '注册邮箱' })
  @IsEmail()
  email: string;
}
