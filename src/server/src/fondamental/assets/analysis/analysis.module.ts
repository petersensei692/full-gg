import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { Analysis } from './entities/analysis.entity';
import { GlobalAnalysisModule } from '../../global-analysis/global-analysis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis]),
    forwardRef(() => GlobalAnalysisModule),
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
