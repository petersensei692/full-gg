import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsUUID, ValidateIf } from 'class-validator';

export class CreateAnalysisDto {
  @ApiProperty({ description: 'Asset UUID this analysis belongs to', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  assetId: string;

  @ApiProperty({ description: 'Analysis notes; optional when images are provided' })
  @ValidateIf((o: CreateAnalysisDto) => !o.images?.length)
  @IsNotEmpty()
  @IsString()
  notes: string;

  @ApiPropertyOptional({ description: 'Array of image paths', example: ['/images/analysis1.png', '/images/analysis2.png'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Display names for each image (same order as images)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNames?: string[];

  @ApiPropertyOptional({ description: 'Optional headline for stream cards', maxLength: 500 })
  @IsOptional()
  @IsString()
  title?: string;
}
