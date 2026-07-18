import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class ThesisDto {
  @ApiProperty({ description: 'Notes for the thesis', example: 'Bullish trend expected' })
  @IsString()
  @IsNotEmpty()
  notes: string;

  @ApiPropertyOptional({ description: 'Array of image paths', example: ['/images/chart1.png', '/images/chart2.png'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Image display names', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNames?: string[];
}

export class CreateWatchItemDto {
  @ApiProperty({
    description: 'Catalog trading pair ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tradingPairId: string;

  @ApiPropertyOptional({
    description: 'UUID of the base asset watchlist (required with quoteAssetWatchlistId)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  baseAssetWatchlistId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the quote asset watchlist (required with baseAssetWatchlistId)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  quoteAssetWatchlistId?: string;

  @ApiPropertyOptional({ description: 'UUID of the weekly watchlist (legacy, use base/quoteAssetWatchlistId)' })
  @IsOptional()
  @IsUUID()
  watchlistId?: string;

  @ApiProperty({ description: 'Bias (e.g. bullish, bearish)', example: 'bullish', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bias: string;

  @ApiPropertyOptional({ description: 'Thesis object with notes and optional images', type: ThesisDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThesisDto)
  thesis?: ThesisDto;

  @ApiPropertyOptional({ description: 'Whether the watch item is marked as finished', default: false })
  @IsOptional()
  @IsBoolean()
  finished?: boolean;

  @ApiPropertyOptional({ description: 'Linked analysis UUIDs for the base asset panel', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedBaseAnalysisIds?: string[];

  @ApiPropertyOptional({ description: 'Linked analysis UUIDs for the quote asset panel', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedQuoteAnalysisIds?: string[];
}
