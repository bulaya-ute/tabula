import type { Tool } from '../types';
import { ColumnRemapper }  from './ColumnRemapper';
import { ColumnPicker }    from './ColumnPicker';
import { HeaderNormaliser } from './HeaderNormaliser';
import { Trimmer }         from './Trimmer';
import { FileMerger }      from './FileMerger';
import { CsvXlsxConverter } from './CsvXlsxConverter';
import { FileComparator }  from './FileComparator';
import { Deduplicator }    from './Deduplicator';
import { EmptyRowRemover } from './EmptyRowRemover';
import { FileSplitter }   from './FileSplitter';

/* ── Icons ─────────────────────────────────────────────────────────────── */

const Icon = {
  Remap:    ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  Columns:  ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Header:   ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h7" />
    </svg>
  ),
  Trim:     ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
  Merge:    ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h7m0 0v12m0-12l4-4m-4 4l4 4M20 18h-7" />
    </svg>
  ),
  Split:    ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
    </svg>
  ),
  Convert:  ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Compare:  ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Dedupe:   ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Stats:    ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  Filter:   ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Replace:  ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  Type:     ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Pivot:    ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  Empty:    ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

/* ── Tool registry ──────────────────────────────────────────────────────── */

export const TOOLS: Tool[] = [
  // Transform
  {
    id: 'column-remapper',
    name: 'Column Remapper',
    description: 'Map source columns to a custom output schema with per-column transforms, fixed values, and blank handling.',
    category: 'Transform',
    keywords: ['remap', 'map', 'schema', 'convert', 'template', 'columns', 'transform', 'format'],
    icon: Icon.Remap,
    component: ColumnRemapper,
  },
  {
    id: 'column-picker',
    name: 'Column Picker',
    description: 'Select which columns to keep, reorder them, and rename headers — all in one step.',
    category: 'Transform',
    keywords: ['pick', 'select', 'reorder', 'rename', 'columns', 'headers'],
    icon: Icon.Columns,
    component: ColumnPicker,
  },
  {
    id: 'header-normaliser',
    name: 'Header Normaliser',
    description: 'Standardise column header casing: snake_case, camelCase, UPPER_SNAKE, Title Case, and more.',
    category: 'Transform',
    keywords: ['header', 'normalise', 'case', 'snake', 'camel', 'uppercase', 'rename'],
    icon: Icon.Header,
    component: HeaderNormaliser,
  },
  {
    id: 'trimmer',
    name: 'Trimmer / Normaliser',
    description: 'Strip whitespace and apply case transforms to cell values across all or selected columns.',
    category: 'Transform',
    keywords: ['trim', 'whitespace', 'normalise', 'uppercase', 'lowercase', 'clean', 'cells'],
    icon: Icon.Trim,
    component: Trimmer,
  },

  // File Operations
  {
    id: 'file-merger',
    name: 'File Merger',
    description: 'Combine multiple CSV or XLSX files with matching columns into a single file.',
    category: 'File Operations',
    keywords: ['merge', 'combine', 'join', 'append', 'concat', 'files'],
    icon: Icon.Merge,
    component: FileMerger,
  },
  {
    id: 'csv-xlsx-converter',
    name: 'CSV / XLSX Converter',
    description: 'Convert between CSV and XLSX formats instantly without any configuration.',
    category: 'File Operations',
    keywords: ['convert', 'csv', 'xlsx', 'xls', 'format', 'export'],
    icon: Icon.Convert,
    component: CsvXlsxConverter,
  },
  {
    id: 'file-splitter',
    name: 'File Splitter',
    description: 'Split a large file into smaller files by row count or by target number of files. Download individually or all as ZIP.',
    category: 'File Operations',
    keywords: ['split', 'chunk', 'divide', 'partition', 'rows', 'zip'],
    icon: Icon.Split,
    component: FileSplitter,
  },

  // Analysis
  {
    id: 'file-comparator',
    name: 'File Comparator',
    description: 'Find rows that are new or have changed between two files using configurable primary keys.',
    category: 'Analysis',
    keywords: ['compare', 'diff', 'difference', 'match', 'changed', 'new', 'lookup'],
    icon: Icon.Compare,
    component: FileComparator,
  },
  {
    id: 'deduplicator',
    name: 'Deduplicator',
    description: 'Remove or flag duplicate rows based on one or more key columns.',
    category: 'Analysis',
    keywords: ['duplicate', 'dedupe', 'unique', 'distinct', 'rows'],
    icon: Icon.Dedupe,
    component: Deduplicator,
  },
  {
    id: 'column-stats',
    name: 'Column Stats',
    description: 'Get counts, unique values, min/max, and frequency distribution for any column.',
    category: 'Analysis',
    keywords: ['stats', 'statistics', 'count', 'unique', 'frequency', 'min', 'max', 'analysis'],
    icon: Icon.Stats,
    stub: true,
  },
  {
    id: 'pivot-summary',
    name: 'Pivot Summary',
    description: 'Group rows by a column and aggregate another with sum, count, or average.',
    category: 'Analysis',
    keywords: ['pivot', 'group', 'aggregate', 'sum', 'average', 'count', 'summary'],
    icon: Icon.Pivot,
    stub: true,
  },

  // Cleaning
  {
    id: 'empty-row-remover',
    name: 'Empty Row / Column Remover',
    description: 'Remove rows or columns that are entirely blank from your spreadsheet.',
    category: 'Cleaning',
    keywords: ['empty', 'blank', 'remove', 'clean', 'rows', 'columns', 'null'],
    icon: Icon.Empty,
    component: EmptyRowRemover,
  },
  {
    id: 'row-filter',
    name: 'Row Filter',
    description: 'Keep or exclude rows matching conditions: equals, contains, greater than, is blank, and more.',
    category: 'Cleaning',
    keywords: ['filter', 'where', 'condition', 'rows', 'query', 'search'],
    icon: Icon.Filter,
    stub: true,
  },
  {
    id: 'find-replace',
    name: 'Find & Replace',
    description: 'Bulk find and replace cell values across the entire file or specific columns.',
    category: 'Cleaning',
    keywords: ['find', 'replace', 'search', 'substitue', 'bulk', 'edit'],
    icon: Icon.Replace,
    stub: true,
  },
  {
    id: 'type-enforcer',
    name: 'Type Enforcer',
    description: 'Force columns to a specific data type: number, date, or text with configurable formats.',
    category: 'Cleaning',
    keywords: ['type', 'cast', 'number', 'date', 'text', 'format', 'convert'],
    icon: Icon.Type,
    stub: true,
  },
];
