/** Use everywhere we format dates for UI that SSR/hydrates — avoids Node vs browser default-locale mismatches. */
export const APP_DATE_LOCALE = "en-US" as const;

/** Stable month abbreviations (table headers, etc.). */
export const MONTH_SHORT_GRID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
