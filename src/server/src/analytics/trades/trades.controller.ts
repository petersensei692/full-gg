import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TradesService } from './trades.service';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';

@ApiTags('analytics')
@Controller('analytics/trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trade' })
  @ApiBody({ type: CreateTradeDto })
  @ApiResponse({ status: 201, description: 'Trade created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  create(@Body() dto: CreateTradeDto) {
    return this.tradesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all trades' })
  @ApiResponse({ status: 200, description: 'List of all trades.' })
  findAll() {
    return this.tradesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one trade by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the trade' })
  @ApiResponse({ status: 200, description: 'Trade found.' })
  @ApiResponse({ status: 404, description: 'Trade not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tradesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a trade (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the trade' })
  @ApiBody({ type: UpdateTradeDto })
  @ApiResponse({ status: 200, description: 'Trade updated successfully.' })
  @ApiResponse({ status: 404, description: 'Trade not found.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTradeDto) {
    return this.tradesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trade' })
  @ApiParam({ name: 'id', description: 'UUID of the trade' })
  @ApiResponse({ status: 200, description: 'Trade deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Trade not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tradesService.remove(id);
  }
}
