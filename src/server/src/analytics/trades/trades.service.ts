import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from './entities/trade.entity';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { WatchItem } from '../../fondamental/assets/watch-items/entities/watch-item.entity';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(Trade)
    private readonly tradesRepository: Repository<Trade>,
    @InjectRepository(WatchItem)
    private readonly watchItemsRepository: Repository<WatchItem>,
  ) {}

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
      slPrice: dto.slPrice,
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
    if (dto.slPrice !== undefined) trade.slPrice = dto.slPrice;
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
