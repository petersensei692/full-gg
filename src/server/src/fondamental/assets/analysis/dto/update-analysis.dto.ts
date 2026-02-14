import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateAnalysisDto {
  @ApiPropertyOptional({ description: 'Analysis notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Array of image paths', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[] | null;
}
