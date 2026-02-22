import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyWatchlist } from './entities/weekly-watchlist.entity';
import { CreateWeeklyWatchlistDto } from './dto/create-weekly-watchlist.dto';
import { UpdateWeeklyWatchlistDto } from './dto/update-weekly-watchlist.dto';
import { AssetWatchlistService } from './asset-watchlist/asset-watchlist.service';

@Injectable()
export class WeeklyWatchlistService {
  constructor(
    @InjectRepository(WeeklyWatchlist)
    private readonly weeklyWatchlistRepository: Repository<WeeklyWatchlist>,
    private readonly assetWatchlistService: AssetWatchlistService,
  ) {}

  async create(
    createWeeklyWatchlistDto: CreateWeeklyWatchlistDto,
  ): Promise<WeeklyWatchlist> {
    const weeklyWatchlist =
      this.weeklyWatchlistRepository.create(createWeeklyWatchlistDto);
    const saved =
      await this.weeklyWatchlistRepository.save(weeklyWatchlist);
    await this.assetWatchlistService.createManyForAllAssets(saved);
    return saved;
  }

  async findAll(): Promise<WeeklyWatchlist[]> {
    return this.weeklyWatchlistRepository.find({
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<WeeklyWatchlist> {
    const weeklyWatchlist = await this.weeklyWatchlistRepository.findOne({
      where: { id },
    });
    if (!weeklyWatchlist) {
      throw new NotFoundException(
        `Weekly watchlist with id ${id} not found`,
      );
    }
    return weeklyWatchlist;
  }

  async update(
    id: string,
    updateWeeklyWatchlistDto: UpdateWeeklyWatchlistDto,
  ): Promise<WeeklyWatchlist> {
    const weeklyWatchlist = await this.findOne(id);
    const prevStart = weeklyWatchlist.startDate;
    const prevEnd = weeklyWatchlist.endDate;
    Object.assign(weeklyWatchlist, updateWeeklyWatchlistDto);
    const saved =
      await this.weeklyWatchlistRepository.save(weeklyWatchlist);
    const startChanged =
      updateWeeklyWatchlistDto.startDate &&
      new Date(updateWeeklyWatchlistDto.startDate).getTime() !==
        new Date(prevStart).getTime();
    const endChanged =
      updateWeeklyWatchlistDto.endDate &&
      new Date(updateWeeklyWatchlistDto.endDate).getTime() !==
        new Date(prevEnd).getTime();
    if (startChanged || endChanged) {
      await this.assetWatchlistService.updateDatesByWeeklyWatchlist(
        id,
        saved.startDate,
        saved.endDate,
      );
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.assetWatchlistService.removeByWeeklyWatchlist(id);
    const weeklyWatchlist = await this.findOne(id);
    await this.weeklyWatchlistRepository.remove(weeklyWatchlist);
  }
}
