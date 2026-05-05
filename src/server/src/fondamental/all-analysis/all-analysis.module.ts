import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from '../assets/analysis/entities/analysis.entity';
import { GlobalAnalysis } from '../global-analysis/entities/global-analysis.entity';
import { Asset } from '../assets/entities/asset.entity';
import { AllAnalysisService } from './all-analysis.service';
import { AllAnalysisController } from './all-analysis.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Analysis, GlobalAnalysis, Asset])],
  providers: [AllAnalysisService],
  controllers: [AllAnalysisController],
  exports: [AllAnalysisService],
})
export class AllAnalysisModule {}

