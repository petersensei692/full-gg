import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetWatchlist } from './entities/asset-watchlist.entity';
import { WeeklyWatchlist } from '../entities/weekly-watchlist.entity';
import { Asset } from '../../../assets/entities/asset.entity';

@Injectable()
export class AssetWatchlistService {
  constructor(
    @InjectRepository(AssetWatchlist)
    private readonly assetWatchlistRepository: Repository<AssetWatchlist>,
    @InjectRepository(WeeklyWatchlist)
    private readonly weeklyWatchlistRepository: Repository<WeeklyWatchlist>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async createManyForAllAssets(
    weeklyWatchlist: WeeklyWatchlist,
  ): Promise<AssetWatchlist[]> {
    const assets = await this.assetRepository.find({ order: { name: 'ASC' } });
    if (assets.length === 0) {
      return [];
    }
    const entities = assets.map((asset) =>
      this.assetWatchlistRepository.create({
        weeklyWatchlist,
        asset,
        startDate: weeklyWatchlist.startDate,
        endDate: weeklyWatchlist.endDate,
      }),
    );
    return this.assetWatchlistRepository.save(entities);
  }

  async findByAsset(assetId: string): Promise<AssetWatchlist[]> {
    return this.assetWatchlistRepository.find({
      where: { asset: { id: assetId } },
      relations: ['weeklyWatchlist', 'asset'],
      order: { startDate: 'ASC' },
    });
  }

  async findByWeeklyWatchlist(
    weeklyWatchlistId: string,
  ): Promise<AssetWatchlist[]> {
    return this.assetWatchlistRepository.find({
      where: { weeklyWatchlist: { id: weeklyWatchlistId } },
      relations: ['weeklyWatchlist', 'asset'],
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<AssetWatchlist> {
    const aw = await this.assetWatchlistRepository.findOne({
      where: { id },
      relations: ['weeklyWatchlist', 'asset'],
    });
    if (!aw) {
      throw new NotFoundException(
        `Asset watchlist with id ${id} not found`,
      );
    }
    return aw;
  }

  async removeByWeeklyWatchlist(weeklyWatchlistId: string): Promise<void> {
    await this.assetWatchlistRepository.delete({
      weeklyWatchlist: { id: weeklyWatchlistId },
    });
  }

  async updateDatesByWeeklyWatchlist(
    weeklyWatchlistId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    await this.assetWatchlistRepository.update(
      { weeklyWatchlist: { id: weeklyWatchlistId } },
      { startDate, endDate },
    );
  }
}
