import { ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsBoolean, IsNumber, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdatePairDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  baseAssetId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  quoteAssetId?: string;

  @ApiPropertyOptional({
    description: 'Pip value. Null clears it and blocks new trades.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  @Allow()
  pipValue?: number | null;

  @ApiPropertyOptional({
    description: 'Swap base and quote (if reverse orientation is free)',
  })
  @IsOptional()
  @IsBoolean()
  swapOrientation?: boolean;
}
