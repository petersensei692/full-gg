import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyCalendarService } from './weekly-calendar.service';
import { WeeklyCalendarController } from './weekly-calendar.controller';
import { WeeklyCalendar } from './entities/weekly-calendar.entity';
import { AssetCalendarModule } from './asset-calendar/asset-calendar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeeklyCalendar]),
    AssetCalendarModule,
  ],
  controllers: [WeeklyCalendarController],
  providers: [WeeklyCalendarService],
  exports: [WeeklyCalendarService],
})
export class WeeklyCalendarModule {}
