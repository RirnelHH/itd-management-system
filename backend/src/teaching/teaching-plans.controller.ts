import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TeachingPlansService } from './teaching-plans.service';
import {
  CreateTeachingPlanDto,
  CreateTeachingPlanRowDto,
  TeachingPlanQueryDto,
  UpdateTeachingPlanDto,
  UpdateTeachingPlanRowDto,
} from './dto/teaching-plan.dto';

@ApiTags('实施性教学计划')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('teaching-plans')
export class TeachingPlansController {
  constructor(private readonly teachingPlansService: TeachingPlansService) {}

  @Post()
  @ApiOperation({ summary: '创建教学计划' })
  create(@Body() dto: CreateTeachingPlanDto) {
    return this.teachingPlansService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询教学计划列表' })
  findAll(@Query() query: TeachingPlanQueryDto) {
    return this.teachingPlansService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询教学计划详情' })
  findOne(@Param('id') id: string) {
    return this.teachingPlansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新教学计划' })
  update(@Param('id') id: string, @Body() dto: UpdateTeachingPlanDto) {
    return this.teachingPlansService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除教学计划' })
  remove(@Param('id') id: string) {
    return this.teachingPlansService.remove(id);
  }

  @Post(':id/rows')
  @ApiOperation({ summary: '新增教学计划行' })
  createRow(@Param('id') id: string, @Body() dto: CreateTeachingPlanRowDto) {
    return this.teachingPlansService.createRow(id, dto);
  }

  @Patch(':id/rows/:rowId')
  @ApiOperation({ summary: '更新教学计划行' })
  updateRow(@Param('id') id: string, @Param('rowId') rowId: string, @Body() dto: UpdateTeachingPlanRowDto) {
    return this.teachingPlansService.updateRow(id, rowId, dto);
  }

  @Delete(':id/rows/:rowId')
  @ApiOperation({ summary: '删除教学计划行' })
  removeRow(@Param('id') id: string, @Param('rowId') rowId: string) {
    return this.teachingPlansService.removeRow(id, rowId);
  }
}
