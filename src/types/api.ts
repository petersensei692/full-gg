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

/** Weekly calendar entry */
export interface WeeklyCalendar {
  id: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

/** Asset calendar - links a weekly calendar to a specific asset */
export interface AssetCalendar {
  id: string;
  startDate: string;
  endDate: string;
  weeklyCalendar: WeeklyCalendar;
  asset: Asset;
  createdAt: string;
  updatedAt: string;
}

/** Weekly watchlist entry */
export interface WeeklyWatchlist {
  id: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

/** Body for creating a weekly calendar */
export interface CreateWeeklyCalendarDto {
  startDate: string;
  endDate: string;
}

/** Body for updating a weekly calendar */
export interface UpdateWeeklyCalendarDto {
  startDate?: string;
  endDate?: string;
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

/** Single event returned by the API */
export interface Event {
  id: string;
  calendar: WeeklyCalendar | null;
  assetCalendar: AssetCalendar | null;
  day: string;
  time: string;
  asset: Asset;
  name: string;
  impact: string;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating an event */
export interface CreateEventDto {
  assetCalendarId?: string;
  calendarId?: string;
  day: string;
  time: string;
  assetId?: string;
  name: string;
  impact: string;
}

/** Body for updating an event */
export interface UpdateEventDto {
  calendarId?: string;
  day?: string;
  time?: string;
  assetId?: string;
  name?: string;
  impact?: string;
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

export interface TradeNote {
  text: string;
  images: string[];
}

export interface Trade {
  id: string;
  pair: string;
  type: TradeType;
  executionType: TradeExecutionType;
  executionTime: string;
  executionPrice: number;
  tpPrice: number;
  slPrice: number;
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
  executionTime: string;
  executionPrice: number;
  tpPrice: number;
  slPrice: number;
  profitFactorTargeted: number;
  profitFactorEarned: TradeProfitFactorEarned;
  positionSize: number;
  closePrices?: TradeClosePrice[];
  tradeCloseTime?: string | null;
  status: TradeStatus;
  trackNotes?: TradeNote[];
}

export interface UpdateTradeDto {
  pair?: string;
  pairWatchedId?: string | null;
  type?: TradeType;
  executionType?: TradeExecutionType;
  executionTime?: string;
  executionPrice?: number;
  tpPrice?: number;
  slPrice?: number;
  profitFactorTargeted?: number;
  profitFactorEarned?: TradeProfitFactorEarned;
  positionSize?: number;
  closePrices?: TradeClosePrice[];
  tradeCloseTime?: string | null;
  status?: TradeStatus;
  trackNotes?: TradeNote[];
}

/** Single analysis returned by the API */
export interface Analysis {
  id: string;
  assetId: string;
  asset?: Asset;
  notes: string;
  images: string[] | null;
  imageNames?: string[] | null;
  /** "GLOBAL", "USD•EUR•...", or null for single-asset analysis */
  scopeLabel?: string | null;
  /** Set when this analysis was created from a global analysis; edit/delete only from Global Analysis page */
  globalAnalysisId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating an analysis */
export interface CreateAnalysisDto {
  assetId: string;
  notes: string;
  images?: string[];
}

/** Body for updating an analysis */
export interface UpdateAnalysisDto {
  assetId?: string;
  notes?: string;
  images?: string[] | null;
  imageNames?: string[] | null;
}

/** Global analysis (template applied to one or more assets) */
export interface GlobalAnalysis {
  id: string;
  notes: string;
  images: string[] | null;
  imageNames: string[] | null;
  scope: "global" | string[];
  scopeDisplay: string;
  analysisType?: string;
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
}

/** Body for updating a global analysis */
export interface UpdateGlobalAnalysisDto {
  notes?: string;
  images?: string[] | null;
  imageNames?: string[] | null;
  analysisType?: string;
  /** When set and different from current scope, child analyses are recreated for the new assets */
  scope?: "global" | string[];
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
