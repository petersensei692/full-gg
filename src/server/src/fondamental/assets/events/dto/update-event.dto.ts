import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Time of the event', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  time?: string;

  @ApiPropertyOptional({ description: 'UUID of the asset' })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({ description: 'Event name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Impact level', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  impact?: string;
}
