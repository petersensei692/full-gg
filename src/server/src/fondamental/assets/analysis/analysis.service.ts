import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
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
      imageNames: createDto.imageNames ?? null,
    });
    return this.analysisRepository.save(analysis);
  }

  /** Create a single analysis from a global analysis (used by GlobalAnalysisService). */
  async createFromGlobal(
    assetId: string,
    notes: string,
    images: string[] | null,
    imageNames: string[] | null,
    scopeLabel: string,
    globalAnalysisId: string,
  ): Promise<Analysis> {
    const analysis = this.analysisRepository.create({
      assetId,
      notes,
      images,
      imageNames,
      scopeLabel,
      globalAnalysisId,
    });
    return this.analysisRepository.save(analysis);
  }

  async removeByGlobalAnalysisId(globalAnalysisId: string): Promise<void> {
    await this.analysisRepository.delete({ globalAnalysisId });
  }

  async updateByGlobalAnalysisId(
    globalAnalysisId: string,
    data: { notes?: string; images?: string[] | null; imageNames?: string[] | null },
  ): Promise<void> {
    await this.analysisRepository.update({ globalAnalysisId }, data);
  }

  async findAll(assetId?: string): Promise<Analysis[]> {
    const where = assetId ? { assetId } : {};
    return this.analysisRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['asset'],
    });
  }

  /** Find all analyses that were created from a global analysis (scope_label IS NOT NULL). */
  async findAllWithScopeLabel(): Promise<Analysis[]> {
    return this.analysisRepository.find({
      where: { scopeLabel: Not(IsNull()) },
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
    if (analysis.globalAnalysisId) {
      throw new ForbiddenException(
        'This analysis was created from a global analysis. Edit it from the Global Analysis page.',
      );
    }

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
    if (analysis.globalAnalysisId) {
      throw new ForbiddenException(
        'This analysis was created from a global analysis. Delete it from the Global Analysis page.',
      );
    }
    await this.analysisRepository.remove(analysis);
  }
}
