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
import { StrategiesService } from './strategies.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@ApiTags('analytics')
@Controller('analytics/strategies')
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new strategy' })
  @ApiBody({ type: CreateStrategyDto })
  @ApiResponse({ status: 201, description: 'Strategy created.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  create(@Body() createDto: CreateStrategyDto) {
    return this.strategiesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all strategies' })
  @ApiResponse({ status: 200, description: 'List of strategies (ordered by updatedAt desc).' })
  findAll() {
    return this.strategiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one strategy by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the strategy' })
  @ApiResponse({ status: 200, description: 'Strategy found.' })
  @ApiResponse({ status: 404, description: 'Strategy not found.' })
  findOne(@Param('id') id: string) {
    return this.strategiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a strategy (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the strategy' })
  @ApiBody({ type: UpdateStrategyDto })
  @ApiResponse({ status: 200, description: 'Strategy updated.' })
  @ApiResponse({ status: 404, description: 'Strategy not found.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  update(@Param('id') id: string, @Body() updateDto: UpdateStrategyDto) {
    return this.strategiesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a strategy' })
  @ApiParam({ name: 'id', description: 'UUID of the strategy' })
  @ApiResponse({ status: 200, description: 'Strategy deleted.' })
  @ApiResponse({ status: 404, description: 'Strategy not found.' })
  remove(@Param('id') id: string) {
    return this.strategiesService.remove(id);
  }
}
