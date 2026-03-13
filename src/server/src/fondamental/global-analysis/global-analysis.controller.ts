import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GlobalAnalysisService } from './global-analysis.service';
import { CreateGlobalAnalysisDto } from './dto/create-global-analysis.dto';
import { UpdateGlobalAnalysisDto } from './dto/update-global-analysis.dto';

@ApiTags('fondamental')
@Controller('fondamental/global-analysis')
export class GlobalAnalysisController {
  constructor(private readonly globalAnalysisService: GlobalAnalysisService) {}

  @Post()
  @ApiOperation({ summary: 'Create a global analysis and apply to assets' })
  @ApiBody({ type: CreateGlobalAnalysisDto })
  @ApiResponse({ status: 201, description: 'Global analysis created and applied to scope.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  create(@Body() createDto: CreateGlobalAnalysisDto) {
    return this.globalAnalysisService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all global analyses (stream for Global Analysis page)' })
  @ApiResponse({ status: 200, description: 'List of global analyses with scopeDisplay.' })
  findAll() {
    return this.globalAnalysisService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one global analysis by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the global analysis' })
  @ApiResponse({ status: 200, description: 'Global analysis found.' })
  @ApiResponse({ status: 404, description: 'Global analysis not found.' })
  findOne(@Param('id') id: string) {
    return this.globalAnalysisService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a global analysis (and all linked asset analyses)' })
  @ApiParam({ name: 'id', description: 'UUID of the global analysis' })
  @ApiBody({ type: UpdateGlobalAnalysisDto })
  @ApiResponse({ status: 200, description: 'Global analysis updated.' })
  @ApiResponse({ status: 404, description: 'Global analysis not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGlobalAnalysisDto,
  ) {
    return this.globalAnalysisService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a global analysis and all linked asset analyses' })
  @ApiParam({ name: 'id', description: 'UUID of the global analysis' })
  @ApiResponse({ status: 200, description: 'Global analysis and linked analyses deleted.' })
  @ApiResponse({ status: 404, description: 'Global analysis not found.' })
  remove(@Param('id') id: string) {
    return this.globalAnalysisService.remove(id);
  }
}
