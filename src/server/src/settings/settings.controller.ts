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
}
