import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchItem, Thesis } from './entities/watch-item.entity';
import { CreateWatchItemDto } from './dto/create-watch-item.dto';
import { UpdateWatchItemDto } from './dto/update-watch-item.dto';
import { WeeklyWatchlist } from '../../weekly/weekly-watchlist/entities/weekly-watchlist.entity';
import { AssetWatchlist } from '../../weekly/weekly-watchlist/asset-watchlist/entities/asset-watchlist.entity';
import { Asset } from '../entities/asset.entity';

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
  ) {}

  async create(createDto: CreateWatchItemDto): Promise<WatchItem> {
    const baseAsset = await this.assetRepository.findOne({
      where: { id: createDto.baseAssetId },
    });
    if (!baseAsset) {
      throw new NotFoundException(
        `Base asset with id ${createDto.baseAssetId} not found`,
      );
    }

    const quoteAsset = await this.assetRepository.findOne({
      where: { id: createDto.quoteAssetId },
    });
    if (!quoteAsset) {
      throw new NotFoundException(
        `Quote asset with id ${createDto.quoteAssetId} not found`,
      );
    }

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
      baseAsset,
      quoteAsset,
      pairName: createDto.pairName,
      bias: createDto.bias,
      thesis: createDto.thesis || null,
      finished: createDto.finished ?? false,
    });

    return this.watchItemRepository.save(watchItem);
  }

  async findAll(): Promise<WatchItem[]> {
    return this.watchItemRepository.find({
      relations: [
        'watchlist',
        'baseAsset',
        'quoteAsset',
        'baseAssetWatchlist',
        'baseAssetWatchlist.weeklyWatchlist',
        'quoteAssetWatchlist',
        'quoteAssetWatchlist.weeklyWatchlist',
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
        'baseAssetWatchlist',
        'baseAssetWatchlist.weeklyWatchlist',
        'quoteAssetWatchlist',
        'quoteAssetWatchlist.weeklyWatchlist',
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

    if (updateDto.baseAssetId) {
      const baseAsset = await this.assetRepository.findOne({
        where: { id: updateDto.baseAssetId },
      });
      if (!baseAsset) {
        throw new NotFoundException(
          `Base asset with id ${updateDto.baseAssetId} not found`,
        );
      }
      watchItem.baseAsset = baseAsset;
    }

    if (updateDto.quoteAssetId) {
      const quoteAsset = await this.assetRepository.findOne({
        where: { id: updateDto.quoteAssetId },
      });
      if (!quoteAsset) {
        throw new NotFoundException(
          `Quote asset with id ${updateDto.quoteAssetId} not found`,
        );
      }
      watchItem.quoteAsset = quoteAsset;
    }

    if (updateDto.pairName !== undefined) {
      watchItem.pairName = updateDto.pairName;
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

    return this.watchItemRepository.save(watchItem);
  }

  async remove(id: string): Promise<void> {
    const watchItem = await this.findOne(id);
    await this.watchItemRepository.remove(watchItem);
  }
}
