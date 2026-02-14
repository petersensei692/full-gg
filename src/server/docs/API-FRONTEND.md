# GG Backend API — Frontend Implementation Guide

This document describes the backend API for the GG application so the frontend can implement calls correctly. It is precise and implementation-oriented.

---

## 1. Base URL and Swagger

| Item | Value |
|------|--------|
| **Base URL (dev)** | `http://localhost:5000` (from `.env` `PORT=5000`) |
| **Swagger UI** | `http://localhost:5000/api/docs` |
| **Content-Type** | `application/json` for request and response bodies |

Use Swagger UI to explore and test endpoints interactively.

---

## 2. Fondamental Module — Assets

Assets are identified by a **UUID** and have a **unique name** (e.g. USD, EUR, STOCKS).

### 2.1 TypeScript types (for frontend)

```typescript
/** Single asset returned by the API */
interface Asset {
  id: string;           // UUID v4
  name: string;         // 1–100 characters, unique
  createdAt: string;    // ISO 8601 date-time (e.g. "2025-02-08T12:00:00.000Z")
  updatedAt: string;   // ISO 8601 date-time
}

/** Body for creating an asset */
interface CreateAssetDto {
  name: string;         // Required, 1–100 chars
}

/** Body for updating an asset (all fields optional) */
interface UpdateAssetDto {
  name?: string;        // Optional, 1–100 chars
}
```

---

### 2.2 Endpoints

All asset endpoints are under the path prefix: **`/fondamental/assets`**.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/fondamental/assets` | Create a new asset |
| `GET` | `/fondamental/assets` | List all assets (ordered by name) |
| `GET` | `/fondamental/assets/:id` | Get one asset by UUID |
| `PATCH` | `/fondamental/assets/:id` | Update an asset (partial) |
| `DELETE` | `/fondamental/assets/:id` | Delete an asset |

---

### 2.3 Create asset

**Request**

- **Method:** `POST`
- **URL:** `http://localhost:5000/fondamental/assets`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**

```json
{
  "name": "USD"
}
```

**Validation rules for `name`**

- Required (non-empty string).
- Max length: 100 characters.
- Must be unique; duplicate name returns `409 Conflict`.

**Success response**

- **Status:** `201 Created`
- **Body:** The created asset (same shape as `Asset`).

**Example response (201)**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "USD",
  "createdAt": "2025-02-08T12:00:00.000Z",
  "updatedAt": "2025-02-08T12:00:00.000Z"
}
```

**Error responses**

| Status | When | Body shape (typical) |
|--------|------|------------------------|
| `400 Bad Request` | Validation failed (e.g. missing `name`, empty string, or `name` longer than 100 chars) | `{ "message": string | string[], "error": "Bad Request" }` |
| `409 Conflict` | An asset with the same `name` already exists | NestJS default error object with `message` and `error` |

---

### 2.4 List all assets

**Request**

- **Method:** `GET`
- **URL:** `http://localhost:5000/fondamental/assets`
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Array of assets, **ordered by `name` ascending**.

**Example response (200)**

```json
[
  {
    "id": "uuid-1",
    "name": "AUD",
    "createdAt": "2025-02-08T12:00:00.000Z",
    "updatedAt": "2025-02-08T12:00:00.000Z"
  },
  {
    "id": "uuid-2",
    "name": "USD",
    "createdAt": "2025-02-08T12:00:00.000Z",
    "updatedAt": "2025-02-08T12:00:00.000Z"
  }
]
```

Empty list: `[]` when there are no assets.

---

### 2.5 Get one asset by ID

**Request**

- **Method:** `GET`
- **URL:** `http://localhost:5000/fondamental/assets/:id`
- **Path parameter:** `id` — UUID of the asset (e.g. `123e4567-e89b-12d3-a456-426614174000`).
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Single asset object (`Asset`).

**Example response (200)**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "USD",
  "createdAt": "2025-02-08T12:00:00.000Z",
  "updatedAt": "2025-02-08T12:00:00.000Z"
}
```

**Error responses**

| Status | When |
|--------|------|
| `404 Not Found` | No asset with the given `id` (or invalid UUID format). Response body includes a `message` such as `"Asset with id <id> not found"`. |

---

### 2.6 Update asset (partial)

**Request**

- **Method:** `PATCH`
- **URL:** `http://localhost:5000/fondamental/assets/:id`
- **Path parameter:** `id` — UUID of the asset.
- **Headers:** `Content-Type: application/json`
- **Body (JSON):** Only fields you want to change. All fields are optional.

```json
{
  "name": "US Dollar"
}
```

**Validation rules for `name` (when provided)**

- Optional for PATCH.
- If present: non-empty string, max 100 characters.
- If provided and another asset already has that name: backend may return `409` or a DB error depending on setup.

**Success response**

- **Status:** `200 OK`
- **Body:** The updated asset (full `Asset` object).

**Example response (200)**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "US Dollar",
  "createdAt": "2025-02-08T12:00:00.000Z",
  "updatedAt": "2025-02-08T13:30:00.000Z"
}
```

**Error responses**

| Status | When |
|--------|------|
| `400 Bad Request` | Validation failed (e.g. `name` empty or too long). |
| `404 Not Found` | No asset with the given `id`. |

---

### 2.7 Delete asset

**Request**

- **Method:** `DELETE`
- **URL:** `http://localhost:5000/fondamental/assets/:id`
- **Path parameter:** `id` — UUID of the asset.
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Empty (or `{}` depending on NestJS version). Treat as “success, no body”.

**Error responses**

| Status | When |
|--------|------|
| `404 Not Found` | No asset with the given `id`. |

---

## 3. Fondamental Module — Watch Items

Watch items track trading pairs within a weekly watchlist. Each watch item links to a weekly watchlist and two assets (base and quote).

### 3.1 TypeScript types (for frontend)

```typescript
/** Thesis object structure */
interface Thesis {
  notes: string;
  images?: string[];  // Optional array of image paths
}

/** Single watch item returned by the API */
interface WatchItem {
  id: string;                    // UUID v4
  watchlist: WeeklyWatchlist;    // Full WeeklyWatchlist object
  baseAsset: Asset;              // Full Asset object
  quoteAsset: Asset;             // Full Asset object
  pairName: string;              // e.g. "BTC/USD"
  bias: string;                  // e.g. "bullish", "bearish"
  thesis: Thesis | null;         // Optional thesis object
  createdAt: string;             // ISO 8601 date-time
  updatedAt: string;             // ISO 8601 date-time
}

/** Body for creating a watch item */
interface CreateWatchItemDto {
  watchlistId: string;           // UUID of WeeklyWatchlist
  baseAssetId: string;           // UUID of base Asset
  quoteAssetId: string;          // UUID of quote Asset
  pairName: string;              // Required, max 255 chars
  bias: string;                  // Required, max 100 chars
  thesis?: Thesis;               // Optional thesis object
}

/** Body for updating a watch item (all fields optional) */
interface UpdateWatchItemDto {
  watchlistId?: string;          // UUID of WeeklyWatchlist
  baseAssetId?: string;          // UUID of base Asset
  quoteAssetId?: string;         // UUID of quote Asset
  pairName?: string;             // Max 255 chars
  bias?: string;                 // Max 100 chars
  thesis?: Thesis | null;        // Can be null to clear thesis
}
```

**Important:** When updating `thesis`, you can send a partial object. If `notes` is omitted, it will merge with the existing thesis `notes`. To clear the thesis, send `null`.

---

### 3.2 Endpoints

All watch item endpoints are under the path prefix: **`/fondamental/assets/watch-items`**.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/fondamental/assets/watch-items` | Create a new watch item |
| `GET` | `/fondamental/assets/watch-items` | List all watch items (ordered by createdAt DESC) |
| `GET` | `/fondamental/assets/watch-items/:id` | Get one watch item by UUID |
| `PATCH` | `/fondamental/assets/watch-items/:id` | Update a watch item (partial) |
| `DELETE` | `/fondamental/assets/watch-items/:id` | Delete a watch item |

---

### 3.3 Create watch item

**Request**

- **Method:** `POST`
- **URL:** `http://localhost:5000/fondamental/assets/watch-items`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**

```json
{
  "watchlistId": "123e4567-e89b-12d3-a456-426614174000",
  "baseAssetId": "223e4567-e89b-12d3-a456-426614174000",
  "quoteAssetId": "323e4567-e89b-12d3-a456-426614174000",
  "pairName": "BTC/USD",
  "bias": "bullish",
  "thesis": {
    "notes": "Strong support at $50k level",
    "images": ["/images/chart1.png", "/images/chart2.png"]
  }
}
```

**Validation rules**

- `watchlistId`: Required UUID, must exist in `weekly_watchlist` table.
- `baseAssetId`: Required UUID, must exist in `assets` table.
- `quoteAssetId`: Required UUID, must exist in `assets` table.
- `pairName`: Required, non-empty string, max 255 characters.
- `bias`: Required, non-empty string, max 100 characters.
- `thesis`: Optional object. If provided:
  - `notes`: Required string (if thesis is provided).
  - `images`: Optional array of strings (image paths).

**Success response**

- **Status:** `201 Created`
- **Body:** The created watch item with full relations loaded.

**Example response (201)**

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174000",
  "watchlist": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "startDate": "2025-02-03T00:00:00.000Z",
    "endDate": "2025-02-09T23:59:59.999Z",
    "createdAt": "2025-02-01T10:00:00.000Z",
    "updatedAt": "2025-02-01T10:00:00.000Z"
  },
  "baseAsset": {
    "id": "223e4567-e89b-12d3-a456-426614174000",
    "name": "BTC",
    "createdAt": "2025-02-01T10:00:00.000Z",
    "updatedAt": "2025-02-01T10:00:00.000Z"
  },
  "quoteAsset": {
    "id": "323e4567-e89b-12d3-a456-426614174000",
    "name": "USD",
    "createdAt": "2025-02-01T10:00:00.000Z",
    "updatedAt": "2025-02-01T10:00:00.000Z"
  },
  "pairName": "BTC/USD",
  "bias": "bullish",
  "thesis": {
    "notes": "Strong support at $50k level",
    "images": ["/images/chart1.png", "/images/chart2.png"]
  },
  "createdAt": "2025-02-08T12:00:00.000Z",
  "updatedAt": "2025-02-08T12:00:00.000Z"
}
```

**Error responses**

| Status | When | Body shape (typical) |
|--------|------|------------------------|
| `400 Bad Request` | Validation failed (invalid UUID format, missing required fields, etc.) | `{ "message": string | string[], "error": "Bad Request" }` |
| `404 Not Found` | `watchlistId`, `baseAssetId`, or `quoteAssetId` does not exist | `{ "message": "Weekly watchlist with id ... not found" }` |

---

### 3.4 List all watch items

**Request**

- **Method:** `GET`
- **URL:** `http://localhost:5000/fondamental/assets/watch-items`
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Array of watch items with relations loaded, **ordered by `createdAt` descending**.

**Example response (200)**

```json
[
  {
    "id": "423e4567-e89b-12d3-a456-426614174000",
    "watchlist": { /* WeeklyWatchlist object */ },
    "baseAsset": { /* Asset object */ },
    "quoteAsset": { /* Asset object */ },
    "pairName": "BTC/USD",
    "bias": "bullish",
    "thesis": { "notes": "...", "images": [...] },
    "createdAt": "2025-02-08T12:00:00.000Z",
    "updatedAt": "2025-02-08T12:00:00.000Z"
  }
]
```

Empty list: `[]` when there are no watch items.

---

### 3.5 Get one watch item by ID

**Request**

- **Method:** `GET`
- **URL:** `http://localhost:5000/fondamental/assets/watch-items/:id`
- **Path parameter:** `id` — UUID of the watch item.
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Single watch item object with relations loaded.

**Error responses**

| Status | When |
|--------|------|
| `404 Not Found` | No watch item with the given `id`. |

---

### 3.6 Update watch item (partial)

**Request**

- **Method:** `PATCH`
- **URL:** `http://localhost:5000/fondamental/assets/watch-items/:id`
- **Path parameter:** `id` — UUID of the watch item.
- **Headers:** `Content-Type: application/json`
- **Body (JSON):** Only fields you want to change. All fields are optional.

```json
{
  "bias": "bearish",
  "thesis": {
    "notes": "Updated analysis",
    "images": ["/images/new-chart.png"]
  }
}
```

**Partial thesis update:** If you send `thesis` with only `images` (no `notes`), it will merge with the existing `notes`. To clear thesis, send `"thesis": null`.

**Success response**

- **Status:** `200 OK`
- **Body:** The updated watch item with relations loaded.

**Error responses**

| Status | When |
|--------|------|
| `400 Bad Request` | Validation failed. |
| `404 Not Found` | Watch item, watchlist, or asset not found. |

---

### 3.7 Delete watch item

**Request**

- **Method:** `DELETE`
- **URL:** `http://localhost:5000/fondamental/assets/watch-items/:id`
- **Path parameter:** `id` — UUID of the watch item.
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Empty.

**Error responses**

| Status | When |
|--------|------|
| `404 Not Found` | No watch item with the given `id`. |

**Cascade delete:** If a `WeeklyWatchlist` is deleted, all associated watch items are automatically deleted by the database.

---

## 4. Fondamental Module — Events

Events are calendar entries linked to a weekly calendar and an asset. They represent scheduled events (e.g., FOMC meetings, earnings releases).

### 4.1 TypeScript types (for frontend)

```typescript
/** Single event returned by the API */
interface Event {
  id: string;                    // UUID v4
  calendar: WeeklyCalendar;      // Full WeeklyCalendar object
  day: string;                   // e.g. "Monday", "Tuesday"
  time: string;                  // e.g. "14:30", "09:00"
  asset: Asset;                  // Full Asset object
  name: string;                  // Event name, max 255 chars
  impact: string;                // Impact level, max 100 chars (e.g. "High", "Medium", "Low")
  createdAt: string;             // ISO 8601 date-time
  updatedAt: string;             // ISO 8601 date-time
}

/** Body for creating an event */
interface CreateEventDto {
  calendarId: string;            // UUID of WeeklyCalendar
  day: string;                   // Required, max 50 chars
  time: string;                  // Required, max 50 chars
  assetId: string;               // UUID of Asset
  name: string;                  // Required, max 255 chars
  impact: string;                // Required, max 100 chars
}

/** Body for updating an event (all fields optional) */
interface UpdateEventDto {
  calendarId?: string;           // UUID of WeeklyCalendar
  day?: string;                  // Max 50 chars
  time?: string;                 // Max 50 chars
  assetId?: string;              // UUID of Asset
  name?: string;                 // Max 255 chars
  impact?: string;               // Max 100 chars
}
```

---

### 4.2 Endpoints

All event endpoints are under the path prefix: **`/fondamental/assets/events`**.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/fondamental/assets/events` | Create a new event |
| `GET` | `/fondamental/assets/events` | List all events (ordered by createdAt DESC) |
| `GET` | `/fondamental/assets/events/:id` | Get one event by UUID |
| `PATCH` | `/fondamental/assets/events/:id` | Update an event (partial) |
| `DELETE` | `/fondamental/assets/events/:id` | Delete an event |

---

### 4.3 Create event

**Request**

- **Method:** `POST`
- **URL:** `http://localhost:5000/fondamental/assets/events`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**

```json
{
  "calendarId": "123e4567-e89b-12d3-a456-426614174000",
  "day": "Wednesday",
  "time": "14:30",
  "assetId": "223e4567-e89b-12d3-a456-426614174000",
  "name": "FOMC Meeting",
  "impact": "High"
}
```

**Validation rules**

- `calendarId`: Required UUID, must exist in `weekly_calendar` table.
- `day`: Required, non-empty string, max 50 characters.
- `time`: Required, non-empty string, max 50 characters.
- `assetId`: Required UUID, must exist in `assets` table.
- `name`: Required, non-empty string, max 255 characters.
- `impact`: Required, non-empty string, max 100 characters.

**Success response**

- **Status:** `201 Created`
- **Body:** The created event with relations loaded.

**Example response (201)**

```json
{
  "id": "523e4567-e89b-12d3-a456-426614174000",
  "calendar": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "startDate": "2025-02-03T00:00:00.000Z",
    "endDate": "2025-02-09T23:59:59.999Z",
    "createdAt": "2025-02-01T10:00:00.000Z",
    "updatedAt": "2025-02-01T10:00:00.000Z"
  },
  "day": "Wednesday",
  "time": "14:30",
  "asset": {
    "id": "223e4567-e89b-12d3-a456-426614174000",
    "name": "USD",
    "createdAt": "2025-02-01T10:00:00.000Z",
    "updatedAt": "2025-02-01T10:00:00.000Z"
  },
  "name": "FOMC Meeting",
  "impact": "High",
  "createdAt": "2025-02-08T12:00:00.000Z",
  "updatedAt": "2025-02-08T12:00:00.000Z"
}
```

**Error responses**

| Status | When | Body shape (typical) |
|--------|------|------------------------|
| `400 Bad Request` | Validation failed | `{ "message": string | string[], "error": "Bad Request" }` |
| `404 Not Found` | `calendarId` or `assetId` does not exist | `{ "message": "Weekly calendar with id ... not found" }` |

---

### 4.4 List all events

**Request**

- **Method:** `GET`
- **URL:** `http://localhost:5000/fondamental/assets/events`
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Array of events with relations loaded, **ordered by `createdAt` descending**.

Empty list: `[]` when there are no events.

---

### 4.5 Get one event by ID

**Request**

- **Method:** `GET`
- **URL:** `http://localhost:5000/fondamental/assets/events/:id`
- **Path parameter:** `id` — UUID of the event.
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Single event object with relations loaded.

**Error responses**

| Status | When |
|--------|------|
| `404 Not Found` | No event with the given `id`. |

---

### 4.6 Update event (partial)

**Request**

- **Method:** `PATCH`
- **URL:** `http://localhost:5000/fondamental/assets/events/:id`
- **Path parameter:** `id` — UUID of the event.
- **Headers:** `Content-Type: application/json`
- **Body (JSON):** Only fields you want to change.

```json
{
  "impact": "Medium",
  "time": "15:00"
}
```

**Success response**

- **Status:** `200 OK`
- **Body:** The updated event with relations loaded.

**Error responses**

| Status | When |
|--------|------|
| `400 Bad Request` | Validation failed. |
| `404 Not Found` | Event, calendar, or asset not found. |

---

### 4.7 Delete event

**Request**

- **Method:** `DELETE`
- **URL:** `http://localhost:5000/fondamental/assets/events/:id`
- **Path parameter:** `id` — UUID of the event.
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Empty.

**Error responses**

| Status | When |
|--------|------|
| `404 Not Found` | No event with the given `id`. |

**Cascade delete:** If a `WeeklyCalendar` is deleted, all associated events are automatically deleted by the database.

---

## 5. Fondamental Module — Analysis

Analysis entries contain notes and optional images. They are standalone records (no relations to other entities).

### 5.1 TypeScript types (for frontend)

```typescript
/** Single analysis returned by the API */
interface Analysis {
  id: string;                    // UUID v4
  notes: string;                 // Analysis notes (text)
  images: string[] | null;       // Array of image paths, or null
  createdAt: string;             // ISO 8601 date-time
  updatedAt: string;             // ISO 8601 date-time
}

/** Body for creating an analysis */
interface CreateAnalysisDto {
  notes: string;                 // Required
  images?: string[];             // Optional array of image paths
}

/** Body for updating an analysis (all fields optional) */
interface UpdateAnalysisDto {
  notes?: string;                // Optional
  images?: string[] | null;      // Optional, can be null to clear images
}
```

---

### 5.2 Endpoints

All analysis endpoints are under the path prefix: **`/fondamental/assets/analysis`**.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/fondamental/assets/analysis` | Create a new analysis |
| `GET` | `/fondamental/assets/analysis` | List all analyses (ordered by createdAt DESC) |
| `GET` | `/fondamental/assets/analysis/:id` | Get one analysis by UUID |
| `PATCH` | `/fondamental/assets/analysis/:id` | Update an analysis (partial) |
| `DELETE` | `/fondamental/assets/analysis/:id` | Delete an analysis |

---

### 5.3 Create analysis

**Request**

- **Method:** `POST`
- **URL:** `http://localhost:5000/fondamental/assets/analysis`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**

```json
{
  "notes": "Market shows bullish signals with strong support at $50k. Volume is increasing.",
  "images": ["/images/analysis1.png", "/images/analysis2.png"]
}
```

**Validation rules**

- `notes`: Required, non-empty string.
- `images`: Optional array of strings (image paths).

**Success response**

- **Status:** `201 Created`
- **Body:** The created analysis.

**Example response (201)**

```json
{
  "id": "623e4567-e89b-12d3-a456-426614174000",
  "notes": "Market shows bullish signals with strong support at $50k. Volume is increasing.",
  "images": ["/images/analysis1.png", "/images/analysis2.png"],
  "createdAt": "2025-02-08T12:00:00.000Z",
  "updatedAt": "2025-02-08T12:00:00.000Z"
}
```

**Error responses**

| Status | When | Body shape (typical) |
|--------|------|------------------------|
| `400 Bad Request` | Validation failed (e.g. missing `notes`) | `{ "message": string | string[], "error": "Bad Request" }` |

---

### 5.4 List all analyses

**Request**

- **Method:** `GET`
- **URL:** `http://localhost:5000/fondamental/assets/analysis`
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Array of analyses, **ordered by `createdAt` descending**.

**Example response (200)**

```json
[
  {
    "id": "623e4567-e89b-12d3-a456-426614174000",
    "notes": "Market analysis...",
    "images": ["/images/chart.png"],
    "createdAt": "2025-02-08T12:00:00.000Z",
    "updatedAt": "2025-02-08T12:00:00.000Z"
  },
  {
    "id": "723e4567-e89b-12d3-a456-426614174000",
    "notes": "Another analysis...",
    "images": null,
    "createdAt": "2025-02-07T10:00:00.000Z",
    "updatedAt": "2025-02-07T10:00:00.000Z"
  }
]
```

Empty list: `[]` when there are no analyses.

---

### 5.5 Get one analysis by ID

**Request**

- **Method:** `GET`
- **URL:** `http://localhost:5000/fondamental/assets/analysis/:id`
- **Path parameter:** `id` — UUID of the analysis.
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Single analysis object.

**Error responses**

| Status | When |
|--------|------|
| `404 Not Found` | No analysis with the given `id`. |

---

### 5.6 Update analysis (partial)

**Request**

- **Method:** `PATCH`
- **URL:** `http://localhost:5000/fondamental/assets/analysis/:id`
- **Path parameter:** `id` — UUID of the analysis.
- **Headers:** `Content-Type: application/json`
- **Body (JSON):** Only fields you want to change.

```json
{
  "notes": "Updated analysis notes",
  "images": null
}
```

To clear images, send `"images": null`.

**Success response**

- **Status:** `200 OK`
- **Body:** The updated analysis.

**Error responses**

| Status | When |
|--------|------|
| `400 Bad Request` | Validation failed. |
| `404 Not Found` | No analysis with the given `id`. |

---

### 5.7 Delete analysis

**Request**

- **Method:** `DELETE`
- **URL:** `http://localhost:5000/fondamental/assets/analysis/:id`
- **Path parameter:** `id` — UUID of the analysis.
- **Body:** None.

**Success response**

- **Status:** `200 OK`
- **Body:** Empty.

**Error responses**

| Status | When |
|--------|------|
| `404 Not Found` | No analysis with the given `id`. |

---

## 6. Seeded assets (reference)

After running the backend seed (`npm run seed:run`), the following asset **names** exist (exact strings):

- `USD`
- `EUR`
- `GBP`
- `JPY`
- `CAD`
- `CHF`
- `AUD`
- `NZD`
- `XAU`
- `XAG`
- `STOCKS`

The frontend can use this list for labels or dropdowns; actual IDs come from the API (e.g. from `GET /fondamental/assets`).

---

## 7. CORS and frontend URL

The backend is configured to allow a frontend origin. The frontend URL is set in `.env` as `FRONTEND_URL=http://localhost:3000`. If your frontend runs on another origin, CORS may need to be configured in the backend (e.g. in `main.ts`). For same-machine dev with frontend on `http://localhost:3000`, ensure the backend allows that origin.

---

## 8. Summary for frontend

1. **Base URL:** `http://localhost:5000`
2. **Swagger:** `http://localhost:5000/api/docs`
3. **Module paths:**
   - Assets: `/fondamental/assets`
   - Watch Items: `/fondamental/assets/watch-items`
   - Events: `/fondamental/assets/events`
   - Analysis: `/fondamental/assets/analysis`
4. **IDs:** Always UUIDs (strings).
5. **Dates:** ISO 8601 strings in `createdAt` and `updatedAt`.
6. **Relations:** When fetching watch items or events, related entities (watchlist, calendar, assets) are included in the response.
7. **Cascade deletes:**
   - Deleting a `WeeklyWatchlist` automatically deletes all associated watch items.
   - Deleting a `WeeklyCalendar` automatically deletes all associated events.
8. **Errors:** Use `status` and parse `body.message` (or `body.message[]` for validation errors) for user-facing messages.
9. **Validation:** Send valid JSON; respect required fields and max lengths to avoid `400` responses.
10. **Partial updates:** All PATCH endpoints support partial updates. Omit fields you don't want to change.

Use this document together with Swagger at `/api/docs` for precise request/response shapes and status codes.
