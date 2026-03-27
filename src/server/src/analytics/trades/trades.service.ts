import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from './entities/trade.entity';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { WatchItem } from '../../fondamental/assets/watch-items/entities/watch-item.entity';
import { PairPipsValue } from '../pairs-pips-values/entities/pair-pips-value.entity';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(Trade)
    private readonly tradesRepository: Repository<Trade>,
    @InjectRepository(WatchItem)
    private readonly watchItemsRepository: Repository<WatchItem>,
    @InjectRepository(PairPipsValue)
    private readonly pairsPipsRepository: Repository<PairPipsValue>,
  ) {}

  private normalizePair(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private inferFallbackPipStep(pair: string): number {
    const normalized = this.normalizePair(pair);
    if (normalized.includes('JPY')) return 0.01;
    if (normalized.startsWith('XAU') || normalized.startsWith('WTI')) return 0.01;
    if (normalized.startsWith('XAG')) return 0.001;
    return 0.0001;
  }

  private async resolvePipStep(pair: string): Promise<number> {
    const normalized = this.normalizePair(pair);
    const all = await this.pairsPipsRepository.find();
    const match = all.find((row) => this.normalizePair(row.pair) === normalized);
    if (match) return match.pairFormat;
    return this.inferFallbackPipStep(pair);
  }

  private async recalculateProfitFactorEarned(trade: Trade): Promise<void> {
    const closePrices = trade.closePrices ?? [];
    if (closePrices.length === 0) {
      trade.profitFactorEarned = { earnings: [], earningsNumber: 0, totalEarned: 0 };
      return;
    }

    const riskPriceAbs = Math.abs(trade.executionPrice - trade.initialSlPrice);
    if (riskPriceAbs <= 0 || trade.positionSize <= 0) {
      trade.profitFactorEarned = { earnings: [], earningsNumber: 0, totalEarned: 0 };
      return;
    }

    const pipStep = await this.resolvePipStep(trade.pair);
    const riskPips = riskPriceAbs / pipStep;
    if (riskPips <= 0) {
      trade.profitFactorEarned = { earnings: [], earningsNumber: 0, totalEarned: 0 };
      return;
    }

    let cumulative = 0;
    const earnings = closePrices.map((c) => {
      const priceDelta =
        trade.type === 'buy'
          ? c.price - trade.executionPrice
          : trade.executionPrice - c.price;
      const closePips = priceDelta / pipStep;
      const sizeWeight = c.lots / trade.positionSize;
      const rawEarnedR = (closePips / riskPips) * sizeWeight;
      const remainingAllowedLoss = -1 - cumulative;
      const earnedR = rawEarnedR < remainingAllowedLoss ? remainingAllowedLoss : rawEarnedR;
      cumulative += earnedR;
      return { earnedR };
    });
    const totalEarned = earnings.reduce((sum, item) => sum + item.earnedR, 0);

    trade.profitFactorEarned = {
      earnings,
      earningsNumber: earnings.length,
      totalEarned,
    };
  }

  private sanitizeClosePrices(trade: Trade, closePrices: Trade['closePrices']): Trade['closePrices'] {
    const positionSize = trade.positionSize;
    if (positionSize <= 0) return [];
    let remaining = positionSize;
    const sanitized: Trade['closePrices'] = [];

    for (const item of closePrices) {
      if (remaining <= 0) break;
      let lots = Math.max(0, item.lots);
      if (item.type === 'fullClose') {
        lots = remaining;
      } else {
        lots = Math.min(lots, remaining);
      }
      const percentage = (lots / positionSize) * 100;
      sanitized.push({
        ...item,
        lots,
        percentage,
      });
      remaining -= lots;
    }
    return sanitized;
  }

  private applyLifecycleFields(trade: Trade): void {
    const totalClosedLots = (trade.closePrices ?? []).reduce((sum, c) => sum + c.lots, 0);
    const isFullyClosed = totalClosedLots >= trade.positionSize - 1e-9;
    const hasAnyClose = totalClosedLots > 0;

    if (isFullyClosed) {
      trade.status = 'fullyClosed';
      const latestClose = trade.closePrices[trade.closePrices.length - 1];
      trade.tradeCloseTime = latestClose ? new Date(latestClose.time) : trade.tradeCloseTime;
      return;
    }

    if (hasAnyClose) {
      trade.status = 'partlyClosed';
      trade.tradeCloseTime = null;
      return;
    }

    if (trade.status !== 'pending' && trade.status !== 'cancelled') {
      trade.status = 'executed';
    }
    trade.tradeCloseTime = null;
  }

  private async resolvePairWatched(pairWatchedId?: string | null): Promise<WatchItem | null> {
    if (pairWatchedId == null) return null;
    const pairWatched = await this.watchItemsRepository.findOne({
      where: { id: pairWatchedId },
      relations: ['baseAsset', 'quoteAsset', 'watchlist'],
    });
    if (!pairWatched) {
      throw new NotFoundException(`Watch item with id ${pairWatchedId} not found`);
    }
    return pairWatched;
  }

  async create(dto: CreateTradeDto): Promise<Trade> {
    const pairWatched = await this.resolvePairWatched(dto.pairWatchedId);
    const pair = dto.pair?.trim() || pairWatched?.pairName;
    if (!pair) {
      throw new BadRequestException('pair is required when pairWatchedId is not provided');
    }

    const trade = this.tradesRepository.create({
      pair,
      type: dto.type,
      executionType: dto.executionType,
      executionTime: new Date(dto.executionTime),
      executionPrice: dto.executionPrice,
      tpPrice: dto.tpPrice,
      initialSlPrice: dto.initialSlPrice,
      slEvolution: dto.slEvolution ?? [],
      profitFactorTargeted: dto.profitFactorTargeted,
      profitFactorEarned: {
        earnings: dto.profitFactorEarned.earnings ?? [],
        earningsNumber: dto.profitFactorEarned.earningsNumber,
        totalEarned: dto.profitFactorEarned.totalEarned,
      },
      positionSize: dto.positionSize,
      closePrices: dto.closePrices ?? [],
      tradeCloseTime: dto.tradeCloseTime ? new Date(dto.tradeCloseTime) : null,
      status: dto.status,
      trackNotes: (dto.trackNotes ?? []).map((n) => ({
        text: n.text,
        images: n.images ?? [],
      })),
      pairWatched,
    });

    trade.closePrices = this.sanitizeClosePrices(trade, trade.closePrices ?? []);
    this.applyLifecycleFields(trade);

    await this.recalculateProfitFactorEarned(trade);

    return this.tradesRepository.save(trade);
  }

  async findAll(): Promise<Trade[]> {
    return this.tradesRepository.find({
      relations: ['pairWatched', 'pairWatched.baseAsset', 'pairWatched.quoteAsset'],
      order: { executionTime: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Trade> {
    const trade = await this.tradesRepository.findOne({
      where: { id },
      relations: ['pairWatched', 'pairWatched.baseAsset', 'pairWatched.quoteAsset'],
    });
    if (!trade) {
      throw new NotFoundException(`Trade with id ${id} not found`);
    }
    return trade;
  }

  async update(id: string, dto: UpdateTradeDto): Promise<Trade> {
    const trade = await this.findOne(id);

    if (dto.pairWatchedId !== undefined) {
      trade.pairWatched = await this.resolvePairWatched(dto.pairWatchedId);
    }
    if (dto.pair !== undefined) trade.pair = dto.pair.trim();
    if (dto.type !== undefined) trade.type = dto.type;
    if (dto.executionType !== undefined) trade.executionType = dto.executionType;
    if (dto.executionTime !== undefined) trade.executionTime = new Date(dto.executionTime);
    if (dto.executionPrice !== undefined) trade.executionPrice = dto.executionPrice;
    if (dto.tpPrice !== undefined) trade.tpPrice = dto.tpPrice;
    if (dto.initialSlPrice !== undefined) trade.initialSlPrice = dto.initialSlPrice;
    if (dto.slEvolution !== undefined) trade.slEvolution = dto.slEvolution;
    if (dto.profitFactorTargeted !== undefined) trade.profitFactorTargeted = dto.profitFactorTargeted;
    if (dto.positionSize !== undefined) trade.positionSize = dto.positionSize;
    if (dto.closePrices !== undefined) {
      trade.closePrices = dto.closePrices
        .filter((c) => c.price !== undefined && c.type !== undefined && c.lots !== undefined && c.percentage !== undefined && c.time !== undefined)
        .map((c) => ({
          price: c.price as number,
          type: c.type as 'fullClose' | 'partClose',
          lots: c.lots as number,
          percentage: c.percentage as number,
          time: c.time as string,
        }));
    }
    if (dto.tradeCloseTime !== undefined) {
      trade.tradeCloseTime = dto.tradeCloseTime ? new Date(dto.tradeCloseTime) : null;
    }
    if (dto.status !== undefined) trade.status = dto.status;
    if (dto.trackNotes !== undefined) {
      trade.trackNotes = dto.trackNotes.map((n) => ({
        text: n.text ?? '',
        images: n.images ?? [],
      }));
    }
    if (dto.profitFactorEarned !== undefined) {
      const existing = trade.profitFactorEarned;
      trade.profitFactorEarned = {
        earnings: (dto.profitFactorEarned.earnings ?? existing.earnings ?? [])
          .filter((e) => e.earnedR !== undefined)
          .map((e) => ({ earnedR: e.earnedR as number })),
        earningsNumber: dto.profitFactorEarned.earningsNumber ?? existing.earningsNumber ?? 0,
        totalEarned: dto.profitFactorEarned.totalEarned ?? existing.totalEarned ?? 0,
      };
    }

    trade.closePrices = this.sanitizeClosePrices(trade, trade.closePrices ?? []);
    this.applyLifecycleFields(trade);
    await this.recalculateProfitFactorEarned(trade);

    if (!trade.pair?.trim()) {
      throw new BadRequestException('pair must not be empty');
    }

    return this.tradesRepository.save(trade);
  }

  async remove(id: string): Promise<void> {
    const trade = await this.findOne(id);
    await this.tradesRepository.remove(trade);
  }
}
