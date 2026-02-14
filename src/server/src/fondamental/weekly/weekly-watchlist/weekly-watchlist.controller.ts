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
import { WeeklyWatchlistService } from './weekly-watchlist.service';
import { CreateWeeklyWatchlistDto } from './dto/create-weekly-watchlist.dto';
import { UpdateWeeklyWatchlistDto } from './dto/update-weekly-watchlist.dto';

@ApiTags('weekly')
@Controller('weekly/watchlist')
export class WeeklyWatchlistController {
  constructor(
    private readonly weeklyWatchlistService: WeeklyWatchlistService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new weekly watchlist entry' })
  @ApiBody({ type: CreateWeeklyWatchlistDto })
  @ApiResponse({ status: 201, description: 'Weekly watchlist entry created.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  create(@Body() createDto: CreateWeeklyWatchlistDto) {
    return this.weeklyWatchlistService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all weekly watchlist entries' })
  @ApiResponse({ status: 200, description: 'List of weekly watchlist entries (ordered by startDate).' })
  findAll() {
    return this.weeklyWatchlistService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one weekly watchlist entry by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the entry' })
  @ApiResponse({ status: 200, description: 'Entry found.' })
  @ApiResponse({ status: 404, description: 'Entry not found.' })
  findOne(@Param('id') id: string) {
    return this.weeklyWatchlistService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a weekly watchlist entry (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the entry' })
  @ApiBody({ type: UpdateWeeklyWatchlistDto })
  @ApiResponse({ status: 200, description: 'Entry updated.' })
  @ApiResponse({ status: 404, description: 'Entry not found.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWeeklyWatchlistDto,
  ) {
    return this.weeklyWatchlistService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a weekly watchlist entry' })
  @ApiParam({ name: 'id', description: 'UUID of the entry' })
  @ApiResponse({ status: 200, description: 'Entry deleted.' })
  @ApiResponse({ status: 404, description: 'Entry not found.' })
  remove(@Param('id') id: string) {
    return this.weeklyWatchlistService.remove(id);
  }
}
