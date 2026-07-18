import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { Analysis } from './analysis/entities/analysis.entity';
import { WatchItem } from './watch-items/entities/watch-item.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

const TYPE_ORDER = ['currency', 'commodity', 'stocks', 'crypto'];

export interface AssetWithStats extends Asset {
  analysisCount: number;
  watchCount: number;
}

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
    @InjectRepository(WatchItem)
    private readonly watchItemRepository: Repository<WatchItem>,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    const type = createAssetDto.type ?? 'currency';
    let place = createAssetDto.place;
    if (place == null) {
      const raw = await this.assetRepository
        .createQueryBuilder('a')
        .select('COALESCE(MAX(a.place), 0) + 1', 'maxPlace')
        .where('a.type = :type', { type })
        .getRawOne<{ maxPlace: number }>();
      place = raw?.maxPlace != null ? Number(raw.maxPlace) : 1;
    }
    const asset = this.assetRepository.create({
      name: createAssetDto.name,
      type,
      sortOrder: createAssetDto.sortOrder ?? 0,
      place: place ?? 1,
      isTradable: createAssetDto.isTradable ?? type !== 'stocks',
    });
    return this.assetRepository.save(asset);
  }

  async findAll(): Promise<Asset[]> {
    const list = await this.assetRepository.find({
      order: { place: 'ASC', name: 'ASC' },
    });
    const typeRank = (t: string) => {
      const normalized = t === 'bond' ? 'stocks' : t;
      const i = TYPE_ORDER.indexOf(normalized);
      return i >= 0 ? i : TYPE_ORDER.length;
    };
    return list.sort((a, b) => typeRank(a.type) - typeRank(b.type) || (a.place ?? 1) - (b.place ?? 1) || a.name.localeCompare(b.name));
  }

  async findAllWithStats(): Promise<AssetWithStats[]> {
    const assets = await this.findAll();
    const ids = assets.map((a) => a.id);
    const analysisCounts = await this.analysisRepository
      .createQueryBuilder('a')
      .select('a.asset_id', 'assetId')
      .addSelect('COUNT(*)', 'count')
      .where('a.asset_id IN (:...ids)', { ids })
      .groupBy('a.asset_id')
      .getRawMany<{ assetId: string; count: string }>();
    const baseCounts = await this.watchItemRepository
      .createQueryBuilder('w')
      .select('w.base_asset_id', 'assetId')
      .addSelect('COUNT(*)', 'count')
      .where('w.base_asset_id IN (:...ids)', { ids })
      .groupBy('w.base_asset_id')
      .getRawMany<{ assetId: string; count: string }>();
    const quoteCounts = await this.watchItemRepository
      .createQueryBuilder('w')
      .select('w.quote_asset_id', 'assetId')
      .addSelect('COUNT(*)', 'count')
      .where('w.quote_asset_id IN (:...ids)', { ids })
      .groupBy('w.quote_asset_id')
      .getRawMany<{ assetId: string; count: string }>();
    const watchMap: Record<string, number> = {};
    baseCounts.forEach((r) => { watchMap[r.assetId] = (watchMap[r.assetId] ?? 0) + Number(r.count); });
    quoteCounts.forEach((r) => { watchMap[r.assetId] = (watchMap[r.assetId] ?? 0) + Number(r.count); });
    const analysisMap: Record<string, number> = {};
    analysisCounts.forEach((r) => { analysisMap[r.assetId] = Number(r.count); });
    return assets.map((a) => ({
      ...a,
      analysisCount: analysisMap[a.id] ?? 0,
      watchCount: watchMap[a.id] ?? 0,
    }));
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with id ${id} not found`);
    }
    return asset;
  }

  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);
    Object.assign(asset, updateAssetDto);
    return this.assetRepository.save(asset);
  }

  async remove(id: string): Promise<void> {
    const asset = await this.findOne(id);
    await this.assetRepository.remove(asset);
  }

  async moveUp(id: string): Promise<Asset[]> {
    const asset = await this.findOne(id);
    const type = asset.type ?? 'currency';
    const myPlace = asset.place ?? 1;
    if (myPlace <= 1) {
      throw new BadRequestException('Asset is already first in its section');
    }
    const prev = await this.assetRepository.findOne({
      where: { type, place: myPlace - 1 },
    });
    if (!prev) {
      throw new BadRequestException('Asset is already first in its section');
    }
    prev.place = myPlace;
    asset.place = myPlace - 1;
    await this.assetRepository.save([prev, asset]);
    return this.findAll();
  }

  async moveDown(id: string): Promise<Asset[]> {
    const asset = await this.findOne(id);
    const type = asset.type ?? 'currency';
    const myPlace = asset.place ?? 1;
    const next = await this.assetRepository.findOne({
      where: { type, place: myPlace + 1 },
    });
    if (!next) {
      throw new BadRequestException('Asset is already last in its section');
    }
    next.place = myPlace;
    asset.place = myPlace + 1;
    await this.assetRepository.save([next, asset]);
    return this.findAll();
  }
}
