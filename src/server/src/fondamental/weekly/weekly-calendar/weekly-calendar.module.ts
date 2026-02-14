import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyCalendarService } from './weekly-calendar.service';
import { WeeklyCalendarController } from './weekly-calendar.controller';
import { WeeklyCalendar } from './entities/weekly-calendar.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyCalendar])],
  controllers: [WeeklyCalendarController],
  providers: [WeeklyCalendarService],
  exports: [WeeklyCalendarService],
})
export class WeeklyCalendarModule {}
