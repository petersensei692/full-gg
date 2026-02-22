import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetCalendar } from './entities/asset-calendar.entity';
import { WeeklyCalendar } from '../entities/weekly-calendar.entity';
import { Asset } from '../../../assets/entities/asset.entity';

@Injectable()
export class AssetCalendarService {
  constructor(
    @InjectRepository(AssetCalendar)
    private readonly assetCalendarRepository: Repository<AssetCalendar>,
    @InjectRepository(WeeklyCalendar)
    private readonly weeklyCalendarRepository: Repository<WeeklyCalendar>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async createManyForAllAssets(
    weeklyCalendar: WeeklyCalendar,
  ): Promise<AssetCalendar[]> {
    const assets = await this.assetRepository.find({ order: { name: 'ASC' } });
    if (assets.length === 0) {
      return [];
    }
    const entities = assets.map((asset) =>
      this.assetCalendarRepository.create({
        weeklyCalendar,
        asset,
        startDate: weeklyCalendar.startDate,
        endDate: weeklyCalendar.endDate,
      }),
    );
    return this.assetCalendarRepository.save(entities);
  }

  async findByAsset(assetId: string): Promise<AssetCalendar[]> {
    return this.assetCalendarRepository.find({
      where: { asset: { id: assetId } },
      relations: ['weeklyCalendar', 'asset'],
      order: { startDate: 'ASC' },
    });
  }

  async findByWeeklyCalendar(
    weeklyCalendarId: string,
  ): Promise<AssetCalendar[]> {
    return this.assetCalendarRepository.find({
      where: { weeklyCalendar: { id: weeklyCalendarId } },
      relations: ['weeklyCalendar', 'asset'],
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<AssetCalendar> {
    const assetCalendar = await this.assetCalendarRepository.findOne({
      where: { id },
      relations: ['weeklyCalendar', 'asset'],
    });
    if (!assetCalendar) {
      throw new NotFoundException(
        `Asset calendar with id ${id} not found`,
      );
    }
    return assetCalendar;
  }

  async removeByWeeklyCalendar(weeklyCalendarId: string): Promise<void> {
    await this.assetCalendarRepository.delete({
      weeklyCalendar: { id: weeklyCalendarId },
    });
  }

  async updateDatesByWeeklyCalendar(
    weeklyCalendarId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    await this.assetCalendarRepository.update(
      { weeklyCalendar: { id: weeklyCalendarId } },
      { startDate, endDate },
    );
  }
}
