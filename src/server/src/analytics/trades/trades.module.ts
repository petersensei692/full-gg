import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { Trade } from './entities/trade.entity';
import { WatchItem } from '../../fondamental/assets/watch-items/entities/watch-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trade, WatchItem])],
  controllers: [TradesController],
  providers: [TradesService],
  exports: [TradesService],
})
export class TradesModule {}
