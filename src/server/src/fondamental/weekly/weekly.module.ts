import { Module } from '@nestjs/common';
import { WeeklyCalendarModule } from './weekly-calendar/weekly-calendar.module';
import { WeeklyWatchlistModule } from './weekly-watchlist/weekly-watchlist.module';

@Module({
  imports: [WeeklyCalendarModule, WeeklyWatchlistModule],
  exports: [WeeklyCalendarModule, WeeklyWatchlistModule],
})
export class WeeklyModule {}
