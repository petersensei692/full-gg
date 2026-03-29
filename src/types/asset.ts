export type StreamEntryTag =
  | "INTRADAY UPDATE"
  | "WEEKLY OUTLOOK"
  | "MONTHLY OUTLOOK"
  | "QoQ OUTLOOK"
  | "YEARLY OUTLOOK"
  | "POLICY NOTE"
  | "MARKET PULSE"
  | "TRADE NOTE";

export type StreamEntryTagColor =
  | "red"
  | "blue"
  | "yellow"
  | "green"
  | "maroon"
  | "orange"
  | "purple";

export interface StreamEntry {
  id: string;
  author: string;
  authorAvatar?: string;
  time: string;
  tag: StreamEntryTag;
  tagColor: StreamEntryTagColor;
  content: string; // plain text or HTML from editor
  images?: string[]; // stored image paths
  /** Display names for each image (same order as images); optional. */
  imageNames?: string[];
  bullets?: string[];
  chartData?: { label: string; value: number }[];
  quote?: { text: string; source: string };
  pairUpdates?: { pair: string; value: string; positive: boolean }[];
  /** Optional timestamp for sorting and date grouping */
  createdAt?: number;
  /** Analysis type for filtering: daily | weekly | monthly | qoq | yearly */
  analysisType?: string;
  /** Scope label: "GLOBAL", "USD•EUR•...", or single asset name for asset analysis */
  scopeLabel?: string | null;
}

export interface AssetSnapshot {
  indexLabel: string;
  indexValue: string;
  indexChange: string;
  indexChangePositive: boolean;
  sentimentLabel: string;
  sentimentPercent: number;
  events: { date: string; title: string; time: string }[];
}

export interface AssetConfig {
  id?: string; // UUID from API
  slug: string;
  label: string;
  type?: string; // currency | commodity | stocks | crypto | bond
  sortOrder?: number;
  /** Position within the asset's type section (1, 2, 3, ...). */
  place?: number;
  symbol?: string; // e.g. "DXY" for USD
  indexLabel: string; // e.g. "DXY INDEX"
  placeholder: string; // e.g. "Post a new USD analysis entry..."
}

const KNOWN_SYMBOLS: Record<string, string> = {
  usd: "DXY",
  eur: "EUR",
  gbp: "GBP",
  jpy: "JPY",
  cad: "CAD",
  chf: "CHF",
  aud: "AUD",
  nzd: "NZD",
  xau: "XAU",
  xag: "XAG",
  stocks: "STOCKS",
};

/** Convert API Asset to frontend AssetConfig */
export function assetToConfig(asset: {
  id: string;
  name: string;
  type?: string;
  sortOrder?: number;
  place?: number;
}): AssetConfig {
  const slug = asset.name.toLowerCase().replace(/\s/g, "-");
  const symbol = KNOWN_SYMBOLS[slug];
  return {
    id: asset.id,
    slug,
    label: asset.name,
    type: asset.type,
    sortOrder: asset.sortOrder,
    place: asset.place,
    symbol,
    indexLabel: symbol ? `${symbol} INDEX` : `${asset.name} INDEX`,
    placeholder: `Post a new ${asset.name} analysis entry...`,
  };
}

/** Fallback configs when API is unavailable (no id) */
export const ASSET_CONFIGS: Record<string, AssetConfig> = {
  usd: {
    slug: "usd",
    label: "USD",
    symbol: "DXY",
    indexLabel: "DXY INDEX",
    placeholder: "Post a new USD analysis entry...",
  },
  eur: {
    slug: "eur",
    label: "EUR",
    indexLabel: "EUR INDEX",
    placeholder: "Post a new EUR analysis entry...",
  },
  gbp: {
    slug: "gbp",
    label: "GBP",
    indexLabel: "GBP INDEX",
    placeholder: "Post a new GBP analysis entry...",
  },
  jpy: {
    slug: "jpy",
    label: "JPY",
    indexLabel: "JPY INDEX",
    placeholder: "Post a new JPY analysis entry...",
  },
  cad: {
    slug: "cad",
    label: "CAD",
    indexLabel: "CAD INDEX",
    placeholder: "Post a new CAD analysis entry...",
  },
  chf: {
    slug: "chf",
    label: "CHF",
    indexLabel: "CHF INDEX",
    placeholder: "Post a new CHF analysis entry...",
  },
  aud: {
    slug: "aud",
    label: "AUD",
    indexLabel: "AUD INDEX",
    placeholder: "Post a new AUD analysis entry...",
  },
  nzd: {
    slug: "nzd",
    label: "NZD",
    indexLabel: "NZD INDEX",
    placeholder: "Post a new NZD analysis entry...",
  },
  xau: {
    slug: "xau",
    label: "XAU",
    indexLabel: "XAU INDEX",
    placeholder: "Post a new XAU analysis entry...",
  },
  xag: {
    slug: "xag",
    label: "XAG",
    indexLabel: "XAG INDEX",
    placeholder: "Post a new XAG analysis entry...",
  },
  commodities: {
    slug: "commodities",
    label: "Commodities",
    indexLabel: "COMMODITIES",
    placeholder: "Post a new Commodities analysis entry...",
  },
  stocks: {
    slug: "stocks",
    label: "Stocks",
    indexLabel: "STOCKS",
    placeholder: "Post a new Stocks analysis entry...",
  },
};
