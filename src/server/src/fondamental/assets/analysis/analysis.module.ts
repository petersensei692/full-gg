import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { Analysis } from './entities/analysis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Analysis])],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
