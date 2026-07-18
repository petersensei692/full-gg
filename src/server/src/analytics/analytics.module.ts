import { Module } from '@nestjs/common';
import { TradesModule } from './trades/trades.module';
import { DashboardAnalyticsModule } from './dashboard-analytics/dashboard-analytics.module';
import { PerformanceAnalyticsModule } from './performance-analytics/performance-analytics.module';
import { PairsModule } from './pairs/pairs.module';
import { StrategiesModule } from './strategies/strategies.module';

@Module({
  imports: [
    TradesModule,
    DashboardAnalyticsModule,
    PerformanceAnalyticsModule,
    PairsModule,
    StrategiesModule,
  ],
  exports: [TradesModule],
})
export class AnalyticsModule {}
