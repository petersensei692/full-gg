import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Analysis } from '../assets/analysis/entities/analysis.entity';
import { GlobalAnalysis } from '../global-analysis/entities/global-analysis.entity';
import { Asset } from '../assets/entities/asset.entity';

export type AllAnalysisRow = {
  id: string;
  source: 'global' | 'asset';
  notes: string;
  title: string | null;
  images: string[] | null;
  imageNames: string[] | null;
  analysisType: string;
  favorite: boolean;
  createdAt: string;
  scopeLabel: string | null;
  globalFullScope: boolean;
  assetId: string | null;
  assetName: string | null;
  assetType: string | null;
  assetSortOrder: number | null;
  assetPlace: number | null;
};

@Injectable()
export class AllAnalysisService {
  constructor(
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
    @InjectRepository(GlobalAnalysis)
    private readonly globalAnalysisRepository: Repository<GlobalAnalysis>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  private addAnalysisTypeMarker(notes: string, analysisType: string): string {
    return `<!--analysis-type:${analysisType}-->${notes}`;
  }

  private async scopeDisplay(scope: 'global' | string[]): Promise<string> {
    if (scope === 'global') return 'GLOBAL';
    if (!Array.isArray(scope) || scope.length === 0) return '';
    const assets = await this.assetRepository.find({ where: { id: In(scope) } });
    const ordered = scope
      .map((id) => assets.find((a) => a.id === id))
      .filter(Boolean) as Asset[];
    return ordered.map((a) => a.name).join('•');
  }

  async findAll(): Promise<AllAnalysisRow[]> {
    const [assetRows, globalRows] = await Promise.all([
      this.analysisRepository.find({
        order: { createdAt: 'ASC' },
        relations: ['asset'],
      }),
      this.globalAnalysisRepository.find({ order: { createdAt: 'ASC' } }),
    ]);

    const globalMapped = await Promise.all(
      globalRows.map(async (ga) => {
        const scopeLabel = await this.scopeDisplay(ga.scope);
        return {
          id: ga.id,
          source: 'global' as const,
          notes: ga.notes,
          title: ga.title ?? null,
          images: ga.images ?? null,
          imageNames: ga.imageNames ?? null,
          analysisType: ga.analysisType ?? 'daily',
          favorite: !!ga.favorite,
          createdAt: ga.createdAt.toISOString(),
          scopeLabel: scopeLabel || null,
          globalFullScope: ga.scope === 'global',
          assetId: null,
          assetName: null,
          assetType: null,
          assetSortOrder: null,
          assetPlace: null,
        } satisfies AllAnalysisRow;
      }),
    );

    const assetMapped = assetRows
      // Linked child copies from global-analysis are represented by their global parent row.
      .filter((a) => !a.globalAnalysisId)
      .map((a) => {
      const analysisTypeMatch = (a.notes ?? '').match(/<!--analysis-type:([^>]*)-->/);
      const inferredType = analysisTypeMatch?.[1]?.trim() || 'daily';
      return {
        id: a.id,
        source: 'asset' as const,
        notes: a.notes,
        title: a.title ?? null,
        images: a.images ?? null,
        imageNames: a.imageNames ?? null,
        analysisType: inferredType,
        favorite: !!a.favorite,
        createdAt: a.createdAt.toISOString(),
        scopeLabel: a.scopeLabel ?? a.asset?.name ?? null,
        globalFullScope: a.scopeLabel === 'GLOBAL',
        assetId: a.assetId ?? null,
        assetName: a.asset?.name ?? null,
        assetType: a.asset?.type ?? null,
        assetSortOrder: a.asset?.sortOrder ?? null,
        assetPlace: a.asset?.place ?? null,
      } satisfies AllAnalysisRow;
      });

    // Global notes do not carry markers in DB; align with stream conventions.
    const normalizedGlobals = globalMapped.map((g) => ({
      ...g,
      notes: this.addAnalysisTypeMarker(g.notes, g.analysisType),
    }));

    return [...assetMapped, ...normalizedGlobals].sort(
      (x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
    );
  }
}

