import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { parsePairCurrencyListParam } from '../../analytics-pair-filters';

export class QueryTradesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  /** Comma-separated pair symbols */
  @IsOptional()
  @IsString()
  symbols?: string;

  /** Comma-separated currency codes */
  @IsOptional()
  @IsString()
  currencies?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return true;
    const s = String(value).toLowerCase();
    if (s === 'false' || s === '0' || s === 'no') return false;
    return true;
  })
  @IsBoolean()
  buy?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return true;
    const s = String(value).toLowerCase();
    if (s === 'false' || s === '0' || s === 'no') return false;
    return true;
  })
  @IsBoolean()
  sell?: boolean = true;

  @IsOptional()
  @IsString()
  profitMin?: string = '';

  @IsOptional()
  @IsString()
  profitMax?: string = '';

  @IsOptional()
  @IsString()
  holdMin?: string = '';

  @IsOptional()
  @IsString()
  holdMax?: string = '';

  @IsOptional()
  @IsString()
  volumeMin?: string = '';

  @IsOptional()
  @IsString()
  volumeMax?: string = '';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  toFilterParams() {
    return {
      symbols: parsePairCurrencyListParam(this.symbols),
      currencies: parsePairCurrencyListParam(this.currencies),
      buy: this.buy !== false,
      sell: this.sell !== false,
      profitMin: this.profitMin ?? '',
      profitMax: this.profitMax ?? '',
      holdMin: this.holdMin ?? '',
      holdMax: this.holdMax ?? '',
      volumeMin: this.volumeMin ?? '',
      volumeMax: this.volumeMax ?? '',
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
    };
  }
}
