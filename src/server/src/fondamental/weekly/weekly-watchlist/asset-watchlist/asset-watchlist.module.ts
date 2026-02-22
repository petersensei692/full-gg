import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetWatchlist } from './entities/asset-watchlist.entity';
import { AssetWatchlistService } from './asset-watchlist.service';
import { AssetWatchlistController } from './asset-watchlist.controller';
import { WeeklyWatchlist } from '../entities/weekly-watchlist.entity';
import { Asset } from '../../../assets/entities/asset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetWatchlist, WeeklyWatchlist, Asset]),
  ],
  controllers: [AssetWatchlistController],
  providers: [AssetWatchlistService],
  exports: [AssetWatchlistService],
})
export class AssetWatchlistModule {}
