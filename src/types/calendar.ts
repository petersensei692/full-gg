/** Shared across all assets; created from any asset and selectable everywhere */
export interface WeeklyCalendar {
  id: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;
  createdAt: number;
}

export type EventImpact = "low" | "medium" | "high";

export interface EconomicEvent {
  id: string;
  weeklyCalendarId: string;
  name: string;
  impact: EventImpact;
  date: string; // ISO date YYYY-MM-DD (day within the week)
  time?: string; // optional e.g. "08:30"
  currency?: string; // e.g. "USD", "EUR"
  country?: string; // e.g. "USD", "EUR", "GBP" for sort/group by country
}

export type WatchlistBias = "bullish" | "bearish";

export interface WatchlistEntry {
  id: string;
  weeklyCalendarId: string;
  assetSlug: string; // current asset (one of base or quote must match)
  baseAsset: string; // e.g. "eur"
  quoteAsset: string; // e.g. "usd"
  pairName: string; // e.g. "EUR / USD"
  thesis: string; // HTML from contenteditable
  chartImages: string[]; // base64 data URLs
  createdAt: number;
  bias?: WatchlistBias; // bullish or bearish
}
