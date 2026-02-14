import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateAnalysisDto {
  @ApiProperty({ description: 'Analysis notes', example: 'Market shows bullish signals with strong support at $50k' })
  @IsString()
  @IsNotEmpty()
  notes: string;

  @ApiPropertyOptional({ description: 'Array of image paths', example: ['/images/analysis1.png', '/images/analysis2.png'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
