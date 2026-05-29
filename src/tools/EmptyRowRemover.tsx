import { useState } from 'react';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { download, readFile, stemName } from '../lib/utils';
import type { CellValue, FileData, OutputFormat } from '../types';

type RemoveMode = 'rows' | 'cols' | 'both';

function isEmpty(v: CellValue) { return v === null || String(v).trim() === ''; }

export function EmptyRowRemover() {
  const { addToast } = useToast();
  const [file, setFile]     = useState<FileData | null>(null);
  const [mode, setMode]     = useState<RemoveMode>('rows');
  const [format, setFormat] = useState<OutputFormat>('xlsx');
  const [stats, setStats]   = useState<{ rows: number; cols: number } | null>(null);

  async function handleFile(f: File) {
    try {
      const data = await readFile(f);
      setFile(data); setStats(null);
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function handleRun() {
    if (!file) return;

    let { headers, rows } = file;
    let removedRows = 0;
    let removedCols = 0;

    if (mode === 'rows' || mode === 'both') {
      const filtered = rows.filter(row => !row.every(isEmpty));
      removedRows = rows.length - filtered.length;
      rows = filtered;
    }

    if (mode === 'cols' || mode === 'both') {
      const colMask = headers.map((_, ci) => !rows.every(row => isEmpty(row[ci] ?? null)));
      const keepIndices = colMask.map((keep, i) => keep ? i : -1).filter(i => i >= 0);
      removedCols = headers.length - keepIndices.length;
      headers = keepIndices.map(i => headers[i]);
      rows = rows.map(row => keepIndices.map(i => row[i] ?? null));
    }

    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    const outHeaders: CellValue[] = [...headers];
    download([outHeaders, ...rows], `${stemName(file.file)}_cleaned${ext}`, format);
    setStats({ rows: removedRows, cols: removedCols });
    addToast(`Removed ${removedRows} empty rows, ${removedCols} empty columns`, 'success');
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Empty Row / Column Remover</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Strip rows and columns that are entirely blank.</p>
      </div>

      <StepCard step={1} title="Upload file">
        {file ? (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{file.file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{file.rowCount} rows · {file.headers.length} cols</p>
            </div>
            <button onClick={() => { setFile(null); setStats(null); }} className="text-xs text-red-500">Remove</button>
          </div>
        ) : <DropZone onFile={handleFile} />}
      </StepCard>

      <StepCard step={2} title="Options" visible={!!file}>
        <div className="space-y-3 mb-4">
          {(['rows', 'cols', 'both'] as RemoveMode[]).map(m => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={m} checked={mode === m} onChange={() => setMode(m)} className="w-3.5 h-3.5 accent-amber-600" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {m === 'rows' ? 'Remove empty rows only'
                  : m === 'cols' ? 'Remove empty columns only'
                  : 'Remove both empty rows and columns'}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <FormatSelector value={format} onChange={setFormat} />
          <button onClick={handleRun} className="px-5 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors">
            Clean & Download
          </button>
        </div>
        {stats && (
          <div className="flex gap-4 mt-4 flex-wrap">
            <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.rows}</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 font-medium mt-0.5">Empty rows removed</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.cols}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Empty columns removed</p>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
