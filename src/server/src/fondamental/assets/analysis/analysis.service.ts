import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Analysis } from './entities/analysis.entity';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
  ) {}

  async create(createDto: CreateAnalysisDto): Promise<Analysis> {
    const analysis = this.analysisRepository.create({
      assetId: createDto.assetId,
      notes: createDto.notes,
      images: createDto.images || null,
    });
    return this.analysisRepository.save(analysis);
  }

  async findAll(assetId?: string): Promise<Analysis[]> {
    const where = assetId ? { assetId } : {};
    return this.analysisRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['asset'],
    });
  }

  async findOne(id: string): Promise<Analysis> {
    const analysis = await this.analysisRepository.findOne({
      where: { id },
      relations: ['asset'],
    });
    if (!analysis) {
      throw new NotFoundException(`Analysis with id ${id} not found`);
    }
    return analysis;
  }

  async update(id: string, updateDto: UpdateAnalysisDto): Promise<Analysis> {
    const analysis = await this.findOne(id);

    if (updateDto.assetId !== undefined) {
      analysis.assetId = updateDto.assetId;
    }
    if (updateDto.notes !== undefined) {
      analysis.notes = updateDto.notes;
    }
    if (updateDto.images !== undefined) {
      analysis.images = updateDto.images;
    }
    if (updateDto.imageNames !== undefined) {
      analysis.imageNames = updateDto.imageNames;
    }

    return this.analysisRepository.save(analysis);
  }

  async remove(id: string): Promise<void> {
    const analysis = await this.findOne(id);
    await this.analysisRepository.remove(analysis);
  }
}
