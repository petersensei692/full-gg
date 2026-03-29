import { Module } from '@nestjs/common';
import { TradesModule } from './trades/trades.module';
import { DashboardAnalyticsModule } from './dashboard-analytics/dashboard-analytics.module';
import { PerformanceAnalyticsModule } from './performance-analytics/performance-analytics.module';

@Module({
  imports: [TradesModule, DashboardAnalyticsModule, PerformanceAnalyticsModule],
})
export class AnalyticsModule {}
