import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsModule } from './assets/assets.module';
import { WatchItemsModule } from './assets/watch-items/watch-items.module';
import { AnalysisModule } from './assets/analysis/analysis.module';
import { NotesModule } from './notes/notes.module';
import { WeeklyModule } from './weekly/weekly.module';
import { GlobalAnalysis } from './global-analysis/entities/global-analysis.entity';
import { Asset } from './assets/entities/asset.entity';
import { GlobalAnalysisController } from './global-analysis/global-analysis.controller';
import { GlobalAnalysisService } from './global-analysis/global-analysis.service';
import { AllAnalysisModule } from './all-analysis/all-analysis.module';

@Module({
  // Import watch-items, analysis, notes BEFORE assets so their routes register before assets' parametric routes
  imports: [
    WatchItemsModule,
    AnalysisModule,
    NotesModule,
    TypeOrmModule.forFeature([GlobalAnalysis, Asset]),
    AllAnalysisModule,
    AssetsModule,
    WeeklyModule,
  ],
  controllers: [GlobalAnalysisController],
  providers: [GlobalAnalysisService],
  exports: [AssetsModule, WeeklyModule],
})
export class FondamentalModule {}
