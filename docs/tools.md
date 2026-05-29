# Tools

## Implemented

### Column Remapper
Map source columns to a custom output schema. Each output column can be sourced from an input column, a fixed value, or left blank. Supports per-column transforms: uppercase, lowercase, trim whitespace, and round to N decimal places. Includes a live preview of the first 5 rows.

### Column Picker
Select which columns to keep, reorder them by dragging or using arrows, and rename headers — all in one step.

### Header Normaliser
Standardise column header casing. Supported styles: `snake_case`, `camelCase`, `UPPER_SNAKE`, `Title Case`, `lowercase`, `UPPERCASE`. Shows a before/after preview of all headers before downloading.

### Trimmer / Normaliser
Apply whitespace trimming and case transforms to cell values. Transforms can be stacked (e.g. trim then uppercase) and applied to all columns or a specific subset.

### File Merger
Combine multiple CSV or XLSX files with matching columns into a single file. Warns if column headers differ between files. Optionally adds a `_source` column showing the originating filename.

### CSV / XLSX Converter
Convert between CSV and XLSX formats without any configuration. Upload a file, pick the output format, download.

### File Comparator
Find rows that are new or have changed between two files. Features:
- Explicit cross-file column mapping — each mapping pairs a source column with a lookup column (columns do not need to share names)
- One or more mappings can be marked as primary keys (required) — used to match rows between files
- Output mirrors the source file's column structure exactly (no lookup columns appended)
- Optional `change_reason` column with descriptive values: `"new"`, `"salary changed"`, `"name, department changed"`, etc.
- Configurable case sensitivity and whitespace trimming

### Deduplicator
Remove or flag duplicate rows based on one or more key columns. Three modes:
- **Keep first** — retain the first occurrence of each key, remove subsequent duplicates
- **Keep last** — retain the last occurrence
- **Flag all** — keep all rows, add a `_duplicate` column with `yes`/`no`

### Empty Row / Column Remover
Remove rows or columns that are entirely blank. Three modes: empty rows only, empty columns only, or both.

---

## Planned

### File Splitter 🚧
Split a large file into smaller files. See [roadmap](roadmap.md).

### Column Populator 🚧
Populate or transform columns using composable, reusable rules with fuzzy lookup matching. See [design spec](column-populator-design.md).

### Column Stats 📋
Per-column statistics: row count, unique value count, min/max, and frequency distribution.

### Pivot Summary 📋
Group rows by a column and aggregate another with sum, count, or average.

### Row Filter 📋
Keep or exclude rows matching conditions: equals, contains, greater than, is blank, and more.

### Find & Replace 📋
Bulk find and replace cell values across the entire file or specific columns.

### Type Enforcer 📋
Force columns to a specific data type: number, date, or text, with configurable formats.
