import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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

  @ApiProperty({ description: 'Time of the event', example: '14:30', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  time: string;

  @ApiPropertyOptional({
    description: 'UUID of the asset (required if assetCalendarId not provided)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({ description: 'Event name', example: 'FOMC Meeting', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Impact level', example: 'High', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  impact: string;
}
