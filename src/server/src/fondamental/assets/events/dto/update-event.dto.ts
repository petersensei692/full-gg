import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateEventDto {
  @ApiPropertyOptional({ description: 'UUID of the weekly calendar' })
  @IsOptional()
  @IsUUID()
  calendarId?: string;

  @ApiPropertyOptional({ description: 'Day of the event', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  day?: string;

  @ApiPropertyOptional({ description: 'UUID of the asset' })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({
    description: 'Replace image list (e.g. data URLs)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventsImages?: string[];
}
