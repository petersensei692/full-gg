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
import { WatchItemsService } from './watch-items.service';
import { CreateWatchItemDto } from './dto/create-watch-item.dto';
import { UpdateWatchItemDto } from './dto/update-watch-item.dto';

@ApiTags('fondamental')
@Controller('fondamental/assets/watch-items')
export class WatchItemsController {
  constructor(private readonly watchItemsService: WatchItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new watch item' })
  @ApiBody({ type: CreateWatchItemDto })
  @ApiResponse({ status: 201, description: 'Watch item created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 404, description: 'Watchlist or asset not found.' })
  create(@Body() createDto: CreateWatchItemDto) {
    return this.watchItemsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all watch items' })
  @ApiResponse({ status: 200, description: 'List of all watch items.' })
  findAll() {
    return this.watchItemsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one watch item by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the watch item' })
  @ApiResponse({ status: 200, description: 'Watch item found.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  @ApiResponse({ status: 404, description: 'Watch item not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.watchItemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a watch item (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the watch item' })
  @ApiBody({ type: UpdateWatchItemDto })
  @ApiResponse({ status: 200, description: 'Watch item updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format or request body.' })
  @ApiResponse({ status: 404, description: 'Watch item, watchlist or asset not found.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: UpdateWatchItemDto) {
    return this.watchItemsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a watch item' })
  @ApiParam({ name: 'id', description: 'UUID of the watch item' })
  @ApiResponse({ status: 200, description: 'Watch item deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  @ApiResponse({ status: 404, description: 'Watch item not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.watchItemsService.remove(id);
  }
}
