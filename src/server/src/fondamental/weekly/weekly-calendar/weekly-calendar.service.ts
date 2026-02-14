import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyCalendar } from './entities/weekly-calendar.entity';
import { CreateWeeklyCalendarDto } from './dto/create-weekly-calendar.dto';
import { UpdateWeeklyCalendarDto } from './dto/update-weekly-calendar.dto';

@Injectable()
export class WeeklyCalendarService {
  constructor(
    @InjectRepository(WeeklyCalendar)
    private readonly weeklyCalendarRepository: Repository<WeeklyCalendar>,
  ) {}

  async create(
    createWeeklyCalendarDto: CreateWeeklyCalendarDto,
  ): Promise<WeeklyCalendar> {
    const weeklyCalendar =
      this.weeklyCalendarRepository.create(createWeeklyCalendarDto);
    return this.weeklyCalendarRepository.save(weeklyCalendar);
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
    Object.assign(weeklyCalendar, updateWeeklyCalendarDto);
    return this.weeklyCalendarRepository.save(weeklyCalendar);
  }

  async remove(id: string): Promise<void> {
    const weeklyCalendar = await this.findOne(id);
    await this.weeklyCalendarRepository.remove(weeklyCalendar);
  }
}
