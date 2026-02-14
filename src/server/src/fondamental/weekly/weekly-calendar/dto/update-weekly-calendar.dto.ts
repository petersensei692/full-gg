import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateWeeklyCalendarDto {
  @ApiPropertyOptional({
    description: 'Start date (ISO 8601)',
    example: '2025-02-03T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601)',
    example: '2025-02-09T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
