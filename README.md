# Tabula

A fully client-side spreadsheet utility. All file parsing and processing happens in the browser — files never leave your machine.

## Tools

| Tool | Status | Description |
|------|--------|-------------|
| Column Remapper | ✅ | Map source columns to a custom output schema with per-column transforms |
| Column Picker | ✅ | Select, reorder, and rename columns |
| Header Normaliser | ✅ | Standardise header casing (snake_case, camelCase, UPPER_SNAKE, etc.) |
| Trimmer / Normaliser | ✅ | Strip whitespace and apply case transforms to cell values |
| File Merger | ✅ | Combine multiple CSV/XLSX files into one |
| CSV / XLSX Converter | ✅ | Convert between formats instantly |
| File Comparator | ✅ | Diff two files using configurable column mappings and primary keys |
| Deduplicator | ✅ | Remove or flag duplicate rows by key columns |
| Empty Row / Column Remover | ✅ | Strip entirely blank rows or columns |
| File Splitter | 🚧 | Split a file by row count or target number of files |
| Column Populator | 🚧 | Populate columns using composable, reusable lookup rules |
| Column Stats | 📋 | Count, unique values, min/max, frequency distribution |
| Pivot Summary | 📋 | Group and aggregate rows |
| Row Filter | 📋 | Keep or exclude rows by condition |
| Find & Replace | 📋 | Bulk find and replace cell values |
| Type Enforcer | 📋 | Force columns to a specific data type |

✅ Implemented · 🚧 In development · 📋 Planned

## Tech stack

- React 19 · TypeScript · Vite
- Tailwind CSS 3
- SheetJS (xlsx) for CSV/XLSX parsing

## Getting started

```bash
npm install
npm run dev
```

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check then bundle for production
npm run lint      # ESLint across all files
npm run preview   # Serve the production build locally
```

There is no test suite. Sample input files and expected outputs for all implemented tools are in [`test-data/`](test-data/).

## Documentation

- [`docs/tools.md`](docs/tools.md) — detailed description of each tool
- [`docs/roadmap.md`](docs/roadmap.md) — locked-in planned changes and upcoming features
- [`docs/column-populator-design.md`](docs/column-populator-design.md) — full design spec for the Column Populator tool
- [`CLAUDE.md`](CLAUDE.md) — developer guidance and codebase architecture (for Claude Code)
