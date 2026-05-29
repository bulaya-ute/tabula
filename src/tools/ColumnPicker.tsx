import { useState } from 'react';
import { DataPreview } from '../components/DataPreview';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { download, readFile, stemName } from '../lib/utils';
import type { CellValue, FileData, OutputFormat } from '../types';

interface ColConfig { original: string; label: string; enabled: boolean; }

export function ColumnPicker() {
  const { addToast } = useToast();
  const [file, setFile]     = useState<FileData | null>(null);
  const [cols, setCols]     = useState<ColConfig[]>([]);
  const [format, setFormat] = useState<OutputFormat>('xlsx');

  async function handleFile(f: File) {
    try {
      const data = await readFile(f);
      setFile(data);
      setCols(data.headers.map(h => ({ original: h, label: h, enabled: true })));
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function toggle(i: number) {
    setCols(prev => prev.map((c, idx) => idx === i ? { ...c, enabled: !c.enabled } : c));
  }

  function rename(i: number, label: string) {
    setCols(prev => prev.map((c, idx) => idx === i ? { ...c, label } : c));
  }

  function move(i: number, dir: -1 | 1) {
    setCols(prev => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  function handleDownload() {
    if (!file) return;
    const selected = cols.filter(c => c.enabled);
    if (selected.length === 0) { addToast('Select at least one column', 'warning'); return; }
    const indices = selected.map(c => file.headers.indexOf(c.original));
    const headers: CellValue[] = selected.map(c => c.label);
    const rows: CellValue[][] = file.rows.map(row => indices.map(i => row[i] ?? null));
    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    download([headers, ...rows], `${stemName(file.file)}_columns${ext}`, format);
    addToast(`Downloaded ${rows.length} rows, ${selected.length} columns`, 'success');
  }

  const enabledCount = cols.filter(c => c.enabled).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Column Picker</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Select, reorder, and rename columns from your file.</p>
      </div>

      <StepCard step={1} title="Upload file">
        {file ? (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{file.file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{file.rowCount} rows · {file.headers.length} columns</p>
            </div>
            <button onClick={() => { setFile(null); setCols([]); }} className="text-xs text-red-500">Remove</button>
          </div>
        ) : <DropZone onFile={handleFile} />}
      </StepCard>

      <StepCard step={2} title={`Configure columns (${enabledCount} of ${cols.length} selected)`} visible={cols.length > 0}>
        <div className="flex gap-3 mb-3">
          <button onClick={() => setCols(p => p.map(c => ({ ...c, enabled: true })))} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Select all</button>
          <button onClick={() => setCols(p => p.map(c => ({ ...c, enabled: false })))} className="text-xs text-slate-500 hover:underline">Deselect all</button>
        </div>
        <div className="space-y-2">
          {cols.map((c, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-opacity ${c.enabled ? 'bg-slate-50 dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/50 opacity-50'}`}>
              <input type="checkbox" checked={c.enabled} onChange={() => toggle(i)} className="w-3.5 h-3.5 accent-blue-600 shrink-0" />
              <span className="text-xs text-slate-400 font-mono w-32 truncate shrink-0">{c.original}</span>
              <input
                value={c.label}
                onChange={e => rename(i, e.target.value)}
                disabled={!c.enabled}
                className="flex-1 text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-sm px-1">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === cols.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-sm px-1">↓</button>
            </div>
          ))}
        </div>
      </StepCard>

      <StepCard step={3} title="Preview & Download" visible={cols.length > 0}>
        <DataPreview
          headers={cols.filter(c => c.enabled).map(c => c.label)}
          rows={(file?.rows.slice(0, 5) ?? []).map(row =>
            cols.filter(c => c.enabled).map(c => row[file!.headers.indexOf(c.original)] ?? null)
          )}
        />
        <div className="flex items-center gap-4 flex-wrap mt-4">
          <FormatSelector value={format} onChange={setFormat} />
          <button onClick={handleDownload} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Download
          </button>
        </div>
      </StepCard>
    </div>
  );
}
