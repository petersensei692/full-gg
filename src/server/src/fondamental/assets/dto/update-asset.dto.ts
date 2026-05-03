import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsInt, Min } from 'class-validator';

export class UpdateAssetDto {
  @ApiPropertyOptional({
    description: 'Name of the asset (optional for partial update)',
    example: 'USD',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Asset type: currency, commodity, stocks, crypto',
    example: 'currency',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ description: 'Sort order within the same type' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Place (position) within the type section (1, 2, 3, ...)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  place?: number;
}
