import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class CreateWeeklyWatchlistDto {
  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2025-02-03T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date (ISO 8601)',
    example: '2025-02-09T23:59:59.999Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
