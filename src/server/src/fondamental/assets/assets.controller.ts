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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ReorderAssetDto } from './dto/reorder-asset.dto';

@ApiTags('fondamental')
@Controller('fondamental/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 201, description: 'Asset created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body (validation failed).' })
  @ApiResponse({ status: 409, description: 'Asset with this name already exists.' })
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets' })
  @ApiResponse({ status: 200, description: 'List of all assets (ordered by name).' })
  findAll() {
    return this.assetsService.findAll();
  }

  @Get('with-stats')
  @ApiOperation({ summary: 'Get all assets with analysis and watch counts' })
  @ApiResponse({ status: 200, description: 'List of assets with analysisCount and watchCount.' })
  findAllWithStats() {
    return this.assetsService.findAllWithStats();
  }

  @Get('by-id/:id')
  @ApiOperation({ summary: 'Get one asset by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the asset', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Asset found.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch('by-id/:id/reorder')
  @ApiOperation({ summary: 'Move asset up or down within its type section' })
  @ApiParam({ name: 'id', description: 'UUID of the asset' })
  @ApiBody({ type: ReorderAssetDto })
  @ApiResponse({ status: 200, description: 'Asset order updated; returns full asset list.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID or already at first/last.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  reorder(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderAssetDto) {
    return dto.direction === 'up'
      ? this.assetsService.moveUp(id)
      : this.assetsService.moveDown(id);
  }

  @Patch('by-id/:id')
  @ApiOperation({ summary: 'Update an asset (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the asset' })
  @ApiBody({ type: UpdateAssetDto })
  @ApiResponse({ status: 200, description: 'Asset updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format or request body.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete('by-id/:id')
  @ApiOperation({ summary: 'Delete an asset' })
  @ApiParam({ name: 'id', description: 'UUID of the asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.remove(id);
  }
}
