import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { Trade } from './entities/trade.entity';
import { WatchItem } from '../../fondamental/assets/watch-items/entities/watch-item.entity';
import { Pair } from '../pairs/entities/pair.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { Asset } from '../../fondamental/assets/entities/asset.entity';
import { AnalysisModule } from '../../fondamental/assets/analysis/analysis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trade, WatchItem, Pair, Asset, Strategy]),
    AnalysisModule,
  ],
  controllers: [TradesController],
  providers: [TradesService],
  exports: [TradesService],
})
export class TradesModule {}
