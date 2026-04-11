import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TeachingPlanExcelService } from './teaching-plan-excel.service';
import { TeachingPlansService } from './teaching-plans.service';
import {
  CreateTeachingPlanDto,
  CreateTeachingPlanRowDto,
  TeachingPlanExcelTemplateQueryDto,
  TeachingPlanQueryDto,
  UpdateTeachingPlanDto,
  UpdateTeachingPlanRowDto,
} from './dto/teaching-plan.dto';

@ApiTags('实施性教学计划')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('teaching-plans')
export class TeachingPlansController {
  constructor(
    private readonly teachingPlansService: TeachingPlansService,
    private readonly teachingPlanExcelService: TeachingPlanExcelService,
  ) {}

  @Get('template/download')
  @ApiOperation({ summary: '下载教学计划 Excel 模板' })
  @ApiQuery({ name: 'educationSystem', required: false, enum: ['THREE_YEAR', 'FIVE_YEAR'] })
  async downloadTemplate(@Query() query: TeachingPlanExcelTemplateQueryDto, @Res() res: Response) {
    const buffer = await this.teachingPlanExcelService.buildTemplateBuffer(query.educationSystem);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="teaching-plan-template.xlsx"');
    res.send(Buffer.from(buffer));
  }

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

  @Get(':id/export')
  @ApiOperation({ summary: '导出教学计划 Excel' })
  async exportExcel(@Param('id') id: string, @Res() res: Response) {
    const result = await this.teachingPlanExcelService.buildExportFile(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
    res.send(Buffer.from(result.buffer));
  }

  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: '导入教学计划 Excel' })
  importExcel(
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
  ) {
    return this.teachingPlanExcelService.importPlanRows(id, file);
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
