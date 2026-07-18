import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsNumber, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class CreatePairDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  baseAssetId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  quoteAssetId: string;

  @ApiPropertyOptional({
    description: 'Pip value. Omit or null to leave unset (blocks new trades).',
    nullable: true,
    example: 0.0001,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  @Allow()
  pipValue?: number | null;
}
