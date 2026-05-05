import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsUUID, IsBoolean } from 'class-validator';

export class UpdateAnalysisDto {
  @ApiPropertyOptional({ description: 'Asset UUID (change which asset this analysis belongs to)' })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({ description: 'Analysis notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Array of image paths', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[] | null;

  @ApiPropertyOptional({ description: 'Display names for each image (same order as images)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNames?: string[] | null;

  @ApiPropertyOptional({ description: 'Starred on the asset analysis stream (allowed even for global-originated copies)' })
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  @ApiPropertyOptional({ description: 'Optional headline for stream cards', maxLength: 500 })
  @IsOptional()
  @IsString()
  title?: string | null;
}
