import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyCalendar } from './entities/weekly-calendar.entity';
import { CreateWeeklyCalendarDto } from './dto/create-weekly-calendar.dto';
import { UpdateWeeklyCalendarDto } from './dto/update-weekly-calendar.dto';
import { AssetCalendarService } from './asset-calendar/asset-calendar.service';

@Injectable()
export class WeeklyCalendarService {
  constructor(
    @InjectRepository(WeeklyCalendar)
    private readonly weeklyCalendarRepository: Repository<WeeklyCalendar>,
    private readonly assetCalendarService: AssetCalendarService,
  ) {}

  async create(
    createWeeklyCalendarDto: CreateWeeklyCalendarDto,
  ): Promise<WeeklyCalendar> {
    const weeklyCalendar = this.weeklyCalendarRepository.create({
      startDate: createWeeklyCalendarDto.startDate,
      endDate: createWeeklyCalendarDto.endDate,
    });
    const saved =
      await this.weeklyCalendarRepository.save(weeklyCalendar);
    await this.assetCalendarService.createManyForAllAssets(saved);
    return saved;
  }

  async findAll(): Promise<WeeklyCalendar[]> {
    return this.weeklyCalendarRepository.find({
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<WeeklyCalendar> {
    const weeklyCalendar = await this.weeklyCalendarRepository.findOne({
      where: { id },
    });
    if (!weeklyCalendar) {
      throw new NotFoundException(
        `Weekly calendar with id ${id} not found`,
      );
    }
    return weeklyCalendar;
  }

  async update(
    id: string,
    updateWeeklyCalendarDto: UpdateWeeklyCalendarDto,
  ): Promise<WeeklyCalendar> {
    const weeklyCalendar = await this.findOne(id);
    const prevStart = weeklyCalendar.startDate;
    const prevEnd = weeklyCalendar.endDate;
    Object.assign(weeklyCalendar, updateWeeklyCalendarDto);
    const saved =
      await this.weeklyCalendarRepository.save(weeklyCalendar);
    const datesChanged =
      updateWeeklyCalendarDto.startDate !== undefined ||
      updateWeeklyCalendarDto.endDate !== undefined;
    if (datesChanged) {
      await this.assetCalendarService.updateDatesByWeeklyCalendar(
        id,
        saved.startDate,
        saved.endDate,
      );
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const weeklyCalendar = await this.findOne(id);
    await this.assetCalendarService.removeByWeeklyCalendar(id);
    await this.weeklyCalendarRepository.remove(weeklyCalendar);
  }
}
