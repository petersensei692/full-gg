import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AssetCalendarService } from './asset-calendar.service';

@ApiTags('weekly')
@Controller('weekly/asset-calendar')
export class AssetCalendarController {
  constructor(
    private readonly assetCalendarService: AssetCalendarService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get asset calendars by assetId or weeklyCalendarId (provide one)',
  })
  @ApiQuery({
    name: 'assetId',
    required: false,
    description: 'Filter by asset UUID',
  })
  @ApiQuery({
    name: 'weeklyCalendarId',
    required: false,
    description: 'Filter by weekly calendar UUID',
  })
  @ApiResponse({ status: 200, description: 'List of asset calendars.' })
  @ApiResponse({
    status: 400,
    description:
      'Must provide exactly one of assetId or weeklyCalendarId.',
  })
  async findByQuery(
    @Query('assetId') assetId?: string,
    @Query('weeklyCalendarId') weeklyCalendarId?: string,
  ) {
    const hasAsset = !!assetId;
    const hasCalendar = !!weeklyCalendarId;
    if (hasAsset === hasCalendar) {
      throw new BadRequestException(
        'Provide exactly one of assetId or weeklyCalendarId',
      );
    }
    if (hasAsset) {
      return this.assetCalendarService.findByAsset(assetId!);
    }
    return this.assetCalendarService.findByWeeklyCalendar(
      weeklyCalendarId!,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one asset calendar by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the asset calendar' })
  @ApiResponse({ status: 200, description: 'Asset calendar found.' })
  @ApiResponse({ status: 404, description: 'Asset calendar not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetCalendarService.findOne(id);
  }
}
