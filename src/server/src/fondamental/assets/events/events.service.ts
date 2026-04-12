import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { WeeklyCalendar } from '../../weekly/weekly-calendar/entities/weekly-calendar.entity';
import { Asset } from '../entities/asset.entity';
import { AssetCalendar } from '../../weekly/weekly-calendar/asset-calendar/entities/asset-calendar.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(WeeklyCalendar)
    private readonly weeklyCalendarRepository: Repository<WeeklyCalendar>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetCalendar)
    private readonly assetCalendarRepository: Repository<AssetCalendar>,
  ) {}

  /** save() does not always run @AfterLoad — keep API responses consistent. */
  private ensureEventsImages(e: Event): Event {
    if (e.eventsImages == null || !Array.isArray(e.eventsImages)) {
      e.eventsImages = [];
    }
    return e;
  }

  async create(createDto: CreateEventDto): Promise<Event> {
    let calendar: WeeklyCalendar | null = null;
    let asset: Asset;
    let assetCalendar: AssetCalendar | null = null;

    if (createDto.assetCalendarId) {
      const ac = await this.assetCalendarRepository.findOne({
        where: { id: createDto.assetCalendarId },
        relations: ['weeklyCalendar', 'asset'],
      });
      if (!ac) {
        throw new NotFoundException(
          `Asset calendar with id ${createDto.assetCalendarId} not found`,
        );
      }
      assetCalendar = ac;
      calendar = ac.weeklyCalendar;
      asset = ac.asset;
    } else if (createDto.calendarId && createDto.assetId) {
      const cal = await this.weeklyCalendarRepository.findOne({
        where: { id: createDto.calendarId },
      });
      if (!cal) {
        throw new NotFoundException(
          `Weekly calendar with id ${createDto.calendarId} not found`,
        );
      }
      calendar = cal;
      const a = await this.assetRepository.findOne({
        where: { id: createDto.assetId },
      });
      if (!a) {
        throw new NotFoundException(
          `Asset with id ${createDto.assetId} not found`,
        );
      }
      asset = a;
    } else {
      throw new BadRequestException(
        'Provide either assetCalendarId or both calendarId and assetId',
      );
    }

    const event = this.eventRepository.create({
      calendar,
      asset,
      assetCalendar,
      day: createDto.day,
      eventsImages: createDto.eventsImages ?? [],
    });

    return this.ensureEventsImages(await this.eventRepository.save(event));
  }

  async findAll(): Promise<Event[]> {
    return this.eventRepository.find({
      relations: [
        'calendar',
        'asset',
        'assetCalendar',
        'assetCalendar.weeklyCalendar',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: [
        'calendar',
        'asset',
        'assetCalendar',
        'assetCalendar.weeklyCalendar',
      ],
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
    if (updateDto.eventsImages !== undefined) {
      event.eventsImages = updateDto.eventsImages;
    }

    return this.ensureEventsImages(await this.eventRepository.save(event));
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventRepository.remove(event);
  }
}
