import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../../fondamental/assets/entities/asset.entity';
import { Pair } from './entities/pair.entity';
import { CreatePairDto } from './dto/create-pair.dto';
import { UpdatePairDto } from './dto/update-pair.dto';

@Injectable()
export class PairsService {
  constructor(
    @InjectRepository(Pair)
    private readonly pairsRepository: Repository<Pair>,
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
  ) {}

  private displayPair(baseName: string, quoteName: string): string {
    return `${baseName}/${quoteName}`;
  }

  private async loadTradableAsset(id: string): Promise<Asset> {
    const asset = await this.assetsRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    if (!asset.isTradable) {
      throw new BadRequestException(`Asset ${asset.name} is not tradable`);
    }
    return asset;
  }

  private async assertOrientationFree(
    baseId: string,
    quoteId: string,
    excludePairId?: string,
  ): Promise<void> {
    const same = await this.pairsRepository.findOne({
      where: [
        { baseAssetId: baseId, quoteAssetId: quoteId },
        { baseAssetId: quoteId, quoteAssetId: baseId },
      ],
    });
    if (same && same.id !== excludePairId) {
      throw new BadRequestException(
        `A pair for these assets already exists (${same.pair})`,
      );
    }
  }

  async findAll(): Promise<Pair[]> {
    return this.pairsRepository.find({ order: { pair: 'ASC' } });
  }

  async findOne(id: string): Promise<Pair> {
    const row = await this.pairsRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Pair ${id} not found`);
    return row;
  }

  async create(dto: CreatePairDto): Promise<Pair> {
    if (dto.baseAssetId === dto.quoteAssetId) {
      throw new BadRequestException('Base and quote must be different assets');
    }
    const base = await this.loadTradableAsset(dto.baseAssetId);
    const quote = await this.loadTradableAsset(dto.quoteAssetId);
    await this.assertOrientationFree(base.id, quote.id);

    const pipValue =
      dto.pipValue === undefined ? null : dto.pipValue === null ? null : dto.pipValue;
    if (pipValue != null && (!Number.isFinite(pipValue) || pipValue <= 0)) {
      throw new BadRequestException('pipValue must be a positive finite number or null');
    }

    const pairSymbol = this.displayPair(base.name, quote.name);
    const entity = this.pairsRepository.create({
      baseAssetId: base.id,
      quoteAssetId: quote.id,
      baseAsset: base,
      quoteAsset: quote,
      pair: pairSymbol,
      pipValue,
      pairFormat: pipValue ?? 0.0001,
    });
    return this.pairsRepository.save(entity);
  }

  async update(id: string, dto: UpdatePairDto): Promise<Pair> {
    const row = await this.findOne(id);

    let baseId = row.baseAssetId;
    let quoteId = row.quoteAssetId;

    if (dto.swapOrientation) {
      [baseId, quoteId] = [quoteId, baseId];
    }
    if (dto.baseAssetId != null) baseId = dto.baseAssetId;
    if (dto.quoteAssetId != null) quoteId = dto.quoteAssetId;

    if (baseId === quoteId) {
      throw new BadRequestException('Base and quote must be different assets');
    }

    const orientationChanged =
      baseId !== row.baseAssetId || quoteId !== row.quoteAssetId;
    if (orientationChanged) {
      const base = await this.loadTradableAsset(baseId);
      const quote = await this.loadTradableAsset(quoteId);
      await this.assertOrientationFree(baseId, quoteId, id);
      row.baseAssetId = base.id;
      row.quoteAssetId = quote.id;
      row.baseAsset = base;
      row.quoteAsset = quote;
      row.pair = this.displayPair(base.name, quote.name);
    }

    if (dto.pipValue !== undefined) {
      if (dto.pipValue === null) {
        row.pipValue = null;
      } else {
        if (!Number.isFinite(dto.pipValue) || dto.pipValue <= 0) {
          throw new BadRequestException('pipValue must be a positive finite number or null');
        }
        row.pipValue = dto.pipValue;
        row.pairFormat = dto.pipValue;
      }
    }

    return this.pairsRepository.save(row);
  }

  async remove(id: string): Promise<void> {
    const row = await this.findOne(id);
    await this.pairsRepository.remove(row);
  }
}
