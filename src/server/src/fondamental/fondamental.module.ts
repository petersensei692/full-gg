import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { EventsModule } from './assets/events/events.module';
import { WatchItemsModule } from './assets/watch-items/watch-items.module';
import { AnalysisModule } from './assets/analysis/analysis.module';
import { WeeklyModule } from './weekly/weekly.module';

@Module({
  // Import events, watch-items, analysis BEFORE assets so their routes (e.g. GET .../events) register before assets' parametric routes
  imports: [
    EventsModule,
    WatchItemsModule,
    AnalysisModule,
    AssetsModule,
    WeeklyModule,
  ],
  exports: [AssetsModule, WeeklyModule],
})
export class FondamentalModule {}
