import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset } from './entities/asset.entity';
import { Analysis } from './analysis/entities/analysis.entity';
import { WatchItem } from './watch-items/entities/watch-item.entity';
import { WatchItemsModule } from './watch-items/watch-items.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, Analysis, WatchItem]),
    WatchItemsModule,
    AnalysisModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService, WatchItemsModule, AnalysisModule],
})
export class AssetsModule {}
