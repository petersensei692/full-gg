import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pair } from './entities/pair.entity';
import { Asset } from '../../fondamental/assets/entities/asset.entity';
import { PairsController } from './pairs.controller';
import { PairsService } from './pairs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pair, Asset])],
  controllers: [PairsController],
  providers: [PairsService],
  exports: [PairsService, TypeOrmModule],
})
export class PairsModule {}
