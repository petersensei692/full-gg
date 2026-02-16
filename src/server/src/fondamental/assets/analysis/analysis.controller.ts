import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';

@ApiTags('fondamental')
@Controller('fondamental/assets/analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new analysis for an asset' })
  @ApiBody({ type: CreateAnalysisDto })
  @ApiResponse({ status: 201, description: 'Analysis created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  create(@Body() createDto: CreateAnalysisDto) {
    return this.analysisService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get analyses, optionally filtered by assetId' })
  @ApiQuery({ name: 'assetId', required: false, description: 'Filter by asset UUID' })
  @ApiResponse({ status: 200, description: 'List of analyses (for the asset if assetId provided).' })
  findAll(@Query('assetId') assetId?: string) {
    return this.analysisService.findAll(assetId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one analysis by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the analysis' })
  @ApiResponse({ status: 200, description: 'Analysis found.' })
  @ApiResponse({ status: 404, description: 'Analysis not found.' })
  findOne(@Param('id') id: string) {
    return this.analysisService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an analysis (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the analysis' })
  @ApiBody({ type: UpdateAnalysisDto })
  @ApiResponse({ status: 200, description: 'Analysis updated successfully.' })
  @ApiResponse({ status: 404, description: 'Analysis not found.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  update(@Param('id') id: string, @Body() updateDto: UpdateAnalysisDto) {
    return this.analysisService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an analysis' })
  @ApiParam({ name: 'id', description: 'UUID of the analysis' })
  @ApiResponse({ status: 200, description: 'Analysis deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Analysis not found.' })
  remove(@Param('id') id: string) {
    return this.analysisService.remove(id);
  }
}
