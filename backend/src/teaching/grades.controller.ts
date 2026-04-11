import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GradesService } from './grades.service';
import { CreateGradeDto, GradeQueryDto, UpdateGradeDto } from './dto/grade.dto';

@ApiTags('年级管理')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @ApiOperation({ summary: '创建年级' })
  create(@Body() dto: CreateGradeDto) {
    return this.gradesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询年级列表' })
  findAll(@Query() query: GradeQueryDto) {
    return this.gradesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询年级详情' })
  findOne(@Param('id') id: string) {
    return this.gradesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新年级' })
  update(@Param('id') id: string, @Body() dto: UpdateGradeDto) {
    return this.gradesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除年级' })
  remove(@Param('id') id: string) {
    return this.gradesService.remove(id);
  }
}
