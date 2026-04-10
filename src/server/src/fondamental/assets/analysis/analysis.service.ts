import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

const TRADE_NOTE_MARKER = '<!--analysis-type:tradeNote-->';

function isTradeNoteAnalysisNotes(notes: string | null | undefined): boolean {
  return (notes ?? '').includes(TRADE_NOTE_MARKER);
}
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

  /** Sync content from trade journal (bypasses trade-note edit lock on analysis UI). */
  async updateFromTradeJournal(
    id: string,
    data: { notes: string; images: string[] | null; imageNames: string[] | null },
  ): Promise<void> {
    await this.analysisRepository.update(id, {
      notes: data.notes,
      images: data.images,
      imageNames: data.imageNames,
    });
  }

  async update(id: string, updateDto: UpdateAnalysisDto): Promise<Analysis> {
    const analysis = await this.findOne(id);

    const touchesContent =
      updateDto.assetId !== undefined ||
      updateDto.notes !== undefined ||
      updateDto.images !== undefined ||
      updateDto.imageNames !== undefined;

    const favoriteOnly =
      updateDto.favorite !== undefined && !touchesContent;

    if (favoriteOnly) {
      analysis.favorite = updateDto.favorite as boolean;
      return this.analysisRepository.save(analysis);
    }

    if (analysis.globalAnalysisId) {
      throw new ForbiddenException(
        'This analysis was created from a global analysis. Edit it from the Global Analysis page.',
      );
    }

    if (isTradeNoteAnalysisNotes(analysis.notes)) {
      throw new ForbiddenException(
        'This entry was created from a trade note. Edit it from the trade journal (Analytics → Trades).',
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
    if (updateDto.favorite !== undefined) {
      analysis.favorite = updateDto.favorite;
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
    if (isTradeNoteAnalysisNotes(analysis.notes)) {
      throw new ForbiddenException(
        'This entry was created from a trade note. Remove or edit it from the trade journal.',
      );
    }
    await this.analysisRepository.remove(analysis);
  }
}
