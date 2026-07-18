import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from './entities/strategy.entity';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@Injectable()
export class StrategiesService {
  constructor(
    @InjectRepository(Strategy)
    private readonly strategyRepository: Repository<Strategy>,
  ) {}

  async create(dto: CreateStrategyDto): Promise<Strategy> {
    const strategy = this.strategyRepository.create({
      name: dto.name,
      description: dto.description,
      images: dto.images ?? null,
      imageNames: dto.imageNames ?? null,
    });
    return this.strategyRepository.save(strategy);
  }

  async findAll(): Promise<Strategy[]> {
    return this.strategyRepository.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Strategy> {
    const strategy = await this.strategyRepository.findOne({ where: { id } });
    if (!strategy) {
      throw new NotFoundException(`Strategy with id ${id} not found`);
    }
    return strategy;
  }

  async update(id: string, dto: UpdateStrategyDto): Promise<Strategy> {
    const strategy = await this.findOne(id);
    Object.assign(strategy, dto);
    return this.strategyRepository.save(strategy);
  }

  async remove(id: string): Promise<void> {
    const strategy = await this.findOne(id);
    await this.strategyRepository.remove(strategy);
  }
}
