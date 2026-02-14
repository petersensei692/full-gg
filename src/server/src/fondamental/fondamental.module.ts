import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { WeeklyModule } from './weekly/weekly.module';

@Module({
  imports: [AssetsModule, WeeklyModule],
  exports: [AssetsModule, WeeklyModule],
})
export class FondamentalModule {}
