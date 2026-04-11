import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { EDUCATION_SYSTEMS, GRADE_STATUSES } from '../teaching.constants';

export class CreateGradeDto {
  @ApiProperty({ description: '年级名称', example: '2024级软件技术' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '专业 ID' })
  @IsString()
  @IsNotEmpty()
  majorId: string;

  @ApiProperty({ description: '学制', enum: EDUCATION_SYSTEMS })
  @IsIn(EDUCATION_SYSTEMS)
  educationSystem: string;

  @ApiPropertyOptional({ description: '状态', enum: GRADE_STATUSES })
  @IsOptional()
  @IsIn(GRADE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: '毕业时间', example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  graduatedAt?: string;
}

export class UpdateGradeDto {
  @ApiPropertyOptional({ description: '年级名称', example: '2024级软件技术' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '专业 ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  majorId?: string;

  @ApiPropertyOptional({ description: '学制', enum: EDUCATION_SYSTEMS })
  @IsOptional()
  @IsIn(EDUCATION_SYSTEMS)
  educationSystem?: string;

  @ApiPropertyOptional({ description: '状态', enum: GRADE_STATUSES })
  @IsOptional()
  @IsIn(GRADE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: '毕业时间', example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  graduatedAt?: string | null;
}

export class GradeQueryDto {
  @ApiPropertyOptional({ description: '专业 ID' })
  @IsOptional()
  @IsString()
  majorId?: string;

  @ApiPropertyOptional({ description: '状态', enum: GRADE_STATUSES })
  @IsOptional()
  @IsIn(GRADE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: '关键词（按名称）', example: '2024级' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
