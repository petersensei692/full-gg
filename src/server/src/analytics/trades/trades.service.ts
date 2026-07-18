import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade, TradeNote } from './entities/trade.entity';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { WatchItem } from '../../fondamental/assets/watch-items/entities/watch-item.entity';
import { Pair } from '../pairs/entities/pair.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { Asset } from '../../fondamental/assets/entities/asset.entity';
import { AnalysisService } from '../../fondamental/assets/analysis/analysis.service';
import { splitPairSymbol } from '../analytics-pair-filters';
import { tradeMatchesListFilters, type TradeListFilterParams } from './trade-list-filter.util';
import type { QueryTradesDto } from './dto/query-trades.dto';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(Trade)
    private readonly tradesRepository: Repository<Trade>,
    @InjectRepository(WatchItem)
    private readonly watchItemsRepository: Repository<WatchItem>,
    @InjectRepository(Pair)
    private readonly pairsRepository: Repository<Pair>,
    @InjectRepository(Strategy)
    private readonly strategiesRepository: Repository<Strategy>,
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
    private readonly analysisService: AnalysisService,
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

  private async resolvePipStepForTrade(trade: Trade): Promise<number> {
    if (trade.pairId) {
      const row =
        trade.tradingPair ??
        (await this.pairsRepository.findOne({ where: { id: trade.pairId } }));
      if (row) return row.pairFormat;
    }
    const normalized = this.normalizePair(trade.pair);
    const all = await this.pairsRepository.find();
    const match = all.find((row) => this.normalizePair(row.pair) === normalized);
    if (match) return match.pairFormat;
    return this.inferFallbackPipStep(trade.pair);
  }

  private assertCatalogPairTradable(match: Pair): void {
    if (match.pipValue == null) {
      throw new BadRequestException(
        `No pip value configured for ${match.pair}. Set it on the Pairs page.`,
      );
    }
    if (match.baseAsset && !match.baseAsset.isTradable) {
      throw new BadRequestException(
        `Base asset ${match.baseAsset.name} is not tradable. Enable it on Assets.`,
      );
    }
    if (match.quoteAsset && !match.quoteAsset.isTradable) {
      throw new BadRequestException(
        `Quote asset ${match.quoteAsset.name} is not tradable. Enable it on Assets.`,
      );
    }
  }

  private async loadCatalogPair(pairId: string): Promise<Pair> {
    const match = await this.pairsRepository.findOne({
      where: { id: pairId },
      relations: ['baseAsset', 'quoteAsset'],
    });
    if (!match) {
      throw new NotFoundException(`Trading pair ${pairId} not found`);
    }
    this.assertCatalogPairTradable(match);
    return match;
  }

  private async resolveStrategy(strategyId: string): Promise<Strategy> {
    const strategy = await this.strategiesRepository.findOne({
      where: { id: strategyId },
    });
    if (!strategy) {
      throw new NotFoundException(`Strategy with id ${strategyId} not found`);
    }
    return strategy;
  }

  /** Backfill pair_id on trades that only have a denormalized pair string. */
  async backfillTradePairIds(): Promise<number> {
    const allPairs = await this.pairsRepository.find();
    const byNorm = new Map(allPairs.map((p) => [this.normalizePair(p.pair), p]));
    const allTrades = await this.tradesRepository.find();
    let n = 0;
    for (const t of allTrades) {
      if (t.pairId) continue;
      const match = byNorm.get(this.normalizePair(t.pair));
      if (!match) continue;
      t.pairId = match.id;
      t.tradingPair = match;
      t.pair = match.pair;
      await this.tradesRepository.save(t);
      n++;
    }
    return n;
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

    const pipStep = await this.resolvePipStepForTrade(trade);
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
    if (pairWatchedId == null || pairWatchedId === '') return null;
    const pairWatched = await this.watchItemsRepository.findOne({
      where: { id: pairWatchedId },
      relations: ['baseAsset', 'quoteAsset', 'watchlist', 'tradingPair'],
    });
    if (!pairWatched) {
      throw new NotFoundException(`Watch item with id ${pairWatchedId} not found`);
    }
    return pairWatched;
  }

  private assertWatchMatchesTradePair(trade: Trade, pairWatched: WatchItem | null): void {
    if (!pairWatched?.tradingPairId || !trade.pairId) return;
    if (pairWatched.tradingPairId !== trade.pairId) {
      throw new BadRequestException(
        'Linked watch item does not match the selected trading pair',
      );
    }
  }

  private async syncWatchItemFinished(watchItemId: string, finished: boolean): Promise<void> {
    await this.watchItemsRepository.update({ id: watchItemId }, { finished });
  }

  /**
   * Standard reward:risk in price space (same as pip space): reward distance / stop distance.
   * Buy: |TP − entry| / |entry − SL|; sell: |entry − TP| / |SL − entry|.
   */
  private computeProfitFactorTargetedFromPrices(
    type: Trade['type'],
    entry: number,
    tp: number,
    sl: number,
  ): number {
    const riskAbs = type === 'buy' ? Math.abs(entry - sl) : Math.abs(sl - entry);
    const rewardAbs = type === 'buy' ? Math.abs(tp - entry) : Math.abs(entry - tp);
    if (!(riskAbs > 1e-12)) return 0;
    return rewardAbs / riskAbs;
  }

  private tradeNoteAnalysisBody(note: TradeNote): string {
    const textPart = note.text?.trim() ?? '';
    return `<!--analysis-type:tradeNote-->${textPart || '[Images]'}`;
  }

  private alignImageNameArray(incoming: string[] | undefined, prev: string[] | undefined, imageCount: number): string[] {
    const base = incoming ?? prev ?? [];
    const arr = [...base];
    while (arr.length < imageCount) arr.push('');
    return arr.slice(0, imageCount);
  }

  /** Merge client notes with preserved linked analysis IDs and image name alignment. */
  private mapDtoTrackNotes(prev: TradeNote[] | undefined, incoming: NonNullable<UpdateTradeDto['trackNotes']>): TradeNote[] {
    return incoming.map((n, i) => {
      const p = prev?.[i];
      const images = n.images ?? p?.images ?? [];
      const linkedFromClient = n.linkedAnalysisIds;
      const linked =
        Array.isArray(linkedFromClient) && linkedFromClient.length > 0
          ? linkedFromClient
          : (p?.linkedAnalysisIds ?? []);
      return {
        text: n.text !== undefined && n.text !== null ? n.text : (p?.text ?? ''),
        images,
        imageNames: this.alignImageNameArray(n.imageNames, p?.imageNames, images.length),
        linkedAnalysisIds: linked,
      };
    });
  }

  private mapCreateTrackNotes(incoming: NonNullable<CreateTradeDto['trackNotes']>): TradeNote[] {
    return incoming.map((n) => {
      const images = n.images ?? [];
      return {
        text: n.text ?? '',
        images,
        imageNames: this.alignImageNameArray(n.imageNames, undefined, images.length),
        linkedAnalysisIds: Array.isArray(n.linkedAnalysisIds) ? n.linkedAnalysisIds : [],
      };
    });
  }

  private async createTradeNoteAnalyses(trade: Trade, note: TradeNote): Promise<string[]> {
    const textPart = note.text?.trim() ?? '';
    const imgArr = note.images ?? [];
    if (!textPart && imgArr.length === 0) return [];
    const notesBody = this.tradeNoteAnalysisBody(note);
    const imgs = imgArr.length > 0 ? imgArr : null;
    const namesAligned = this.alignImageNameArray(note.imageNames, undefined, imgArr.length);
    const namesPayload = imgArr.length > 0 ? namesAligned : null;

    let baseCode: string | null = null;
    let quoteCode: string | null = null;
    if (trade.tradingPair?.baseAsset && trade.tradingPair?.quoteAsset) {
      baseCode = trade.tradingPair.baseAsset.name;
      quoteCode = trade.tradingPair.quoteAsset.name;
    } else if (trade.pairWatched?.baseAsset && trade.pairWatched?.quoteAsset) {
      baseCode = trade.pairWatched.baseAsset.name;
      quoteCode = trade.pairWatched.quoteAsset.name;
    } else {
      const sp = splitPairSymbol(trade.pair);
      if (sp) [baseCode, quoteCode] = sp;
    }
    if (!baseCode || !quoteCode) return [];

    const ids: string[] = [];
    for (const code of [baseCode, quoteCode]) {
      const asset = await this.assetsRepository.findOne({ where: { name: code } });
      if (!asset) continue;
      const created = await this.analysisService.create({
        assetId: asset.id,
        notes: notesBody,
        images: imgs ?? undefined,
        imageNames: namesPayload ?? undefined,
      });
      ids.push(created.id);
    }
    return ids;
  }

  private async syncLinkedTradeNoteAnalyses(note: TradeNote, analysisIds: string[]): Promise<void> {
    const notesBody = this.tradeNoteAnalysisBody(note);
    const imgArr = note.images ?? [];
    const imgs = imgArr.length > 0 ? imgArr : null;
    const namesAligned = this.alignImageNameArray(note.imageNames, undefined, imgArr.length);
    const namesPayload = imgArr.length > 0 ? namesAligned : null;
    for (const id of analysisIds) {
      await this.analysisService.updateFromTradeJournal(id, {
        notes: notesBody,
        images: imgs,
        imageNames: namesPayload,
      });
    }
  }

  private notesContentChanged(a: TradeNote | undefined, b: TradeNote): boolean {
    if (!a) return true;
    if (a.text !== b.text) return true;
    if (JSON.stringify(a.images ?? []) !== JSON.stringify(b.images ?? [])) return true;
    if (JSON.stringify(a.imageNames ?? []) !== JSON.stringify(b.imageNames ?? [])) return true;
    return false;
  }

  async create(dto: CreateTradeDto): Promise<Trade> {
    const catalogPair = await this.loadCatalogPair(dto.pairId);
    const strategy = await this.resolveStrategy(dto.strategyId);
    const pairWatched = await this.resolvePairWatched(dto.pairWatchedId);
    if (
      pairWatched?.tradingPairId &&
      pairWatched.tradingPairId !== catalogPair.id
    ) {
      throw new BadRequestException(
        'Linked watch item does not match the selected trading pair',
      );
    }

    const hasExec = dto.executionTime != null && String(dto.executionTime).trim() !== '';
    const executionTime = hasExec ? new Date(dto.executionTime as string) : null;
    const status = hasExec ? 'executed' : 'pending';

    const profitFactorTargeted = Number(
      this.computeProfitFactorTargetedFromPrices(
        dto.type,
        dto.executionPrice,
        dto.tpPrice,
        dto.initialSlPrice,
      ).toFixed(4),
    );

    const pfe = dto.profitFactorEarned;
    const trade = this.tradesRepository.create({
      pair: catalogPair.pair,
      pairId: catalogPair.id,
      tradingPair: catalogPair,
      strategyId: strategy.id,
      strategy,
      type: dto.type,
      executionType: dto.executionType,
      executionTime,
      executionPrice: dto.executionPrice,
      tpPrice: dto.tpPrice,
      initialSlPrice: dto.initialSlPrice,
      slEvolution: dto.slEvolution ?? [],
      profitFactorTargeted,
      profitFactorEarned: {
        earnings: pfe?.earnings ?? [],
        earningsNumber: pfe?.earningsNumber ?? 0,
        totalEarned: pfe?.totalEarned ?? 0,
      },
      positionSize: dto.positionSize,
      closePrices: dto.closePrices ?? [],
      tradeCloseTime: dto.tradeCloseTime ? new Date(dto.tradeCloseTime) : null,
      status,
      trackNotes: dto.trackNotes?.length ? this.mapCreateTrackNotes(dto.trackNotes) : [],
      pairWatched,
    });

    trade.closePrices = this.sanitizeClosePrices(trade, trade.closePrices ?? []);
    this.applyLifecycleFields(trade);

    await this.recalculateProfitFactorEarned(trade);

    const saved = await this.tradesRepository.save(trade);
    if (saved.pairWatched) {
      await this.syncWatchItemFinished(saved.pairWatched.id, true);
    }
    let out = saved;
    if (saved.trackNotes?.length) {
      const reloaded = await this.findOne(saved.id);
      let notes = [...reloaded.trackNotes];
      let changed = false;
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (n.linkedAnalysisIds?.length) continue;
        const ids = await this.createTradeNoteAnalyses(reloaded, n);
        if (ids.length > 0) {
          notes[i] = { ...n, linkedAnalysisIds: ids };
          changed = true;
        }
      }
      if (changed) {
        reloaded.trackNotes = notes;
        await this.tradesRepository.save(reloaded);
        out = await this.findOne(saved.id);
      } else {
        out = reloaded;
      }
    }
    return out;
  }

  async findAll(): Promise<Trade[]> {
    return this.tradesRepository.find({
      relations: ['pairWatched', 'pairWatched.baseAsset', 'pairWatched.quoteAsset'],
      order: { createdAt: 'DESC' },
    });
  }

  async distinctPairs(): Promise<string[]> {
    const rows = await this.tradesRepository
      .createQueryBuilder('t')
      .select('DISTINCT t.pair', 'pair')
      .orderBy('t.pair', 'ASC')
      .getRawMany<{ pair: string }>();
    return rows.map((r) => r.pair).filter(Boolean);
  }

  async findManyPaginated(
    dto: QueryTradesDto,
  ): Promise<{ items: Trade[]; total: number; page: number; limit: number }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 25;
    const filter: TradeListFilterParams = dto.toFilterParams();
    const all = await this.findAll();
    const filtered = all.filter((t) => tradeMatchesListFilters(t, filter));
    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Trade> {
    const trade = await this.tradesRepository.findOne({
      where: { id },
      relations: [
        'pairWatched',
        'pairWatched.baseAsset',
        'pairWatched.quoteAsset',
        'tradingPair',
        'tradingPair.baseAsset',
        'tradingPair.quoteAsset',
        'strategy',
      ],
    });
    if (!trade) {
      throw new NotFoundException(`Trade with id ${id} not found`);
    }
    return trade;
  }

  /** True when the PATCH may change how earned R is derived (SL moves alone must not). */
  private dtoAffectsEarnedR(dto: UpdateTradeDto): boolean {
    return (
      dto.closePrices !== undefined ||
      dto.executionPrice !== undefined ||
      dto.initialSlPrice !== undefined ||
      dto.positionSize !== undefined ||
      dto.type !== undefined ||
      dto.pairId !== undefined ||
      dto.profitFactorEarned !== undefined
    );
  }

  private linkedIdsKey(ids: string[] | undefined): string {
    return JSON.stringify([...(ids ?? [])].sort());
  }

  async update(id: string, dto: UpdateTradeDto): Promise<Trade> {
    const trade = await this.findOne(id);
    const prevNotesSnapshot: TradeNote[] = JSON.parse(JSON.stringify(trade.trackNotes ?? [])) as TradeNote[];
    const prevNotesLen = trade.trackNotes?.length ?? 0;
    const prevPairWatchedId = trade.pairWatched?.id ?? null;

    if (dto.pairWatchedId !== undefined) {
      const nextId = dto.pairWatchedId === '' ? null : dto.pairWatchedId;
      if (prevPairWatchedId && prevPairWatchedId !== nextId) {
        await this.syncWatchItemFinished(prevPairWatchedId, false);
      }
      trade.pairWatched = await this.resolvePairWatched(nextId ?? undefined);
      if (trade.pairWatched) {
        await this.syncWatchItemFinished(trade.pairWatched.id, true);
      }
    }
    if (dto.pairId !== undefined) {
      const catalogPair = await this.loadCatalogPair(dto.pairId);
      trade.pairId = catalogPair.id;
      trade.tradingPair = catalogPair;
      trade.pair = catalogPair.pair;
    }
    if (dto.strategyId !== undefined) {
      const strategy = await this.resolveStrategy(dto.strategyId);
      trade.strategyId = strategy.id;
      trade.strategy = strategy;
    }
    this.assertWatchMatchesTradePair(trade, trade.pairWatched);
    if (dto.type !== undefined) trade.type = dto.type;
    if (dto.executionType !== undefined) trade.executionType = dto.executionType;
    if (dto.executionTime !== undefined) {
      trade.executionTime =
        dto.executionTime != null && String(dto.executionTime).trim() !== ''
          ? new Date(dto.executionTime)
          : null;
    }
    if (dto.executionPrice !== undefined) trade.executionPrice = dto.executionPrice;
    if (dto.tpPrice !== undefined) trade.tpPrice = dto.tpPrice;
    if (dto.initialSlPrice !== undefined) trade.initialSlPrice = dto.initialSlPrice;
    if (dto.slEvolution !== undefined) trade.slEvolution = dto.slEvolution;
    if (dto.profitFactorTargeted !== undefined && Number.isFinite(dto.profitFactorTargeted)) {
      trade.profitFactorTargeted = dto.profitFactorTargeted;
    }
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
      trade.trackNotes = this.mapDtoTrackNotes(trade.trackNotes, dto.trackNotes);
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
    if (this.dtoAffectsEarnedR(dto)) {
      await this.recalculateProfitFactorEarned(trade);
    }

    if (!trade.pair?.trim()) {
      throw new BadRequestException('pair must not be empty');
    }

    await this.tradesRepository.save(trade);
    let reloaded = await this.findOne(id);

    if (dto.trackNotes !== undefined) {
      const next = reloaded.trackNotes ?? [];
      for (const note of next) {
        const ids = note.linkedAnalysisIds ?? [];
        if (ids.length === 0) continue;
        const key = this.linkedIdsKey(ids);
        const prevN = prevNotesSnapshot.find((p) => this.linkedIdsKey(p?.linkedAnalysisIds) === key);
        if (prevN != null && this.notesContentChanged(prevN, note)) {
          await this.syncLinkedTradeNoteAnalyses(note, ids);
        }
      }
      if (next.length > prevNotesLen) {
        const last = next[next.length - 1];
        const createdIds = await this.createTradeNoteAnalyses(reloaded, last);
        if (createdIds.length > 0) {
          const merged = next.map((n, i) =>
            i === next.length - 1 ? { ...n, linkedAnalysisIds: createdIds } : n,
          );
          reloaded.trackNotes = merged;
          await this.tradesRepository.save(reloaded);
          reloaded = await this.findOne(id);
        }
      }
    }

    return reloaded;
  }

  async remove(id: string): Promise<void> {
    const trade = await this.findOne(id);
    await this.tradesRepository.remove(trade);
  }
}
