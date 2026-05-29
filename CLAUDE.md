# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Type-check (tsc -b) then bundle for production
npm run lint      # ESLint across all files
npm run preview   # Serve the production build locally
```

There is no test suite.

## Architecture

Tabula is a **fully client-side** spreadsheet utility app — all file parsing and processing happens in the browser with no backend. Files never leave the user's machine.

### Navigation model

`App.tsx` drives navigation with a single `view` string state (no router). The home screen renders `ToolGrid`; selecting a tool sets `view` to the tool's `id` and renders that tool's component. Tools with `stub: true` show an `UnderConstructionModal` instead of a real component.

### Adding a new tool

1. Create `src/tools/YourTool.tsx` as a self-contained React component.
2. Register it in `src/tools/index.tsx` by adding an entry to the `TOOLS` array with a unique `id`, `name`, `description`, `category`, `keywords`, `icon`, and `component`. Omit `component` and add `stub: true` to placeholder tools not yet built.

### Core data flow

All file I/O is centralised in `src/lib/utils.ts`:

- **`readFile(file)`** — parses CSV or XLSX via SheetJS and returns a `FileData` object: `{ file, headers: string[], rows: CellValue[][], rowCount }`. Only the first sheet is read.
- **`download(aoa, filename, format)`** — converts a `CellValue[][]` (array-of-arrays, always with headers as row 0) back to XLSX or CSV and triggers a browser download.

The `CellValue[][]` / `aoa` format is the internal representation passed between processing functions and the download helper. The `FileData` type (defined in `src/types/index.ts`) is the standard shape for parsed file state held in tool components.

### UI patterns

Tools are built as step-by-step flows using `StepCard` (collapsible/hidden until previous step is complete). File upload uses `DropZone` (single file) or `MultiDropZone` (multiple files). Output format is chosen with `FormatSelector` (`xlsx` | `csv`). Toast notifications come from `useToast()` (provided by `ToastContext`).

### Styling

Tailwind CSS 3 with dark mode via the `dark:` variant. Dark mode is toggled by adding/removing the `dark` class on `<html>`, persisted to `localStorage` as `tb-theme`.
