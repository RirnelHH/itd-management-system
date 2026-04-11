import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MajorsService } from './majors.service';
import { CreateMajorDto, MajorQueryDto, UpdateMajorDto } from './dto/major.dto';

@ApiTags('专业管理')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('majors')
export class MajorsController {
  constructor(private readonly majorsService: MajorsService) {}

  @Post()
  @ApiOperation({ summary: '创建专业' })
  create(@Body() dto: CreateMajorDto) {
    return this.majorsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询专业列表' })
  findAll(@Query() query: MajorQueryDto) {
    return this.majorsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询专业详情' })
  findOne(@Param('id') id: string) {
    return this.majorsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新专业' })
  update(@Param('id') id: string, @Body() dto: UpdateMajorDto) {
    return this.majorsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除专业' })
  remove(@Param('id') id: string) {
    return this.majorsService.remove(id);
  }
}
