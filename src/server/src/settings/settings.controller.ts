import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

class SettingsDto {
  databasePath?: string;
  imagesPath?: string;
}

class ValidateDatabaseDto {
  path!: string;
}

class PrepareDatabaseDto {
  path!: string;
}

class CreateDatabaseDto {
  directory!: string;
  fileName?: string;
}

@ApiTags('settings')
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current settings (database and images paths)' })
  @ApiResponse({ status: 200, description: 'Current settings.' })
  getSettings() {
    return this.settings.getConfig();
  }

  @Patch()
  @ApiOperation({ summary: 'Update settings' })
  @ApiBody({ type: SettingsDto })
  @ApiResponse({ status: 200, description: 'Updated settings.' })
  updateSettings(@Body() body: Partial<SettingsDto>) {
    return this.settings.updateConfig({
      databasePath: body.databasePath,
      imagesPath: body.imagesPath,
    });
  }

  @Post('validate-database')
  @ApiOperation({ summary: 'Validate an SQLite file has the required schema' })
  @ApiBody({ type: ValidateDatabaseDto })
  @ApiResponse({ status: 201, description: 'Validation result.' })
  validateDatabase(@Body() body: { path?: string }) {
    const path = body?.path;
    return this.settings.validateDatabasePath(path ?? '');
  }

  @Post('prepare-database')
  @ApiOperation({
    summary: 'Create missing tables/columns and seed only missing assets & pair pips (SQLite)',
  })
  @ApiBody({ type: PrepareDatabaseDto })
  @ApiResponse({ status: 201, description: 'Prepare result.' })
  prepareDatabase(@Body() body: { path?: string }) {
    return this.settings.prepareDatabaseFile(body?.path ?? '');
  }

  @Post('create-database')
  @ApiOperation({ summary: 'Create a new SQLite file in a directory with full schema + seeds' })
  @ApiBody({ type: CreateDatabaseDto })
  @ApiResponse({ status: 201, description: 'Create result.' })
  createDatabase(@Body() body: { directory?: string; fileName?: string }) {
    return this.settings.createDatabaseInDirectory(body?.directory ?? '', body?.fileName);
  }
}
