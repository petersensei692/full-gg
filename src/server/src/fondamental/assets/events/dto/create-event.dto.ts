import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @ApiPropertyOptional({
    description:
      'UUID of the asset calendar (alternative to calendarId+assetId)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assetCalendarId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the weekly calendar (required if assetCalendarId not provided)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  calendarId?: string;

  @ApiProperty({ description: 'Day of the event', example: 'Monday', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  day: string;

  @ApiPropertyOptional({
    description: 'UUID of the asset (required if assetCalendarId not provided)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({
    description: 'Image payloads (e.g. data URLs from paste)',
    type: [String],
    example: ['data:image/png;base64,...'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  eventsImages: string[];
}
