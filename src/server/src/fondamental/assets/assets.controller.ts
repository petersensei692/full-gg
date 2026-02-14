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

  @Get(':id')
  @ApiOperation({ summary: 'Get one asset by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the asset', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Asset found.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an asset (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the asset' })
  @ApiBody({ type: UpdateAssetDto })
  @ApiResponse({ status: 200, description: 'Asset updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format or request body.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an asset' })
  @ApiParam({ name: 'id', description: 'UUID of the asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.remove(id);
  }
}
