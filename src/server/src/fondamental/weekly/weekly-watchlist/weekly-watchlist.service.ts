import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyWatchlist } from './entities/weekly-watchlist.entity';
import { CreateWeeklyWatchlistDto } from './dto/create-weekly-watchlist.dto';
import { UpdateWeeklyWatchlistDto } from './dto/update-weekly-watchlist.dto';

@Injectable()
export class WeeklyWatchlistService {
  constructor(
    @InjectRepository(WeeklyWatchlist)
    private readonly weeklyWatchlistRepository: Repository<WeeklyWatchlist>,
  ) {}

  async create(
    createWeeklyWatchlistDto: CreateWeeklyWatchlistDto,
  ): Promise<WeeklyWatchlist> {
    const weeklyWatchlist =
      this.weeklyWatchlistRepository.create(createWeeklyWatchlistDto);
    return this.weeklyWatchlistRepository.save(weeklyWatchlist);
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
    Object.assign(weeklyWatchlist, updateWeeklyWatchlistDto);
    return this.weeklyWatchlistRepository.save(weeklyWatchlist);
  }

  async remove(id: string): Promise<void> {
    const weeklyWatchlist = await this.findOne(id);
    await this.weeklyWatchlistRepository.remove(weeklyWatchlist);
  }
}
