import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}
