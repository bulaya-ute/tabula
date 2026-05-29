# Roadmap

Locked-in changes and planned features, grouped by effort.

---

## Polish (low effort)

### Column Remapper — mapping table headers
Add a header row above the mapping rows in step 3 with column labels:

| Column | Label |
|--------|-------|
| Output header text input | **Output column** |
| Source type select | **Source type** |
| Source column/value input | **Source value** |
| Transform select | **Transform** |
| ↑↓× actions | *(no label)* |

### Preview overflow handling
For all data previews across all tools:
- Table wrapper: ensure `overflow-x-auto` is consistently applied
- Columns: add `min-w-[8rem]` on `<th>`/`<td>` to prevent extreme squishing
- Cells: add `title={cellValue}` tooltip so truncated content is readable on hover (no per-cell scrolling)

### Clear all button
Add a one-click "Clear all" action to tools with lists of user-configured items:
- Column Remapper step 3: clear all mappings
- Other tools where applicable

### File Comparator — swap files button
Add a ⇄ button between the two file cards in step 1. Swaps both file objects and flips `sourceCol ↔ lookupCol` in each mapping row simultaneously.

---

## Medium effort

### Hash-based URL routing
Replace the `view` string state in `App.tsx` with hash-based routing.

- Navigation sets `window.location.hash` to the tool id (e.g. `#file-comparator`)
- A `hashchange` listener syncs the active view from the URL on load and on browser navigation
- Browser back/forward button works natively (each navigation is a history entry)
- Direct links to tools work (e.g. `https://app/#deduplicator`)
- Home maps to `#home` or an empty hash

Changes are contained to `App.tsx` (~30 lines).

### Data preview on all tools
Extract the ad-hoc preview table in `ColumnRemapper` into a shared `DataPreview` component (`src/components/DataPreview.tsx`) that accepts headers and rows and renders a scrollable table.

Add previews to:

| Tool | What the preview shows |
|------|------------------------|
| Column Picker | Selected/reordered/renamed columns, first N rows |
| Trimmer | Before → after for first N rows |
| File Merger | First few rows of the merged output |
| File Comparator | First few diff rows before downloading |
| Deduplicator | First few rows of the deduplicated output |
| Empty Row Remover | First few rows of the cleaned output |
| Header Normaliser | Extend existing header table to also show data rows |
| CSV/XLSX Converter | Skip — data is unchanged, preview adds no value |

---

## Larger features

### File Splitter

Replace the current stub with a full implementation.

**UX flow:**
1. Upload a single file
2. Choose split mode:
   - **Max rows per file** — validate: ≥ 1 and ≤ total row count
   - **Target number of files** — validate: ≥ 2 and ≤ total row count
3. Preview: paginated grid of cards (12 per page). Each card shows: filename, row range, row count. No file contents shown.
4. Click a card → generate that split on demand and download it
5. "Download all as ZIP" button → generate all splits and bundle with JSZip

**Implementation note:** Store row index ranges only (not data) during preview. Build the actual file data lazily when a card is clicked or when "Download all" is triggered. This keeps memory usage low for large files.

**Dependencies to add:** `jszip`

### Column Populator

See [column-populator-design.md](column-populator-design.md) for the full design spec. This is the most complex planned feature.
