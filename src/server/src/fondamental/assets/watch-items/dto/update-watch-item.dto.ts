import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class ThesisDto {
  @ApiPropertyOptional({ description: 'Notes for the thesis', example: 'Bullish trend expected' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Array of image paths', example: ['/images/chart1.png'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateWatchItemDto {
  @ApiPropertyOptional({ description: 'UUID of the weekly watchlist' })
  @IsOptional()
  @IsUUID()
  watchlistId?: string;

  @ApiPropertyOptional({ description: 'UUID of the base asset' })
  @IsOptional()
  @IsUUID()
  baseAssetId?: string;

  @ApiPropertyOptional({ description: 'UUID of the quote asset' })
  @IsOptional()
  @IsUUID()
  quoteAssetId?: string;

  @ApiPropertyOptional({ description: 'Pair name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pairName?: string;

  @ApiPropertyOptional({ description: 'Bias', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bias?: string;

  @ApiPropertyOptional({ description: 'Thesis object', type: ThesisDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThesisDto)
  thesis?: ThesisDto | null;
}
