import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllAnalysisService } from './all-analysis.service';

@ApiTags('all-analysis')
@Controller('fondamental/all-analysis')
export class AllAnalysisController {
  constructor(private readonly allAnalysisService: AllAnalysisService) {}

  @Get()
  @ApiOperation({ summary: 'List all analyses (global + asset) in chronological order' })
  findAll() {
    return this.allAnalysisService.findAll();
  }
}

