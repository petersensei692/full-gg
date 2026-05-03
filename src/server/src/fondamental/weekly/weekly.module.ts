import { Module } from '@nestjs/common';
import { WeeklyWatchlistModule } from './weekly-watchlist/weekly-watchlist.module';

@Module({
  imports: [WeeklyWatchlistModule],
  exports: [WeeklyWatchlistModule],
})
export class WeeklyModule {}
