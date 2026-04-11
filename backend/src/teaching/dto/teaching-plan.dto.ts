import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDecimal, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TEACHING_PLAN_TERM_TYPES } from '../teaching.constants';

export class CreateTeachingPlanDto {
  @ApiProperty({ description: '年级 ID' })
  @IsString()
  @IsNotEmpty()
  gradeId: string;

  @ApiProperty({ description: '计划名称', example: '2024级软件技术实施性教学计划' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdateTeachingPlanDto {
  @ApiPropertyOptional({ description: '年级 ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gradeId?: string;

  @ApiPropertyOptional({ description: '计划名称', example: '2024级软件技术实施性教学计划' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
}

export class TeachingPlanQueryDto {
  @ApiPropertyOptional({ description: '年级 ID' })
  @IsOptional()
  @IsString()
  gradeId?: string;

  @ApiPropertyOptional({ description: '关键词（按名称）', example: '2024级' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateTeachingPlanRowDto {
  @ApiProperty({ description: '学期序号', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  termNo: number;

  @ApiProperty({ description: '学期类型', enum: TEACHING_PLAN_TERM_TYPES })
  @IsIn(TEACHING_PLAN_TERM_TYPES)
  termType: string;

  @ApiProperty({ description: '课程 ID' })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiPropertyOptional({ description: '课程名称快照，不传时默认取课程名称' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  courseName?: string;

  @ApiProperty({ description: '周学时原始文本', example: '4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  weeklyHoursRaw: string;

  @ApiPropertyOptional({ description: '周学时数值', example: '4.00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  weeklyHoursValue?: string;

  @ApiPropertyOptional({ description: '任课教师', example: '张老师' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  teacherName?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @ApiPropertyOptional({ description: '排序序号', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateTeachingPlanRowDto {
  @ApiPropertyOptional({ description: '学期序号', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  termNo?: number;

  @ApiPropertyOptional({ description: '学期类型', enum: TEACHING_PLAN_TERM_TYPES })
  @IsOptional()
  @IsIn(TEACHING_PLAN_TERM_TYPES)
  termType?: string;

  @ApiPropertyOptional({ description: '课程 ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  courseId?: string;

  @ApiPropertyOptional({ description: '课程名称快照' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  courseName?: string;

  @ApiPropertyOptional({ description: '周学时原始文本', example: '4' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  weeklyHoursRaw?: string;

  @ApiPropertyOptional({ description: '周学时数值', example: '4.00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  weeklyHoursValue?: string;

  @ApiPropertyOptional({ description: '任课教师', example: '张老师' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  teacherName?: string | null;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string | null;

  @ApiPropertyOptional({ description: '排序序号', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
