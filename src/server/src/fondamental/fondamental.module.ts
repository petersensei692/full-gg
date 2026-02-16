import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { EventsModule } from './assets/events/events.module';
import { WatchItemsModule } from './assets/watch-items/watch-items.module';
import { AnalysisModule } from './assets/analysis/analysis.module';
import { NotesModule } from './notes/notes.module';
import { WeeklyModule } from './weekly/weekly.module';

@Module({
  // Import events, watch-items, analysis, notes BEFORE assets so their routes register before assets' parametric routes
  imports: [
    EventsModule,
    WatchItemsModule,
    AnalysisModule,
    NotesModule,
    AssetsModule,
    WeeklyModule,
  ],
  exports: [AssetsModule, WeeklyModule],
})
export class FondamentalModule {}
