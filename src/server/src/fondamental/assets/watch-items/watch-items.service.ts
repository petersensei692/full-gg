import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchItem, Thesis } from './entities/watch-item.entity';
import { CreateWatchItemDto } from './dto/create-watch-item.dto';
import { UpdateWatchItemDto } from './dto/update-watch-item.dto';
import { WeeklyWatchlist } from '../../weekly/weekly-watchlist/entities/weekly-watchlist.entity';
import { Asset } from '../entities/asset.entity';

@Injectable()
export class WatchItemsService {
  constructor(
    @InjectRepository(WatchItem)
    private readonly watchItemRepository: Repository<WatchItem>,
    @InjectRepository(WeeklyWatchlist)
    private readonly weeklyWatchlistRepository: Repository<WeeklyWatchlist>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async create(createDto: CreateWatchItemDto): Promise<WatchItem> {
    const watchlist = await this.weeklyWatchlistRepository.findOne({
      where: { id: createDto.watchlistId },
    });
    if (!watchlist) {
      throw new NotFoundException(
        `Weekly watchlist with id ${createDto.watchlistId} not found`,
      );
    }

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

    const watchItem = this.watchItemRepository.create({
      watchlist,
      baseAsset,
      quoteAsset,
      pairName: createDto.pairName,
      bias: createDto.bias,
      thesis: createDto.thesis || null,
    });

    return this.watchItemRepository.save(watchItem);
  }

  async findAll(): Promise<WatchItem[]> {
    return this.watchItemRepository.find({
      relations: ['watchlist', 'baseAsset', 'quoteAsset'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<WatchItem> {
    const watchItem = await this.watchItemRepository.findOne({
      where: { id },
      relations: ['watchlist', 'baseAsset', 'quoteAsset'],
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
        // For partial updates, merge with existing thesis if it exists
        const existingThesis = watchItem.thesis;
        const thesis: Thesis = {
          notes: updateDto.thesis.notes ?? existingThesis?.notes ?? '',
          images: updateDto.thesis.images ?? existingThesis?.images,
        };
        watchItem.thesis = thesis;
      }
    }

    return this.watchItemRepository.save(watchItem);
  }

  async remove(id: string): Promise<void> {
    const watchItem = await this.findOne(id);
    await this.watchItemRepository.remove(watchItem);
  }
}
