import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateIf } from 'class-validator';

export class CreateGlobalAnalysisDto {
  @ApiProperty({ description: 'Analysis notes (HTML or plain text); optional when images are provided' })
  @ValidateIf((o: CreateGlobalAnalysisDto) => !o.images?.length)
  @IsNotEmpty()
  @IsString()
  notes: string;

  @ApiPropertyOptional({ description: 'Array of image paths', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Display names for each image', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNames?: string[];

  @ApiProperty({
    description: 'Scope: "global" for all assets, or array of asset UUIDs for selected assets',
    oneOf: [
      { type: 'string', enum: ['global'] },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  @IsNotEmpty()
  scope: 'global' | string[];

  @ApiPropertyOptional({ description: 'Analysis type: daily, weekly, monthly, qoq, yearly', default: 'daily' })
  @IsOptional()
  @IsString()
  analysisType?: string;

  @ApiPropertyOptional({ description: 'Optional headline for stream cards', maxLength: 500 })
  @IsOptional()
  @IsString()
  title?: string;
}
