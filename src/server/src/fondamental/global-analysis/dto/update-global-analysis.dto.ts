import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';

/** Scope: "global" or list of asset UUIDs (same shape as create). */
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

  @ApiPropertyOptional({
    description: 'New scope: "global" or array of asset UUIDs. Recreates per-asset copies when changed.',
    oneOf: [{ type: 'string', enum: ['global'] }, { type: 'array', items: { type: 'string' } }],
  })
  @IsOptional()
  scope?: 'global' | string[];

  @ApiPropertyOptional({ description: 'Starred in the global analysis stream' })
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;
}
