import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GlobalAnalysis } from './entities/global-analysis.entity';
import { Asset } from '../assets/entities/asset.entity';
import { AnalysisService } from '../assets/analysis/analysis.service';
import { CreateGlobalAnalysisDto } from './dto/create-global-analysis.dto';
import { UpdateGlobalAnalysisDto } from './dto/update-global-analysis.dto';

@Injectable()
export class GlobalAnalysisService {
  constructor(
    @InjectRepository(GlobalAnalysis)
    private readonly globalAnalysisRepository: Repository<GlobalAnalysis>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    private readonly analysisService: AnalysisService,
  ) {}

  /** Resolve scope to list of asset IDs and scope display label. */
  private async resolveScope(
    scope: 'global' | string[],
  ): Promise<{ assetIds: string[]; scopeLabel: string }> {
    if (scope === 'global') {
      const assets = await this.assetRepository.find({ order: { name: 'ASC' } });
      const assetIds = assets.map((a) => a.id);
      const scopeLabel = 'GLOBAL';
      return { assetIds, scopeLabel };
    }
    const assets = await this.assetRepository.find({ where: { id: In(scope) } });
    const ordered = scope
      .map((id) => assets.find((a) => a.id === id))
      .filter(Boolean) as Asset[];
    const scopeLabel = ordered.map((a) => a.name).join('•');
    return { assetIds: ordered.map((a) => a.id), scopeLabel };
  }

  private addAnalysisTypeMarker(notes: string, analysisType: string): string {
    return `<!--analysis-type:${analysisType}-->${notes}`;
  }

  async create(dto: CreateGlobalAnalysisDto): Promise<GlobalAnalysis & { scopeDisplay: string }> {
    const scope: 'global' | string[] =
      dto.scope === 'global'
        ? 'global'
        : Array.isArray(dto.scope)
          ? dto.scope
          : [String(dto.scope)];
    const analysisType = dto.analysisType ?? 'daily';
    const { assetIds, scopeLabel } = await this.resolveScope(scope);

    const globalAnalysis = this.globalAnalysisRepository.create({
      notes: dto.notes,
      images: dto.images ?? null,
      imageNames: dto.imageNames ?? null,
      scope,
      analysisType,
    });
    const saved = await this.globalAnalysisRepository.save(globalAnalysis);

    const notesWithMarker = this.addAnalysisTypeMarker(saved.notes, analysisType);
    // Images are stored once (in global_analysis); all child analyses reference the same paths
    const images = saved.images ?? null;
    const imageNames = saved.imageNames ?? null;

    for (const assetId of assetIds) {
      await this.analysisService.createFromGlobal(
        assetId,
        notesWithMarker,
        images,
        imageNames,
        scopeLabel,
        saved.id,
        saved.favorite ?? false,
      );
    }

    return { ...saved, scopeDisplay: scopeLabel };
  }

  /** Scope display label for API response (e.g. "GLOBAL" or "USD•EUR•GBP"). */
  private async getScopeDisplay(scope: 'global' | string[]): Promise<string> {
    if (scope === 'global') return 'GLOBAL';
    const assets = await this.assetRepository.find({ where: { id: In(scope) } });
    const ordered = scope
      .map((id) => assets.find((a) => a.id === id))
      .filter(Boolean) as Asset[];
    return ordered.map((a) => a.name).join('•');
  }

  /** List all global analyses (for the stream on Global Analysis page). */
  async findAll(): Promise<(GlobalAnalysis & { scopeDisplay: string })[]> {
    const list = await this.globalAnalysisRepository.find({
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      list.map(async (ga) => ({
        ...ga,
        scopeDisplay: await this.getScopeDisplay(ga.scope),
      })),
    );
  }

  async findOne(id: string): Promise<GlobalAnalysis & { scopeDisplay: string }> {
    const ga = await this.globalAnalysisRepository.findOne({ where: { id } });
    if (!ga) {
      throw new NotFoundException(`Global analysis with id ${id} not found`);
    }
    return { ...ga, scopeDisplay: await this.getScopeDisplay(ga.scope) };
  }

  private scopesEqual(
    a: 'global' | string[],
    b: 'global' | string[],
  ): boolean {
    if (a === 'global' && b === 'global') return true;
    if (a === 'global' || b === 'global') return false;
    if (a.length !== b.length) return false;
    return a.every((id, i) => id === b[i]);
  }

  async update(
    id: string,
    dto: UpdateGlobalAnalysisDto,
  ): Promise<GlobalAnalysis & { scopeDisplay: string }> {
    const ga = await this.globalAnalysisRepository.findOne({ where: { id } });
    if (!ga) throw new NotFoundException(`Global analysis with id ${id} not found`);

    const onlyFavorite =
      dto.favorite !== undefined &&
      dto.notes === undefined &&
      dto.images === undefined &&
      dto.imageNames === undefined &&
      dto.analysisType === undefined &&
      dto.scope === undefined;

    if (onlyFavorite) {
      ga.favorite = dto.favorite as boolean;
      const saved = await this.globalAnalysisRepository.save(ga);
      await this.analysisService.updateByGlobalAnalysisId(id, {
        favorite: saved.favorite,
      });
      return { ...saved, scopeDisplay: await this.getScopeDisplay(saved.scope) };
    }

    const scopeChanged =
      dto.scope !== undefined && !this.scopesEqual(ga.scope, dto.scope);

    if (scopeChanged) {
      const nextScope: 'global' | string[] =
        dto.scope === 'global'
          ? 'global'
          : Array.isArray(dto.scope)
            ? dto.scope
            : [String(dto.scope)];
      if (nextScope !== 'global' && nextScope.length === 0) {
        throw new BadRequestException(
          'Scope must be "global" or a non-empty list of asset IDs',
        );
      }
      if (dto.notes !== undefined) ga.notes = dto.notes;
      if (dto.images !== undefined) ga.images = dto.images;
      if (dto.imageNames !== undefined) ga.imageNames = dto.imageNames;
      if (dto.analysisType !== undefined) ga.analysisType = dto.analysisType;
      if (dto.favorite !== undefined) ga.favorite = dto.favorite;
      ga.scope = nextScope;
      const saved = await this.globalAnalysisRepository.save(ga);

      await this.analysisService.removeByGlobalAnalysisId(id);
      const { assetIds, scopeLabel } = await this.resolveScope(saved.scope);
      const notesForChildren = this.addAnalysisTypeMarker(
        saved.notes,
        saved.analysisType,
      );
      const images = saved.images ?? null;
      const imageNames = saved.imageNames ?? null;
      for (const assetId of assetIds) {
        await this.analysisService.createFromGlobal(
          assetId,
          notesForChildren,
          images,
          imageNames,
          scopeLabel,
          saved.id,
          saved.favorite ?? false,
        );
      }
      return { ...saved, scopeDisplay: scopeLabel };
    }

    if (dto.notes !== undefined) ga.notes = dto.notes;
    if (dto.images !== undefined) ga.images = dto.images;
    if (dto.imageNames !== undefined) ga.imageNames = dto.imageNames;
    if (dto.analysisType !== undefined) ga.analysisType = dto.analysisType;
    if (dto.favorite !== undefined) ga.favorite = dto.favorite;
    const saved = await this.globalAnalysisRepository.save(ga);

    const notesForChildren = this.addAnalysisTypeMarker(
      saved.notes,
      saved.analysisType,
    );
    await this.analysisService.updateByGlobalAnalysisId(id, {
      notes: notesForChildren,
      images: saved.images,
      imageNames: saved.imageNames,
      favorite: saved.favorite,
    });
    return { ...saved, scopeDisplay: await this.getScopeDisplay(saved.scope) };
  }

  async remove(id: string): Promise<void> {
    const ga = await this.globalAnalysisRepository.findOne({ where: { id } });
    if (!ga) throw new NotFoundException(`Global analysis with id ${id} not found`);
    await this.analysisService.removeByGlobalAnalysisId(id);
    await this.globalAnalysisRepository.delete(id);
  }
}
