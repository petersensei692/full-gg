/** Single asset returned by the API */
export interface Asset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating an asset */
export interface CreateAssetDto {
  name: string;
}

/** Body for updating an asset (all fields optional) */
export interface UpdateAssetDto {
  name?: string;
}

/** Weekly calendar entry */
export interface WeeklyCalendar {
  id: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
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
  calendar: WeeklyCalendar;
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
  calendarId: string;
  day: string;
  time: string;
  assetId: string;
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
}

/** Single watch item returned by the API */
export interface WatchItem {
  id: string;
  watchlist: WeeklyWatchlist;
  baseAsset: Asset;
  quoteAsset: Asset;
  pairName: string;
  bias: string;
  thesis: Thesis | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating a watch item */
export interface CreateWatchItemDto {
  watchlistId: string;
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
}

/** Single analysis returned by the API */
export interface Analysis {
  id: string;
  notes: string;
  images: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating an analysis */
export interface CreateAnalysisDto {
  notes: string;
  images?: string[];
}

/** Body for updating an analysis */
export interface UpdateAnalysisDto {
  notes?: string;
  images?: string[] | null;
}
