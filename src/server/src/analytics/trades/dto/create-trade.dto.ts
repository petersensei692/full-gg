import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { IsSlEvolutionEntryConstraint } from './sl-evolution.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
type TradeType = (typeof TRADE_TYPE_VALUES)[number];
type TradeExecutionType = (typeof TRADE_EXECUTION_TYPE_VALUES)[number];
type TradeCloseType = (typeof TRADE_CLOSE_TYPE_VALUES)[number];
type TradeStatus = (typeof TRADE_STATUS_VALUES)[number];

class TradeProfitEarningDto {
  @ApiProperty({ description: 'Earned R for a partial/full close', example: -0.5 })
  @IsNumber()
  earnedR: number;
}

class TradeProfitFactorEarnedDto {
  @ApiProperty({ type: [TradeProfitEarningDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeProfitEarningDto)
  earnings: TradeProfitEarningDto[];

  @ApiProperty({ example: 1 })
  @IsNumber()
  earningsNumber: number;

  @ApiProperty({ example: 1.25 })
  @IsNumber()
  totalEarned: number;
}

class CreateTradeProfitFactorEarnedDto {
  @ApiPropertyOptional({ type: [TradeProfitEarningDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeProfitEarningDto)
  earnings?: TradeProfitEarningDto[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  earningsNumber?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  totalEarned?: number;
}

class TradeClosePriceDto {
  @ApiProperty({ example: 1.1425 })
  @IsNumber()
  price: number;

  @ApiProperty({ enum: TRADE_CLOSE_TYPE_VALUES })
  @IsEnum(TRADE_CLOSE_TYPE_VALUES)
  type: TradeCloseType;

  @ApiProperty({ example: 0.5 })
  @IsNumber()
  @Min(0)
  lots: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  percentage: number;

  @ApiProperty({ example: '2026-03-21T03:08:00.000Z' })
  @IsDateString()
  time: string;
}

class TradeNoteDto {
  @ApiProperty({ example: 'Break of structure confirmed.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ type: [String], example: ['/uploads/note-1.png'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Captions aligned with images' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNames?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Usually set by server when mirroring to analysis' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedAnalysisIds?: string[];
}

export class CreateTradeDto {
  @ApiProperty({
    description: 'Catalog trading pair ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  pairId: string;

  @ApiProperty({
    description: 'Strategy ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  strategyId: string;

  @ApiPropertyOptional({ description: 'Linked watch item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  pairWatchedId?: string;

  @ApiProperty({ enum: TRADE_TYPE_VALUES })
  @IsEnum(TRADE_TYPE_VALUES)
  type: TradeType;

  @ApiProperty({ enum: TRADE_EXECUTION_TYPE_VALUES })
  @IsEnum(TRADE_EXECUTION_TYPE_VALUES)
  executionType: TradeExecutionType;

  @ApiPropertyOptional({
    description: 'If omitted, trade is pending until executed with a time.',
    example: '2026-03-21T01:35:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  executionTime?: string;

  @ApiProperty({ example: 1.1405 })
  @IsNumber()
  executionPrice: number;

  @ApiProperty({ example: 1.132 })
  @IsNumber()
  tpPrice: number;

  @ApiProperty({ example: 1.145 })
  @IsNumber()
  initialSlPrice: number;

  @ApiPropertyOptional({
    description: 'SL evolution sequence, e.g. [{ "slUpdate1": 1.14 }, { "slUpdate2": 1.1425 }]',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  @Validate(IsSlEvolutionEntryConstraint, { each: true })
  slEvolution?: Record<string, number>[];

  @ApiPropertyOptional({ type: CreateTradeProfitFactorEarnedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTradeProfitFactorEarnedDto)
  profitFactorEarned?: CreateTradeProfitFactorEarnedDto;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(0)
  positionSize: number;

  @ApiPropertyOptional({ type: [TradeClosePriceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeClosePriceDto)
  closePrices?: TradeClosePriceDto[];

  @ApiPropertyOptional({ example: '2026-03-21T03:08:00.000Z' })
  @IsOptional()
  @IsDateString()
  tradeCloseTime?: string | null;

  @ApiPropertyOptional({ enum: TRADE_STATUS_VALUES })
  @IsOptional()
  @IsEnum(TRADE_STATUS_VALUES)
  status?: TradeStatus;

  @ApiPropertyOptional({ type: [TradeNoteDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeNoteDto)
  trackNotes?: TradeNoteDto[];
}
