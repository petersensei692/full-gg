import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsSlEvolutionEntryConstraint } from './sl-evolution.validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const TRADE_TYPE_VALUES = ['buy', 'sell'] as const;
const TRADE_EXECUTION_TYPE_VALUES = [
  'market order',
  'buy stop',
  'sell stop',
  'buy limit',
  'sell limit',
] as const;
const TRADE_CLOSE_TYPE_VALUES = ['fullClose', 'partClose'] as const;
const TRADE_STATUS_VALUES = [
  'pending',
  'executed',
  'partlyClosed',
  'fullyClosed',
  'cancelled',
] as const;

class TradeProfitEarningDto {
  @ApiPropertyOptional({ description: 'Earned R for a partial/full close', example: -0.5 })
  @IsOptional()
  @IsNumber()
  earnedR?: number;
}

class TradeProfitFactorEarnedDto {
  @ApiPropertyOptional({ type: [TradeProfitEarningDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeProfitEarningDto)
  earnings?: TradeProfitEarningDto[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  earningsNumber?: number;

  @ApiPropertyOptional({ example: 1.25 })
  @IsOptional()
  @IsNumber()
  totalEarned?: number;
}

class TradeClosePriceDto {
  @ApiPropertyOptional({ example: 1.1425 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ enum: TRADE_CLOSE_TYPE_VALUES })
  @IsOptional()
  @IsEnum(TRADE_CLOSE_TYPE_VALUES)
  type?: (typeof TRADE_CLOSE_TYPE_VALUES)[number];

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lots?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional({ example: '2026-03-21T03:08:00.000Z' })
  @IsOptional()
  @IsDateString()
  time?: string;
}

class TradeNoteDto {
  @ApiPropertyOptional({ example: 'Break of structure confirmed.' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ type: [String], example: ['/uploads/note-1.png'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNames?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedAnalysisIds?: string[];
}

export class UpdateTradeDto {
  @ApiPropertyOptional({ description: 'Catalog trading pair ID' })
  @IsOptional()
  @IsUUID()
  pairId?: string;

  @ApiPropertyOptional({ description: 'Strategy ID' })
  @IsOptional()
  @IsUUID()
  strategyId?: string;

  @ApiPropertyOptional({ description: 'Linked watch item ID', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  pairWatchedId?: string | null;

  @ApiPropertyOptional({ enum: TRADE_TYPE_VALUES })
  @IsOptional()
  @IsEnum(TRADE_TYPE_VALUES)
  type?: (typeof TRADE_TYPE_VALUES)[number];

  @ApiPropertyOptional({ enum: TRADE_EXECUTION_TYPE_VALUES })
  @IsOptional()
  @IsEnum(TRADE_EXECUTION_TYPE_VALUES)
  executionType?: (typeof TRADE_EXECUTION_TYPE_VALUES)[number];

  @ApiPropertyOptional({ example: '2026-03-21T01:35:00.000Z', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  executionTime?: string | null;

  @ApiPropertyOptional({ example: 1.1405 })
  @IsOptional()
  @IsNumber()
  executionPrice?: number;

  @ApiPropertyOptional({ example: 1.132 })
  @IsOptional()
  @IsNumber()
  tpPrice?: number;

  @ApiPropertyOptional({ example: 1.145 })
  @IsOptional()
  @IsNumber()
  initialSlPrice?: number;

  @ApiPropertyOptional({
    description: 'SL evolution sequence, e.g. [{ "slUpdate1": 1.14 }, { "slUpdate2": 1.1425 }]',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  @Validate(IsSlEvolutionEntryConstraint, { each: true })
  slEvolution?: Record<string, number>[];

  @ApiPropertyOptional({ example: 2.5 })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  })
  @IsOptional()
  @IsNumber()
  profitFactorTargeted?: number;

  @ApiPropertyOptional({ type: TradeProfitFactorEarnedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TradeProfitFactorEarnedDto)
  profitFactorEarned?: TradeProfitFactorEarnedDto;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  positionSize?: number;

  @ApiPropertyOptional({ type: [TradeClosePriceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeClosePriceDto)
  closePrices?: TradeClosePriceDto[];

  @ApiPropertyOptional({ example: '2026-03-21T03:08:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString()
  tradeCloseTime?: string | null;

  @ApiPropertyOptional({ enum: TRADE_STATUS_VALUES })
  @IsOptional()
  @IsEnum(TRADE_STATUS_VALUES)
  status?: (typeof TRADE_STATUS_VALUES)[number];

  @ApiPropertyOptional({ type: [TradeNoteDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeNoteDto)
  trackNotes?: TradeNoteDto[];
}
