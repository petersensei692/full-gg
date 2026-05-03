/** Required tables and their columns for SQLite database validation. Order of columns does not matter. */
export const EXPECTED_SQLITE_SCHEMA: Record<string, string[]> = {
  analysis: ['id', 'asset_id', 'notes', 'images', 'image_names', 'created_at', 'updated_at'],
  assets: ['id', 'name', 'type', 'sort_order', 'place', 'created_at', 'updated_at'],
  notes: ['id', 'title', 'note', 'tier', 'type', 'images', 'image_names', 'created_at', 'updated_at'],
  watch_items: ['id', 'watchlist_id', 'base_asset_id', 'quote_asset_id', 'pair_name', 'bias', 'thesis', 'finished', 'created_at', 'updated_at'],
  weekly_watchlist: ['id', 'start_date', 'end_date', 'created_at', 'updated_at'],
  asset_watchlist: ['id', 'start_date', 'end_date', 'weekly_watchlist_id', 'asset_id', 'created_at', 'updated_at'],
};
