import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyWatchlistService } from './weekly-watchlist.service';
import { WeeklyWatchlistController } from './weekly-watchlist.controller';
import { WeeklyWatchlist } from './entities/weekly-watchlist.entity';
import { AssetWatchlistModule } from './asset-watchlist/asset-watchlist.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeeklyWatchlist]),
    AssetWatchlistModule,
  ],
  controllers: [WeeklyWatchlistController],
  providers: [WeeklyWatchlistService],
  exports: [WeeklyWatchlistService],
})
export class WeeklyWatchlistModule {}
