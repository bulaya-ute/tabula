import { useState } from 'react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { download, readFile, stemName } from '../lib/utils';
import type { CellValue, FileData, OutputFormat } from '../types';

type SplitMode = 'max-rows' | 'num-files';

interface SplitPart {
  filename: string;
  startRow: number;
  endRow: number;
  rowCount: number;
}

const CARDS_PER_PAGE = 12;

function computeParts(file: FileData, mode: SplitMode, value: number, stem: string, ext: string): SplitPart[] {
  const total = file.rowCount;
  const rowsPerPart = mode === 'max-rows' ? value : Math.ceil(total / value);
  const parts: SplitPart[] = [];
  let i = 0;
  let n = 1;
  while (i < total) {
    const end = Math.min(i + rowsPerPart, total);
    parts.push({
      filename: `${stem}_part${String(n).padStart(3, '0')}${ext}`,
      startRow: i,
      endRow: end,
      rowCount: end - i,
    });
    i = end;
    n++;
  }
  return parts;
}

function buildAoa(file: FileData, part: SplitPart): CellValue[][] {
  return [file.headers as CellValue[], ...file.rows.slice(part.startRow, part.endRow)];
}

export function FileSplitter() {
  const { addToast } = useToast();
  const [file, setFile]       = useState<FileData | null>(null);
  const [mode, setMode]       = useState<SplitMode>('max-rows');
  const [value, setValue]     = useState<number>(100);
  const [format, setFormat]   = useState<OutputFormat>('xlsx');
  const [parts, setParts]     = useState<SplitPart[] | null>(null);
  const [page, setPage]       = useState(0);
  const [zipping, setZipping] = useState(false);

  async function handleFile(f: File) {
    try {
      const data = await readFile(f);
      setFile(data);
      setParts(null);
      setPage(0);
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function handlePreview() {
    if (!file) return;
    const total = file.rowCount;

    if (mode === 'max-rows') {
      if (!Number.isInteger(value) || value < 1) {
        addToast('Rows per file must be at least 1', 'warning'); return;
      }
      if (value >= total) {
        addToast(`Value must be less than the total row count (${total})`, 'warning'); return;
      }
    } else {
      if (!Number.isInteger(value) || value < 2) {
        addToast('Number of files must be at least 2', 'warning'); return;
      }
      if (value > total) {
        addToast(`Cannot create more files than rows (${total})`, 'warning'); return;
      }
    }

    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    const stem = stemName(file.file);
    const computed = computeParts(file, mode, value, stem, ext);
    setParts(computed);
    setPage(0);
    addToast(`${computed.length} splits ready`, 'success');
  }

  function handleDownloadPart(part: SplitPart) {
    if (!file) return;
    download(buildAoa(file, part), part.filename, format);
  }

  async function handleDownloadAll() {
    if (!file || !parts) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const part of parts) {
        const aoa = buildAoa(file, part);
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        if (format === 'xlsx') {
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
          const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
          zip.file(part.filename, buf);
        } else {
          zip.file(part.filename, XLSX.utils.sheet_to_csv(ws));
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stemName(file.file)}_splits.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast(`Downloaded ${parts.length} files as ZIP`, 'success');
    } catch {
      addToast('Failed to create ZIP', 'error');
    } finally {
      setZipping(false);
    }
  }

  const totalPages = parts ? Math.ceil(parts.length / CARDS_PER_PAGE) : 0;
  const visibleParts = parts?.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">File Splitter</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Split a large file into smaller files by row count or target number of files.</p>
      </div>

      {/* Step 1 */}
      <StepCard step={1} title="Upload file">
        {file ? (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{file.file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{file.rowCount} rows · {file.headers.length} columns</p>
            </div>
            <button onClick={() => { setFile(null); setParts(null); }} className="text-xs text-red-500">Remove</button>
          </div>
        ) : <DropZone onFile={handleFile} />}
      </StepCard>

      {/* Step 2 */}
      <StepCard step={2} title="Configure split" visible={!!file}>
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            {(['max-rows', 'num-files'] as SplitMode[]).map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === m}
                  onChange={() => { setMode(m); setParts(null); }}
                  className="w-3.5 h-3.5 accent-blue-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {m === 'max-rows' ? 'Max rows per file' : 'Number of output files'}
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600 dark:text-slate-400 w-36 shrink-0">
              {mode === 'max-rows' ? 'Rows per file:' : 'Number of files:'}
            </label>
            <input
              type="number"
              min={mode === 'max-rows' ? 1 : 2}
              value={value}
              onChange={e => { setValue(parseInt(e.target.value) || 0); setParts(null); }}
              className="w-28 text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            {file && (
              <span className="text-xs text-slate-400">
                {mode === 'max-rows'
                  ? `→ ~${Math.ceil(file.rowCount / Math.max(value, 1))} files`
                  : `→ ~${Math.ceil(file.rowCount / Math.max(value, 1))} rows each`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <FormatSelector value={format} onChange={f => { setFormat(f); setParts(null); }} />
            <button
              onClick={handlePreview}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Preview splits
            </button>
          </div>
        </div>
      </StepCard>

      {/* Step 3 */}
      <StepCard step={3} title="Download splits" visible={!!parts}>
        {parts && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-white">{parts.length}</span> files
                &nbsp;·&nbsp;
                <span className="font-semibold text-slate-800 dark:text-white">{file!.rowCount}</span> total rows
                &nbsp;·&nbsp; click a card to download individually
              </p>
              <button
                onClick={handleDownloadAll}
                disabled={zipping}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {zipping ? 'Building ZIP…' : `Download all as ZIP`}
              </button>
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {visibleParts.map(part => (
                <button
                  key={part.filename}
                  onClick={() => handleDownloadPart(part)}
                  className="text-left bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 rounded-xl px-4 py-3 transition-colors group"
                >
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{part.filename}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{part.rowCount} rows</p>
                  <p className="text-xs text-slate-400 mt-0.5">rows {part.startRow + 1}–{part.endRow}</p>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 justify-center pt-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs text-slate-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="px-3 py-1 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </StepCard>
    </div>
  );
}
