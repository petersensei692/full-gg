/** Required tables and their columns for SQLite database validation. Order of columns does not matter. */
export const EXPECTED_SQLITE_SCHEMA: Record<string, string[]> = {
  analysis: ['id', 'asset_id', 'notes', 'images', 'image_names', 'created_at', 'updated_at'],
  assets: ['id', 'name', 'created_at', 'updated_at'],
  notes: ['id', 'title', 'note', 'created_at', 'updated_at'],
  events: ['id', 'calendar_id', 'day', 'time', 'asset_id', 'name', 'impact', 'created_at', 'updated_at'],
  watch_items: ['id', 'watchlist_id', 'base_asset_id', 'quote_asset_id', 'pair_name', 'bias', 'thesis', 'created_at', 'updated_at'],
  weekly_watchlist: ['id', 'start_date', 'end_date', 'created_at', 'updated_at'],
  weekly_calendar: ['id', 'start_date', 'end_date', 'created_at', 'updated_at'],
};
