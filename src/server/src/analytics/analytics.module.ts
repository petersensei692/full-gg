import { Module } from '@nestjs/common';
import { TradesModule } from './trades/trades.module';
import { DashboardAnalyticsModule } from './dashboard-analytics/dashboard-analytics.module';

@Module({
  imports: [TradesModule, DashboardAnalyticsModule],
})
export class AnalyticsModule {}
