import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({
    description: 'Unique name of the asset (e.g. USD, EUR, STOCKS)',
    example: 'USD',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Asset type: currency, commodity, stocks, crypto',
    example: 'currency',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ description: 'Sort order within the same type (lower = higher in list)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Place (position) within the type section (1, 2, 3, ...). If omitted, set to next available.',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  place?: number;

  @ApiPropertyOptional({
    description: 'Whether this asset can be used in trading pairs',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isTradable?: boolean;
}
