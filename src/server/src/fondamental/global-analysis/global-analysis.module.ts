import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalAnalysis } from './entities/global-analysis.entity';
import { Asset } from '../assets/entities/asset.entity';
import { GlobalAnalysisService } from './global-analysis.service';
import { GlobalAnalysisController } from './global-analysis.controller';
import { AnalysisModule } from '../assets/analysis/analysis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GlobalAnalysis, Asset]),
    AnalysisModule,
  ],
  controllers: [GlobalAnalysisController],
  providers: [GlobalAnalysisService],
  exports: [GlobalAnalysisService],
})
export class GlobalAnalysisModule {}
