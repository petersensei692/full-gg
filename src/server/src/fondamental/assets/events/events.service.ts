import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { WeeklyCalendar } from '../../weekly/weekly-calendar/entities/weekly-calendar.entity';
import { Asset } from '../entities/asset.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(WeeklyCalendar)
    private readonly weeklyCalendarRepository: Repository<WeeklyCalendar>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async create(createDto: CreateEventDto): Promise<Event> {
    const calendar = await this.weeklyCalendarRepository.findOne({
      where: { id: createDto.calendarId },
    });
    if (!calendar) {
      throw new NotFoundException(
        `Weekly calendar with id ${createDto.calendarId} not found`,
      );
    }

    const asset = await this.assetRepository.findOne({
      where: { id: createDto.assetId },
    });
    if (!asset) {
      throw new NotFoundException(
        `Asset with id ${createDto.assetId} not found`,
      );
    }

    const event = this.eventRepository.create({
      calendar,
      asset,
      day: createDto.day,
      time: createDto.time,
      name: createDto.name,
      impact: createDto.impact,
    });

    return this.eventRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventRepository.find({
      relations: ['calendar', 'asset'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['calendar', 'asset'],
    });
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  async update(id: string, updateDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (updateDto.calendarId) {
      const calendar = await this.weeklyCalendarRepository.findOne({
        where: { id: updateDto.calendarId },
      });
      if (!calendar) {
        throw new NotFoundException(
          `Weekly calendar with id ${updateDto.calendarId} not found`,
        );
      }
      event.calendar = calendar;
    }

    if (updateDto.assetId) {
      const asset = await this.assetRepository.findOne({
        where: { id: updateDto.assetId },
      });
      if (!asset) {
        throw new NotFoundException(
          `Asset with id ${updateDto.assetId} not found`,
        );
      }
      event.asset = asset;
    }

    if (updateDto.day !== undefined) {
      event.day = updateDto.day;
    }
    if (updateDto.time !== undefined) {
      event.time = updateDto.time;
    }
    if (updateDto.name !== undefined) {
      event.name = updateDto.name;
    }
    if (updateDto.impact !== undefined) {
      event.impact = updateDto.impact;
    }

    return this.eventRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventRepository.remove(event);
  }
}
