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
import { AssetWatchlistService } from './asset-watchlist.service';

@ApiTags('weekly')
@Controller('weekly/asset-watchlist')
export class AssetWatchlistController {
  constructor(
    private readonly assetWatchlistService: AssetWatchlistService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get asset watchlists by assetId or weeklyWatchlistId (provide one)',
  })
  @ApiQuery({
    name: 'assetId',
    required: false,
    description: 'Filter by asset UUID',
  })
  @ApiQuery({
    name: 'weeklyWatchlistId',
    required: false,
    description: 'Filter by weekly watchlist UUID',
  })
  @ApiResponse({ status: 200, description: 'List of asset watchlists.' })
  @ApiResponse({
    status: 400,
    description:
      'Must provide exactly one of assetId or weeklyWatchlistId.',
  })
  async findByQuery(
    @Query('assetId') assetId?: string,
    @Query('weeklyWatchlistId') weeklyWatchlistId?: string,
  ) {
    const hasAsset = !!assetId;
    const hasWatchlist = !!weeklyWatchlistId;
    if (hasAsset === hasWatchlist) {
      throw new BadRequestException(
        'Provide exactly one of assetId or weeklyWatchlistId',
      );
    }
    if (hasAsset) {
      return this.assetWatchlistService.findByAsset(assetId!);
    }
    return this.assetWatchlistService.findByWeeklyWatchlist(
      weeklyWatchlistId!,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one asset watchlist by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the asset watchlist' })
  @ApiResponse({ status: 200, description: 'Asset watchlist found.' })
  @ApiResponse({ status: 404, description: 'Asset watchlist not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetWatchlistService.findOne(id);
  }
}
