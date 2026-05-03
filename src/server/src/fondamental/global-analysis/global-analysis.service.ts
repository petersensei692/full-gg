import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { GlobalAnalysis } from './entities/global-analysis.entity';
import { Asset } from '../assets/entities/asset.entity';
import { AnalysisService } from '../assets/analysis/analysis.service';
import { CreateGlobalAnalysisDto } from './dto/create-global-analysis.dto';
import { UpdateGlobalAnalysisDto } from './dto/update-global-analysis.dto';
import { UpdateAnalysisDto } from '../assets/analysis/dto/update-analysis.dto';
import type { Analysis } from '../assets/analysis/entities/analysis.entity';

@Injectable()
export class GlobalAnalysisService implements OnModuleInit {
  private readonly logger = new Logger(GlobalAnalysisService.name);

  constructor(
    @InjectRepository(GlobalAnalysis)
    private readonly globalAnalysisRepository: Repository<GlobalAnalysis>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @Inject(forwardRef(() => AnalysisService))
    private readonly analysisService: AnalysisService,
    private readonly dataSource: DataSource,
  ) {}

  /** One-way align legacy/drifted asset copies with their global_analysis row (non–full-global scope only). */
  async onModuleInit(): Promise<void> {
    try {
      await this.syncScopedChildRowsFromGlobalParents();
    } catch (e) {
      this.logger.warn(
        `Could not sync scoped child analyses from global templates: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /**
   * Copy notes (with type marker), images, image names, and favorite from each linked
   * `global_analysis` row onto asset-scoped children (`scope_label` ≠ GLOBAL).
   */
  async syncScopedChildRowsFromGlobalParents(): Promise<void> {
    const t = this.dataSource.driver.options.type;
    const favDefault = t === 'better-sqlite3' || t === 'sqlite' ? '0' : 'false';
    await this.dataSource.query(`
      UPDATE analysis AS a
      SET
        notes = (
          SELECT '<!--analysis-type:' || g.analysis_type || '-->' || COALESCE(g.notes, '')
          FROM global_analysis g WHERE g.id = a.global_analysis_id
        ),
        images = (SELECT g.images FROM global_analysis g WHERE g.id = a.global_analysis_id),
        image_names = (SELECT g.image_names FROM global_analysis g WHERE g.id = a.global_analysis_id),
        favorite = COALESCE((SELECT g.favorite FROM global_analysis g WHERE g.id = a.global_analysis_id), ${favDefault})
      WHERE a.global_analysis_id IS NOT NULL
        AND a.scope_label IS NOT NULL
        AND a.scope_label != 'GLOBAL'
        AND EXISTS (SELECT 1 FROM global_analysis g WHERE g.id = a.global_analysis_id)
    `);
  }

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

  /** Strip HTML comment marker from child/ API notes; same convention as the web app. */
  private extractAnalysisTypeFromNotes(notes: string): {
    cleanedNotes: string;
    analysisType: string;
  } {
    const match = notes.match(/<!--analysis-type:([^>]*)-->/);
    const analysisType = match?.[1]?.trim() || 'daily';
    const cleanedNotes = notes.replace(/<!--analysis-type:[^>]*-->/, '').trim();
    return { cleanedNotes, analysisType };
  }

  /**
   * When an asset-scoped linked copy is edited, update the parent GlobalAnalysis and all
   * sibling asset rows (same as editing from the Global Analysis page).
   */
  async propagateFromAssetAnalysis(
    assetAnalysisId: string,
    updateDto: UpdateAnalysisDto,
  ): Promise<Analysis> {
    const child = await this.analysisService.findOne(assetAnalysisId);
    if (!child.globalAnalysisId) {
      throw new BadRequestException('This analysis is not linked to a global template');
    }
    if (child.scopeLabel === 'GLOBAL') {
      throw new ForbiddenException(
        'This analysis was created from a global analysis. Edit it from the Global Analysis page.',
      );
    }
    if (updateDto.assetId !== undefined) {
      throw new BadRequestException('Cannot move a linked analysis to another asset');
    }

    const touchesContent =
      updateDto.notes !== undefined ||
      updateDto.images !== undefined ||
      updateDto.imageNames !== undefined;
    const favoriteOnly =
      updateDto.favorite !== undefined && !touchesContent;

    const ga = await this.globalAnalysisRepository.findOne({
      where: { id: child.globalAnalysisId },
    });
    if (!ga) {
      throw new NotFoundException(`Global analysis with id ${child.globalAnalysisId} not found`);
    }

    if (favoriteOnly) {
      ga.favorite = updateDto.favorite as boolean;
      await this.globalAnalysisRepository.save(ga);
      await this.analysisService.updateByGlobalAnalysisId(ga.id, {
        favorite: ga.favorite,
      });
      return this.analysisService.findOne(assetAnalysisId);
    }

    if (updateDto.notes !== undefined) {
      const { cleanedNotes, analysisType } = this.extractAnalysisTypeFromNotes(
        updateDto.notes,
      );
      ga.notes = cleanedNotes;
      ga.analysisType = analysisType;
    }
    if (updateDto.images !== undefined) {
      ga.images = updateDto.images;
    }
    if (updateDto.imageNames !== undefined) {
      ga.imageNames = updateDto.imageNames;
    }
    if (updateDto.favorite !== undefined) {
      ga.favorite = updateDto.favorite;
    }

    const saved = await this.globalAnalysisRepository.save(ga);
    const notesForChildren = this.addAnalysisTypeMarker(
      saved.notes,
      saved.analysisType,
    );
    await this.analysisService.updateByGlobalAnalysisId(saved.id, {
      notes: notesForChildren,
      images: saved.images,
      imageNames: saved.imageNames,
      favorite: saved.favorite,
    });

    return this.analysisService.findOne(assetAnalysisId);
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
