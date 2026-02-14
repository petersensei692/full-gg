import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event } from './entities/event.entity';
import { WeeklyCalendar } from '../../weekly/weekly-calendar/entities/weekly-calendar.entity';
import { Asset } from '../entities/asset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, WeeklyCalendar, Asset]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
