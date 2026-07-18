import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchItem, Thesis } from './entities/watch-item.entity';
import { CreateWatchItemDto } from './dto/create-watch-item.dto';
import { UpdateWatchItemDto } from './dto/update-watch-item.dto';
import { WeeklyWatchlist } from '../../weekly/weekly-watchlist/entities/weekly-watchlist.entity';
import { AssetWatchlist } from '../../weekly/weekly-watchlist/asset-watchlist/entities/asset-watchlist.entity';
import { Asset } from '../entities/asset.entity';
import { Pair } from '../../../analytics/pairs/entities/pair.entity';

@Injectable()
export class WatchItemsService {
  constructor(
    @InjectRepository(WatchItem)
    private readonly watchItemRepository: Repository<WatchItem>,
    @InjectRepository(WeeklyWatchlist)
    private readonly weeklyWatchlistRepository: Repository<WeeklyWatchlist>,
    @InjectRepository(AssetWatchlist)
    private readonly assetWatchlistRepository: Repository<AssetWatchlist>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Pair)
    private readonly pairsRepository: Repository<Pair>,
  ) {}

  private normalizePair(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private async loadCatalogPair(tradingPairId: string): Promise<Pair> {
    const pair = await this.pairsRepository.findOne({
      where: { id: tradingPairId },
      relations: ['baseAsset', 'quoteAsset'],
    });
    if (!pair) {
      throw new NotFoundException(`Trading pair ${tradingPairId} not found`);
    }
    return pair;
  }

  private assertAwMatchesPair(
    pair: Pair,
    baseAW: AssetWatchlist | null,
    quoteAW: AssetWatchlist | null,
  ): void {
    if (baseAW && baseAW.asset?.id && baseAW.asset.id !== pair.baseAssetId) {
      throw new BadRequestException(
        'Base asset watchlist does not match the catalog pair base asset',
      );
    }
    if (quoteAW && quoteAW.asset?.id && quoteAW.asset.id !== pair.quoteAssetId) {
      throw new BadRequestException(
        'Quote asset watchlist does not match the catalog pair quote asset',
      );
    }
  }

  /** Backfill trading_pair_id from denormalized pairName / assets. */
  async backfillTradingPairIds(): Promise<number> {
    const allPairs = await this.pairsRepository.find({
      relations: ['baseAsset', 'quoteAsset'],
    });
    const byNorm = new Map(allPairs.map((p) => [this.normalizePair(p.pair), p]));
    const byAssets = new Map(
      allPairs.map((p) => [`${p.baseAssetId}:${p.quoteAssetId}`, p]),
    );
    const items = await this.watchItemRepository.find({
      relations: ['baseAsset', 'quoteAsset'],
    });
    let n = 0;
    for (const item of items) {
      if (item.tradingPairId) continue;
      const byName = byNorm.get(this.normalizePair(item.pairName));
      const byAsset =
        item.baseAsset?.id && item.quoteAsset?.id
          ? byAssets.get(`${item.baseAsset.id}:${item.quoteAsset.id}`)
          : undefined;
      const match = byName ?? byAsset;
      if (!match) continue;
      item.tradingPairId = match.id;
      item.tradingPair = match;
      item.baseAsset = match.baseAsset;
      item.quoteAsset = match.quoteAsset;
      item.pairName = match.pair;
      await this.watchItemRepository.save(item);
      n++;
    }
    return n;
  }

  async create(createDto: CreateWatchItemDto): Promise<WatchItem> {
    const catalogPair = await this.loadCatalogPair(createDto.tradingPairId);
    const baseAsset = catalogPair.baseAsset;
    const quoteAsset = catalogPair.quoteAsset;

    let watchlist: WeeklyWatchlist | null = null;
    let baseAssetWatchlist: AssetWatchlist | null = null;
    let quoteAssetWatchlist: AssetWatchlist | null = null;

    if (createDto.baseAssetWatchlistId && createDto.quoteAssetWatchlistId) {
      const baseAW = await this.assetWatchlistRepository.findOne({
        where: { id: createDto.baseAssetWatchlistId },
        relations: ['weeklyWatchlist', 'asset'],
      });
      if (!baseAW) {
        throw new NotFoundException(
          `Base asset watchlist with id ${createDto.baseAssetWatchlistId} not found`,
        );
      }
      const quoteAW = await this.assetWatchlistRepository.findOne({
        where: { id: createDto.quoteAssetWatchlistId },
        relations: ['weeklyWatchlist', 'asset'],
      });
      if (!quoteAW) {
        throw new NotFoundException(
          `Quote asset watchlist with id ${createDto.quoteAssetWatchlistId} not found`,
        );
      }
      if (baseAW.weeklyWatchlist.id !== quoteAW.weeklyWatchlist.id) {
        throw new BadRequestException(
          'Base and quote asset watchlists must belong to the same weekly watchlist',
        );
      }
      this.assertAwMatchesPair(catalogPair, baseAW, quoteAW);
      baseAssetWatchlist = baseAW;
      quoteAssetWatchlist = quoteAW;
      watchlist = baseAW.weeklyWatchlist;
    } else if (createDto.watchlistId) {
      const wl = await this.weeklyWatchlistRepository.findOne({
        where: { id: createDto.watchlistId },
      });
      if (!wl) {
        throw new NotFoundException(
          `Weekly watchlist with id ${createDto.watchlistId} not found`,
        );
      }
      watchlist = wl;
      const baseAW = await this.assetWatchlistRepository.findOne({
        where: { weeklyWatchlist: { id: wl.id }, asset: { id: baseAsset.id } },
        relations: ['weeklyWatchlist', 'asset'],
      });
      const quoteAW = await this.assetWatchlistRepository.findOne({
        where: { weeklyWatchlist: { id: wl.id }, asset: { id: quoteAsset.id } },
        relations: ['weeklyWatchlist', 'asset'],
      });
      baseAssetWatchlist = baseAW ?? null;
      quoteAssetWatchlist = quoteAW ?? null;
    } else {
      throw new BadRequestException(
        'Provide either baseAssetWatchlistId+quoteAssetWatchlistId or watchlistId',
      );
    }

    const watchItem = this.watchItemRepository.create({
      watchlist,
      baseAssetWatchlist,
      quoteAssetWatchlist,
      tradingPairId: catalogPair.id,
      tradingPair: catalogPair,
      baseAsset,
      quoteAsset,
      pairName: catalogPair.pair,
      bias: createDto.bias,
      thesis: createDto.thesis || null,
      finished: createDto.finished ?? false,
      linkedBaseAnalysisIds:
        createDto.linkedBaseAnalysisIds && createDto.linkedBaseAnalysisIds.length > 0
          ? createDto.linkedBaseAnalysisIds
          : null,
      linkedQuoteAnalysisIds:
        createDto.linkedQuoteAnalysisIds && createDto.linkedQuoteAnalysisIds.length > 0
          ? createDto.linkedQuoteAnalysisIds
          : null,
    });

    return this.watchItemRepository.save(watchItem);
  }

  async findAll(): Promise<WatchItem[]> {
    return this.watchItemRepository.find({
      relations: [
        'watchlist',
        'baseAsset',
        'quoteAsset',
        'tradingPair',
        'baseAssetWatchlist',
        'baseAssetWatchlist.weeklyWatchlist',
        'baseAssetWatchlist.asset',
        'quoteAssetWatchlist',
        'quoteAssetWatchlist.weeklyWatchlist',
        'quoteAssetWatchlist.asset',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<WatchItem> {
    const watchItem = await this.watchItemRepository.findOne({
      where: { id },
      relations: [
        'watchlist',
        'baseAsset',
        'quoteAsset',
        'tradingPair',
        'baseAssetWatchlist',
        'baseAssetWatchlist.weeklyWatchlist',
        'baseAssetWatchlist.asset',
        'quoteAssetWatchlist',
        'quoteAssetWatchlist.weeklyWatchlist',
        'quoteAssetWatchlist.asset',
      ],
    });
    if (!watchItem) {
      throw new NotFoundException(`Watch item with id ${id} not found`);
    }
    return watchItem;
  }

  async update(id: string, updateDto: UpdateWatchItemDto): Promise<WatchItem> {
    const watchItem = await this.findOne(id);

    if (updateDto.watchlistId) {
      const watchlist = await this.weeklyWatchlistRepository.findOne({
        where: { id: updateDto.watchlistId },
      });
      if (!watchlist) {
        throw new NotFoundException(
          `Weekly watchlist with id ${updateDto.watchlistId} not found`,
        );
      }
      watchItem.watchlist = watchlist;
    }

    if (updateDto.tradingPairId !== undefined) {
      const catalogPair = await this.loadCatalogPair(updateDto.tradingPairId);
      this.assertAwMatchesPair(
        catalogPair,
        watchItem.baseAssetWatchlist,
        watchItem.quoteAssetWatchlist,
      );
      watchItem.tradingPairId = catalogPair.id;
      watchItem.tradingPair = catalogPair;
      watchItem.baseAsset = catalogPair.baseAsset;
      watchItem.quoteAsset = catalogPair.quoteAsset;
      watchItem.pairName = catalogPair.pair;
    }

    if (updateDto.bias !== undefined) {
      watchItem.bias = updateDto.bias;
    }
    if (updateDto.thesis !== undefined) {
      if (updateDto.thesis === null) {
        watchItem.thesis = null;
      } else {
        const existingThesis = watchItem.thesis;
        const thesis: Thesis = {
          notes: updateDto.thesis.notes ?? existingThesis?.notes ?? '',
          images: updateDto.thesis.images ?? existingThesis?.images,
          imageNames: updateDto.thesis.imageNames ?? existingThesis?.imageNames,
        };
        watchItem.thesis = thesis;
      }
    }
    if (updateDto.finished !== undefined) {
      watchItem.finished = updateDto.finished;
    }
    if (updateDto.linkedBaseAnalysisIds !== undefined) {
      watchItem.linkedBaseAnalysisIds =
        updateDto.linkedBaseAnalysisIds.length > 0 ? updateDto.linkedBaseAnalysisIds : null;
    }
    if (updateDto.linkedQuoteAnalysisIds !== undefined) {
      watchItem.linkedQuoteAnalysisIds =
        updateDto.linkedQuoteAnalysisIds.length > 0 ? updateDto.linkedQuoteAnalysisIds : null;
    }

    return this.watchItemRepository.save(watchItem);
  }

  async remove(id: string): Promise<void> {
    const watchItem = await this.findOne(id);
    await this.watchItemRepository.remove(watchItem);
  }
}
