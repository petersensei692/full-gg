import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardAnalyticsController } from './dashboard-analytics.controller';
import { DashboardAnalyticsService } from './dashboard-analytics.service';
import { Trade } from '../trades/entities/trade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trade])],
  controllers: [DashboardAnalyticsController],
  providers: [DashboardAnalyticsService],
})
export class DashboardAnalyticsModule {}
