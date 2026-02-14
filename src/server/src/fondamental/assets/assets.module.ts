import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset } from './entities/asset.entity';
import { WatchItemsModule } from './watch-items/watch-items.module';
import { EventsModule } from './events/events.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset]),
    WatchItemsModule,
    EventsModule,
    AnalysisModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService, WatchItemsModule, EventsModule, AnalysisModule],
})
export class AssetsModule {}
