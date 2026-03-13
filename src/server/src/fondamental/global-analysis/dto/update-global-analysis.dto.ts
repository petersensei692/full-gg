import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateGlobalAnalysisDto {
  @ApiPropertyOptional({ description: 'Analysis notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Array of image paths', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[] | null;

  @ApiPropertyOptional({ description: 'Display names for each image', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNames?: string[] | null;

  @ApiPropertyOptional({ description: 'Analysis type: daily, weekly, monthly, qoq, yearly' })
  @IsOptional()
  @IsString()
  analysisType?: string;
}
