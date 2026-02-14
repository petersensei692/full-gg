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
import { WeeklyCalendarService } from './weekly-calendar.service';
import { CreateWeeklyCalendarDto } from './dto/create-weekly-calendar.dto';
import { UpdateWeeklyCalendarDto } from './dto/update-weekly-calendar.dto';

@ApiTags('weekly')
@Controller('weekly/calendar')
export class WeeklyCalendarController {
  constructor(
    private readonly weeklyCalendarService: WeeklyCalendarService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new weekly calendar entry' })
  @ApiBody({ type: CreateWeeklyCalendarDto })
  @ApiResponse({ status: 201, description: 'Weekly calendar entry created.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  create(@Body() createDto: CreateWeeklyCalendarDto) {
    return this.weeklyCalendarService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all weekly calendar entries' })
  @ApiResponse({ status: 200, description: 'List of weekly calendar entries (ordered by startDate).' })
  findAll() {
    return this.weeklyCalendarService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one weekly calendar entry by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the entry' })
  @ApiResponse({ status: 200, description: 'Entry found.' })
  @ApiResponse({ status: 404, description: 'Entry not found.' })
  findOne(@Param('id') id: string) {
    return this.weeklyCalendarService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a weekly calendar entry (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the entry' })
  @ApiBody({ type: UpdateWeeklyCalendarDto })
  @ApiResponse({ status: 200, description: 'Entry updated.' })
  @ApiResponse({ status: 404, description: 'Entry not found.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWeeklyCalendarDto,
  ) {
    return this.weeklyCalendarService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a weekly calendar entry' })
  @ApiParam({ name: 'id', description: 'UUID of the entry' })
  @ApiResponse({ status: 200, description: 'Entry deleted.' })
  @ApiResponse({ status: 404, description: 'Entry not found.' })
  remove(@Param('id') id: string) {
    return this.weeklyCalendarService.remove(id);
  }
}
