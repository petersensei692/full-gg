import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('fondamental')
@Controller('fondamental/assets/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({ status: 201, description: 'Event created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 404, description: 'Calendar or asset not found.' })
  create(@Body() createDto: CreateEventDto) {
    return this.eventsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({ status: 200, description: 'List of all events.' })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one event by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the event' })
  @ApiResponse({ status: 200, description: 'Event found.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the event' })
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({ status: 200, description: 'Event updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format or request body.' })
  @ApiResponse({ status: 404, description: 'Event, calendar or asset not found.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: UpdateEventDto) {
    return this.eventsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'id', description: 'UUID of the event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.remove(id);
  }
}
