import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const NOTE_TIERS = ['tier_1', 'tier_2', 'tier_3'] as const;
export type NoteTier = (typeof NOTE_TIERS)[number];

export class CreateNoteDto {
  @ApiProperty({
    description: 'Note title',
    example: 'Fed rate decision',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'Note content (HTML supported)',
    example: '<p>First sentence. Second sentence.</p>',
  })
  @IsString()
  @IsNotEmpty()
  note: string;

  @ApiProperty({
    description: 'Note tier (tier_1, tier_2, tier_3)',
    enum: NOTE_TIERS,
    example: 'tier_2',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(NOTE_TIERS)
  tier: string;
}
