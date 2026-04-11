import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { COURSE_SOURCE_TYPES, COURSE_STATUSES, COURSE_TYPES } from '../teaching.constants';

export class CreateCourseDto {
  @ApiProperty({ description: '课程名称', example: '程序设计基础' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '课程类型', enum: COURSE_TYPES })
  @IsIn(COURSE_TYPES)
  courseType: string;

  @ApiPropertyOptional({ description: '来源类型', enum: COURSE_SOURCE_TYPES })
  @IsOptional()
  @IsIn(COURSE_SOURCE_TYPES)
  sourceType?: string;

  @ApiPropertyOptional({ description: '状态', enum: COURSE_STATUSES })
  @IsOptional()
  @IsIn(COURSE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: '归属专业 ID，公共课可为空' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  majorId?: string;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: '课程名称', example: '程序设计基础' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '课程类型', enum: COURSE_TYPES })
  @IsOptional()
  @IsIn(COURSE_TYPES)
  courseType?: string;

  @ApiPropertyOptional({ description: '来源类型', enum: COURSE_SOURCE_TYPES })
  @IsOptional()
  @IsIn(COURSE_SOURCE_TYPES)
  sourceType?: string;

  @ApiPropertyOptional({ description: '状态', enum: COURSE_STATUSES })
  @IsOptional()
  @IsIn(COURSE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: '归属专业 ID，公共课可为空' })
  @IsOptional()
  @IsString()
  majorId?: string | null;
}

export class CourseQueryDto {
  @ApiPropertyOptional({ description: '课程类型', enum: COURSE_TYPES })
  @IsOptional()
  @IsIn(COURSE_TYPES)
  courseType?: string;

  @ApiPropertyOptional({ description: '状态', enum: COURSE_STATUSES })
  @IsOptional()
  @IsIn(COURSE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: '归属专业 ID' })
  @IsOptional()
  @IsString()
  majorId?: string;

  @ApiPropertyOptional({ description: '关键词（按名称）', example: '程序' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
