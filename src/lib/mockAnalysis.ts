import type { StreamEntry, AssetSnapshot } from "@/types/asset";

export function getMockStreamEntries(assetSlug: string): StreamEntry[] {
  const assetLabel = assetSlug.toUpperCase().replace(/-/g, " ");
  return [
    {
      id: "1",
      author: "Alex Rivera",
      time: "08:15 AM EST",
      tag: "WEEKLY OUTLOOK",
      tagColor: "green",
      content: `${assetLabel} consolidation continues with key resistance in focus. Yields and risk sentiment remain the main volatility catalysts for the session.`,
      bullets: [
        "Core PCE data in focus this week",
        "Risk sentiment driving flows",
        "Key support level holds",
      ],
      chartData: [
        { label: "Mon", value: 105.2 },
        { label: "Tue", value: 105.8 },
        { label: "Wed", value: 106.1 },
        { label: "Thu", value: 105.9 },
        { label: "Fri", value: 106.4 },
      ],
    },
    {
      id: "2",
      author: "TradeBot Pro",
      time: "11:30 AM EST",
      tag: "INTRADAY UPDATE",
      tagColor: "orange",
      content: `US Treasury 10Y yields and ${assetLabel} tracking higher, testing key levels.`,
      pairUpdates: [
        { pair: "EURUSD", value: "1.0582", positive: true },
        { pair: "USDJPY", value: "149.85", positive: false },
      ],
    },
    {
      id: "3",
      author: "Macro Research Desk",
      time: "06:00 PM EST",
      tag: "POLICY NOTE",
      tagColor: "blue",
      content: "FOMC member speeches in focus. Recent rhetoric suggests caution on further rate moves.",
      quote: {
        text: "The recent rise in long-term yields has been significant and could reduce the need for further policy action.",
        source: "Summary of Recent Fed Rhetoric",
      },
    },
  ];
}

export function getMockSnapshot(assetSlug: string): AssetSnapshot {
  const configs: Record<string, AssetSnapshot> = {
    usd: {
      indexLabel: "DXY INDEX",
      indexValue: "106.14",
      indexChange: "+0.12%",
      indexChangePositive: true,
      sentimentLabel: "BULLISH",
      sentimentPercent: 68,
      events: [
        { date: "OCT 27", title: "Core PCE Price Index", time: "00:30 AM EST" },
        { date: "OCT 29", title: "CB Consumer Confidence", time: "10:00 AM EST" },
      ],
    },
    eur: {
      indexLabel: "EUR INDEX",
      indexValue: "1.0582",
      indexChange: "-0.05%",
      indexChangePositive: false,
      sentimentLabel: "NEUTRAL",
      sentimentPercent: 52,
      events: [
        { date: "OCT 27", title: "ECB President Speech", time: "08:00 AM EST" },
        { date: "OCT 30", title: "German CPI", time: "02:00 AM EST" },
      ],
    },
    gbp: {
      indexLabel: "GBP INDEX",
      indexValue: "1.2145",
      indexChange: "+0.08%",
      indexChangePositive: true,
      sentimentLabel: "BULLISH",
      sentimentPercent: 61,
      events: [
        { date: "OCT 28", title: "BoE Governor Speech", time: "07:00 AM EST" },
        { date: "OCT 31", title: "UK GDP", time: "02:00 AM EST" },
      ],
    },
    jpy: {
      indexLabel: "JPY INDEX",
      indexValue: "149.85",
      indexChange: "-0.12%",
      indexChangePositive: false,
      sentimentLabel: "BEARISH",
      sentimentPercent: 38,
      events: [
        { date: "OCT 28", title: "BoJ Policy Decision", time: "12:00 AM EST" },
        { date: "OCT 30", title: "Tokyo CPI", time: "06:30 PM EST" },
      ],
    },
    cad: {
      indexLabel: "CAD INDEX",
      indexValue: "1.3821",
      indexChange: "+0.03%",
      indexChangePositive: true,
      sentimentLabel: "NEUTRAL",
      sentimentPercent: 55,
      events: [
        { date: "OCT 28", title: "BoC CPI", time: "08:30 AM EST" },
        { date: "OCT 31", title: "Canadian GDP", time: "08:30 AM EST" },
      ],
    },
    chf: {
      indexLabel: "CHF INDEX",
      indexValue: "0.8921",
      indexChange: "-0.02%",
      indexChangePositive: false,
      sentimentLabel: "NEUTRAL",
      sentimentPercent: 48,
      events: [
        { date: "OCT 29", title: "SNB Chairman Speech", time: "03:00 AM EST" },
        { date: "OCT 31", title: "Swiss KOF", time: "02:00 AM EST" },
      ],
    },
    aud: {
      indexLabel: "AUD INDEX",
      indexValue: "0.6342",
      indexChange: "+0.15%",
      indexChangePositive: true,
      sentimentLabel: "BULLISH",
      sentimentPercent: 62,
      events: [
        { date: "OCT 29", title: "RBA Governor Speech", time: "06:00 PM EST" },
        { date: "OCT 31", title: "Australian Retail Sales", time: "06:30 PM EST" },
      ],
    },
    nzd: {
      indexLabel: "NZD INDEX",
      indexValue: "0.5821",
      indexChange: "-0.04%",
      indexChangePositive: false,
      sentimentLabel: "NEUTRAL",
      sentimentPercent: 50,
      events: [
        { date: "OCT 30", title: "RBNZ Rate Decision", time: "02:00 PM EST" },
        { date: "OCT 31", title: "NZ Employment", time: "02:45 PM EST" },
      ],
    },
    commodities: {
      indexLabel: "COMMODITIES",
      indexValue: "—",
      indexChange: "0.00%",
      indexChangePositive: true,
      sentimentLabel: "NEUTRAL",
      sentimentPercent: 50,
      events: [
        { date: "OCT 27", title: "Oil Inventories", time: "10:30 AM EST" },
        { date: "OCT 29", title: "Gold COT Report", time: "03:30 PM EST" },
      ],
    },
    stocks: {
      indexLabel: "STOCKS",
      indexValue: "—",
      indexChange: "0.00%",
      indexChangePositive: true,
      sentimentLabel: "BULLISH",
      sentimentPercent: 58,
      events: [
        { date: "OCT 27", title: "Major Earnings", time: "04:00 PM EST" },
        { date: "OCT 29", title: "Fed Beige Book", time: "02:00 PM EST" },
      ],
    },
  };

  const defaultSnapshot: AssetSnapshot = {
    indexLabel: `${assetSlug.toUpperCase()} INDEX`,
    indexValue: "—",
    indexChange: "0.00%",
    indexChangePositive: true,
    sentimentLabel: "NEUTRAL",
    sentimentPercent: 50,
    events: [
      { date: "—", title: "No high impact events", time: "—" },
    ],
  };

  return configs[assetSlug] ?? defaultSnapshot;
}
