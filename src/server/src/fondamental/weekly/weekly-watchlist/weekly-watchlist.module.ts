import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyWatchlistService } from './weekly-watchlist.service';
import { WeeklyWatchlistController } from './weekly-watchlist.controller';
import { WeeklyWatchlist } from './entities/weekly-watchlist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyWatchlist])],
  controllers: [WeeklyWatchlistController],
  providers: [WeeklyWatchlistService],
  exports: [WeeklyWatchlistService],
})
export class WeeklyWatchlistModule {}
