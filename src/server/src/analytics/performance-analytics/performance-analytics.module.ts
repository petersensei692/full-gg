import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trade } from '../trades/entities/trade.entity';
import { PerformanceAnalyticsController } from './performance-analytics.controller';
import { PerformanceAnalyticsService } from './performance-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trade])],
  controllers: [PerformanceAnalyticsController],
  providers: [PerformanceAnalyticsService],
})
export class PerformanceAnalyticsModule {}
