import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetCalendar } from './entities/asset-calendar.entity';
import { AssetCalendarService } from './asset-calendar.service';
import { AssetCalendarController } from './asset-calendar.controller';
import { WeeklyCalendar } from '../entities/weekly-calendar.entity';
import { Asset } from '../../../assets/entities/asset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetCalendar, WeeklyCalendar, Asset]),
  ],
  controllers: [AssetCalendarController],
  providers: [AssetCalendarService],
  exports: [AssetCalendarService],
})
export class AssetCalendarModule {}
