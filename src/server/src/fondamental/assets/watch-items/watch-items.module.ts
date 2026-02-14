import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchItemsService } from './watch-items.service';
import { WatchItemsController } from './watch-items.controller';
import { WatchItem } from './entities/watch-item.entity';
import { WeeklyWatchlist } from '../../weekly/weekly-watchlist/entities/weekly-watchlist.entity';
import { Asset } from '../entities/asset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WatchItem, WeeklyWatchlist, Asset]),
  ],
  controllers: [WatchItemsController],
  providers: [WatchItemsService],
  exports: [WatchItemsService],
})
export class WatchItemsModule {}
