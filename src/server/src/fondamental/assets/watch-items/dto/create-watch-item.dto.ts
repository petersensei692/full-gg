import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength, ValidateNested, IsOptional, IsArray } from 'class-validator';
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
}

export class CreateWatchItemDto {
  @ApiProperty({ description: 'UUID of the weekly watchlist', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  watchlistId: string;

  @ApiProperty({ description: 'UUID of the base asset', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  baseAssetId: string;

  @ApiProperty({ description: 'UUID of the quote asset', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  quoteAssetId: string;

  @ApiProperty({ description: 'Pair name (e.g. BTC/USD)', example: 'BTC/USD', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  pairName: string;

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
}
