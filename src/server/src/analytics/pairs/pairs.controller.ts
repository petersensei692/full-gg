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
import { PairsService } from './pairs.service';
import { CreatePairDto } from './dto/create-pair.dto';
import { UpdatePairDto } from './dto/update-pair.dto';

@ApiTags('analytics')
@Controller('analytics/pairs')
export class PairsController {
  constructor(private readonly pairsService: PairsService) {}

  @Get()
  @ApiOperation({ summary: 'List trading pairs' })
  findAll() {
    return this.pairsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a trading pair' })
  @ApiBody({ type: CreatePairDto })
  @ApiResponse({ status: 201, description: 'Created' })
  create(@Body() dto: CreatePairDto) {
    return this.pairsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pip value and/or orientation' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdatePairDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePairDto) {
    return this.pairsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trading pair' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pairsService.remove(id);
  }
}
