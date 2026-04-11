import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { EDUCATION_SYSTEMS } from '../teaching.constants';

export class CreateMajorDto {
  @ApiProperty({ description: '专业名称', example: '软件技术' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '学制', enum: EDUCATION_SYSTEMS })
  @IsIn(EDUCATION_SYSTEMS)
  educationSystem: string;
}

export class UpdateMajorDto {
  @ApiPropertyOptional({ description: '专业名称', example: '软件技术' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '学制', enum: EDUCATION_SYSTEMS })
  @IsOptional()
  @IsIn(EDUCATION_SYSTEMS)
  educationSystem?: string;
}

export class MajorQueryDto {
  @ApiPropertyOptional({ description: '关键词（按名称）', example: '软件' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '学制', enum: EDUCATION_SYSTEMS })
  @IsOptional()
  @IsIn(EDUCATION_SYSTEMS)
  educationSystem?: string;
}
