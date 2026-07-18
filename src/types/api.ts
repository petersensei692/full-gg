/** Single asset returned by the API */
export interface Asset {
  id: string;
  name: string;
  type?: string;
  sortOrder?: number;
  /** Position within the asset's type section (1, 2, 3, ...). */
  place?: number;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating an asset */
export interface CreateAssetDto {
  name: string;
  type?: string;
  sortOrder?: number;
}

/** Body for updating an asset (all fields optional) */
export interface UpdateAssetDto {
  name?: string;
  type?: string;
  sortOrder?: number;
  place?: number;
}

/** Asset with analysis and watch counts (for Assets page) */
export interface AssetWithStats extends Asset {
  analysisCount: number;
  watchCount: number;
}

/** Weekly watchlist entry */
export interface WeeklyWatchlist {
  id: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

/** Asset watchlist - links a weekly watchlist to a specific asset */
export interface AssetWatchlist {
  id: string;
  startDate: string;
  endDate: string;
  weeklyWatchlist: WeeklyWatchlist;
  asset: Asset;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating a weekly watchlist */
export interface CreateWeeklyWatchlistDto {
  startDate: string;
  endDate: string;
}

/** Body for updating a weekly watchlist */
export interface UpdateWeeklyWatchlistDto {
  startDate?: string;
  endDate?: string;
}

export interface Thesis {
  notes: string;
  images?: string[];
  imageNames?: string[];
}

/** Single watch item returned by the API */
export interface WatchItem {
  id: string;
  watchlist: WeeklyWatchlist | null;
  baseAssetWatchlist: AssetWatchlist | null;
  quoteAssetWatchlist: AssetWatchlist | null;
  baseAsset: Asset;
  quoteAsset: Asset;
  pairName: string;
  bias: string;
  thesis: Thesis | null;
  /** Whether the watch item is marked as finished (greyed out) */
  finished?: boolean;
  /** Linked analysis card order for the base leg */
  linkedBaseAnalysisIds?: string[] | null;
  /** Linked analysis card order for the quote leg */
  linkedQuoteAnalysisIds?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating a watch item */
export interface CreateWatchItemDto {
  baseAssetWatchlistId?: string;
  quoteAssetWatchlistId?: string;
  watchlistId?: string;
  baseAssetId: string;
  quoteAssetId: string;
  pairName: string;
  bias: string;
  thesis?: Thesis;
  linkedBaseAnalysisIds?: string[];
  linkedQuoteAnalysisIds?: string[];
}

/** Body for updating a watch item */
export interface UpdateWatchItemDto {
  watchlistId?: string;
  baseAssetId?: string;
  quoteAssetId?: string;
  pairName?: string;
  bias?: string;
  thesis?: Thesis | null;
  finished?: boolean;
  linkedBaseAnalysisIds?: string[];
  linkedQuoteAnalysisIds?: string[];
}

export type TradeType = "buy" | "sell";
export type TradeExecutionType =
  | "market order"
  | "buy stop"
  | "sell stop"
  | "buy limit"
  | "sell limit";
export type TradeCloseType = "fullClose" | "partClose";
export type TradeStatus =
  | "pending"
  | "executed"
  | "partlyClosed"
  | "fullyClosed"
  | "cancelled";

export interface TradeProfitEarning {
  earnedR: number;
}

export interface TradeProfitFactorEarned {
  earnings: TradeProfitEarning[];
  earningsNumber: number;
  totalEarned: number;
}

export interface TradeClosePrice {
  price: number;
  type: TradeCloseType;
  lots: number;
  percentage: number;
  time: string;
}

export type TradeSlEvolutionEntry = Record<string, number>;

export interface TradeNote {
  text: string;
  images: string[];
  imageNames?: string[];
  linkedAnalysisIds?: string[];
}

/** Paginated GET /analytics/trades */
export interface TradesListResponse {
  items: Trade[];
  total: number;
  page: number;
  limit: number;
}

export interface Trade {
  id: string;
  pair: string;
  type: TradeType;
  executionType: TradeExecutionType;
  executionTime: string | null;
  executionPrice: number;
  tpPrice: number;
  initialSlPrice: number;
  slEvolution: TradeSlEvolutionEntry[];
  profitFactorTargeted: number;
  profitFactorEarned: TradeProfitFactorEarned;
  positionSize: number;
  closePrices: TradeClosePrice[];
  tradeCloseTime: string | null;
  status: TradeStatus;
  trackNotes: TradeNote[];
  pairWatched: WatchItem | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTradeDto {
  pair?: string;
  pairWatchedId?: string | null;
  type: TradeType;
  executionType: TradeExecutionType;
  executionTime?: string;
  executionPrice: number;
  tpPrice: number;
  initialSlPrice: number;
  slEvolution?: TradeSlEvolutionEntry[];
  profitFactorEarned?: TradeProfitFactorEarned;
  positionSize: number;
  closePrices?: TradeClosePrice[];
  tradeCloseTime?: string | null;
  status?: TradeStatus;
  trackNotes?: TradeNote[];
}

export interface UpdateTradeDto {
  pair?: string;
  pairWatchedId?: string | null;
  type?: TradeType;
  executionType?: TradeExecutionType;
  executionTime?: string | null;
  executionPrice?: number;
  tpPrice?: number;
  initialSlPrice?: number;
  slEvolution?: TradeSlEvolutionEntry[];
  profitFactorTargeted?: number;
  profitFactorEarned?: TradeProfitFactorEarned;
  positionSize?: number;
  closePrices?: TradeClosePrice[];
  tradeCloseTime?: string | null;
  status?: TradeStatus;
  trackNotes?: TradeNote[];
}

export type AnalyticsRange = "1D" | "1W" | "1M" | "1Y" | "ALL";

export interface DashboardAnalyticsResponse {
  tradeCount: {
    countByWeek: number;
    averageByWeek: number;
    averageByDay: number;
    averageByMonth: number;
    total: number;
    evolution: { labels: string[]; values: number[] };
  };
  tradingStats: {
    actualResult: number;
    periodReturns: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
    risk: {
      maxDrawdown: {
        number: number;
        /** Trades in the worst consecutive losing streak (defines max drawdown). */
        tradeCount: number;
        period: { from: string; to: string } | null;
      };
      maxDrawup: {
        number: number;
        tradeCount: number;
        period: { from: string; to: string } | null;
      };
      highestWin: { number: number; trade: Trade | null };
      highestLose: { number: number; trade: Trade | null };
    };
    tradeStats: {
      winrate: number;
      profitFactor: number;
      averageWin: number;
      averageLoose: number;
      averageTradeDuration: string;
    };
  };
  chartData: {
    resultEvolution: Array<{ label: string; value: number }>;
  };
  appliedFilters: {
    tradeCountRange: AnalyticsRange;
    resultRange: AnalyticsRange;
    from: string | null;
    to: string;
  };
}

export interface PerformanceCalendarCell {
  date: string | null;
  dayOfMonth: number | null;
  totalR: number;
  trades: number;
  wins: number;
  losses: number;
}

export interface PerformanceCalendarWeek {
  cells: PerformanceCalendarCell[];
  weekTotalR: number;
  weekTrades: number;
  weekWins: number;
  weekWinRatePercent: number;
}

export type PerformanceFrequencyMode = "winsLosses" | "buysSells" | "profitR";
export type PerformanceFrequencyUnit = "daily" | "monthly";

export interface PerformanceAnalyticsResponse {
  calendar: {
    year: number;
    month: number;
    summary: {
      trades: number;
      wins: number;
      totalR: number;
      winRatePercent: number;
    };
    weeks: PerformanceCalendarWeek[];
  };
  widgets: {
    /** Win rate % by closed trade (same as trade winrate; name kept for API compatibility). */
    dailyWinratePercent: number;
    /** Legacy: day-based R ratio (net R on winning days vs losing days). */
    dayWinLossRatio: number;
    netDailyR: Array<{ date: string; r: number }>;
    /** One bar per closed trade in range (chronological). */
    tradePerformanceR: Array<{
      id: string;
      /** Calendar day of close (e.g. Mar 28) for the X-axis */
      label: string;
      pair: string;
      r: number;
      closedAt: string;
    }>;
    tradeWins: number;
    tradeLosses: number;
    tradeBreakeven: number;
    /** Avg |R| on wins / avg |R| on losses (trade-based). */
    tradeWinLossRatio: number;
  };
  frequency: {
    unit: PerformanceFrequencyUnit;
    mode: PerformanceFrequencyMode;
    monthlyAvailable: boolean;
    series: Array<{ label: string; up: number; down: number }>;
  };
  yearlyPerformance: Array<{
    year: number;
    months: Array<{ month: number; totalR: number; trades: number }>;
    ytd: { totalR: number; trades: number; wins: number; winRatePercent: number };
  }>;
  appliedFilters: {
    from: string | null;
    to: string;
  };
}

/** Single analysis returned by the API */
export interface Analysis {
  id: string;
  assetId: string;
  asset?: Asset;
  notes: string;
  /** Optional stream card headline */
  title?: string | null;
  images: string[] | null;
  imageNames?: string[] | null;
  /** "GLOBAL", "USD•EUR•...", or null for single-asset analysis */
  scopeLabel?: string | null;
  /** Set when this analysis was synced from a global analysis (asset rows mirror global). */
  globalAnalysisId?: string | null;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating an analysis */
export interface CreateAnalysisDto {
  assetId: string;
  notes: string;
  images?: string[];
  title?: string;
}

/** Body for updating an analysis */
export interface UpdateAnalysisDto {
  assetId?: string;
  notes?: string;
  images?: string[] | null;
  imageNames?: string[] | null;
  favorite?: boolean;
  title?: string | null;
}

/** Global analysis (template applied to one or more assets) */
export interface GlobalAnalysis {
  id: string;
  notes: string;
  title?: string | null;
  images: string[] | null;
  imageNames: string[] | null;
  scope: "global" | string[];
  scopeDisplay: string;
  analysisType?: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating a global analysis */
export interface CreateGlobalAnalysisDto {
  notes: string;
  images?: string[];
  imageNames?: string[];
  scope: "global" | string[];
  analysisType?: string;
  title?: string;
}

/** Body for updating a global analysis */
export interface UpdateGlobalAnalysisDto {
  notes?: string;
  images?: string[] | null;
  imageNames?: string[] | null;
  analysisType?: string;
  /** When set and different from current scope, child analyses are recreated for the new assets */
  scope?: "global" | string[];
  favorite?: boolean;
  title?: string | null;
}

/** Unified analysis row from GET /fondamental/all-analysis */
export interface AllAnalysisItem {
  id: string;
  source: "global" | "asset";
  notes: string;
  title?: string | null;
  images: string[] | null;
  imageNames?: string[] | null;
  analysisType?: string;
  favorite?: boolean;
  createdAt: string;
  scopeLabel?: string | null;
  globalFullScope?: boolean;
  /** Present for scoped global rows: which assets the global analysis applies to */
  scopedAssetIds?: string[] | null;
  assetId?: string | null;
  assetName?: string | null;
  assetType?: string | null;
  assetSortOrder?: number | null;
  assetPlace?: number | null;
}

export type NoteTier = "tier_1" | "tier_2" | "tier_3";
export type NoteType = "macro" | "technical" | "other";

/** Single note returned by the API */
export interface Note {
  id: string;
  title: string;
  note: string;
  tier?: NoteTier;
  type?: NoteType;
  images?: string[] | null;
  imageNames?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating a note */
export interface CreateNoteDto {
  title: string;
  note: string;
  tier: NoteTier;
  type?: NoteType;
  images?: string[];
  imageNames?: string[];
}

/** Body for updating a note */
export interface UpdateNoteDto {
  title?: string;
  note?: string;
  tier?: NoteTier;
  type?: NoteType;
  images?: string[];
  imageNames?: string[];
}
