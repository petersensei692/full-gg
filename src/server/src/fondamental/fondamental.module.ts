import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsModule } from './assets/assets.module';
import { EventsModule } from './assets/events/events.module';
import { WatchItemsModule } from './assets/watch-items/watch-items.module';
import { AnalysisModule } from './assets/analysis/analysis.module';
import { NotesModule } from './notes/notes.module';
import { WeeklyModule } from './weekly/weekly.module';
import { GlobalAnalysis } from './global-analysis/entities/global-analysis.entity';
import { Asset } from './assets/entities/asset.entity';
import { GlobalAnalysisController } from './global-analysis/global-analysis.controller';
import { GlobalAnalysisService } from './global-analysis/global-analysis.service';

@Module({
  // Import events, watch-items, analysis, notes BEFORE assets so their routes register before assets' parametric routes
  imports: [
    EventsModule,
    WatchItemsModule,
    AnalysisModule,
    NotesModule,
    TypeOrmModule.forFeature([GlobalAnalysis, Asset]),
    AssetsModule,
    WeeklyModule,
  ],
  controllers: [GlobalAnalysisController],
  providers: [GlobalAnalysisService],
  exports: [AssetsModule, WeeklyModule],
})
export class FondamentalModule {}
