import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { MajorsController } from './majors.controller';
import { MajorsService } from './majors.service';
import { TeachingPlansController } from './teaching-plans.controller';
import { TeachingPlansService } from './teaching-plans.service';

@Module({
  controllers: [
    MajorsController,
    GradesController,
    CoursesController,
    TeachingPlansController,
  ],
  providers: [
    MajorsService,
    GradesService,
    CoursesService,
    TeachingPlansService,
  ],
})
export class TeachingModule {}
