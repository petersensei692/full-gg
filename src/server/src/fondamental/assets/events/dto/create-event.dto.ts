import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ description: 'UUID of the weekly calendar', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  calendarId: string;

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

  @ApiProperty({ description: 'UUID of the asset', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  assetId: string;

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
