import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsArray, MaxLength } from 'class-validator';
import { NOTE_TIERS, NOTE_TYPES } from './create-note.dto';

export class UpdateNoteDto {
  @ApiPropertyOptional({
    description: 'Note title',
    example: 'Fed rate decision',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description: 'Note content (HTML supported)',
    example: '<p>Updated content.</p>',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Note tier (tier_1, tier_2, tier_3)',
    enum: NOTE_TIERS,
  })
  @IsOptional()
  @IsString()
  @IsIn(NOTE_TIERS)
  tier?: string;

  @ApiPropertyOptional({
    description: 'Note type (macro, technical, other)',
    enum: NOTE_TYPES,
  })
  @IsOptional()
  @IsString()
  @IsIn(NOTE_TYPES)
  type?: string;

  @ApiPropertyOptional({ description: 'Image paths (from upload)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Optional names for each image', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNames?: string[];
}
