import { useState } from 'react';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { download, readFile, stemName } from '../lib/utils';
import type { CellValue, FileData, OutputFormat } from '../types';

type KeepMode = 'first' | 'last' | 'flag';

export function Deduplicator() {
  const { addToast } = useToast();
  const [file, setFile]       = useState<FileData | null>(null);
  const [keys, setKeys]       = useState<string[]>([]);
  const [keep, setKeep]       = useState<KeepMode>('first');
  const [format, setFormat]   = useState<OutputFormat>('xlsx');
  const [stats, setStats]     = useState<{ dupes: number; out: number } | null>(null);

  async function handleFile(f: File) {
    try {
      const data = await readFile(f);
      setFile(data); setKeys([]); setStats(null);
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function toggleKey(h: string) {
    setKeys(prev => prev.includes(h) ? prev.filter(k => k !== h) : [...prev, h]);
  }

  function handleRun() {
    if (!file) return;
    if (keys.length === 0) { addToast('Select at least one key column', 'warning'); return; }

    const keyIndices = keys.map(k => file.headers.indexOf(k));
    const makeKey = (row: CellValue[]) => keyIndices.map(i => String(row[i] ?? '').trim().toLowerCase()).join('\x00');

    if (keep === 'flag') {
      const counts = new Map<string, number>();
      for (const row of file.rows) {
        const k = makeKey(row);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const headers: CellValue[] = [...file.headers, '_duplicate'];
      const rows = file.rows.map(row => {
        const k = makeKey(row);
        return [...row, (counts.get(k) ?? 1) > 1 ? 'yes' : 'no'] as CellValue[];
      });
      const dupes = [...counts.values()].filter(v => v > 1).reduce((s, v) => s + v - 1, 0);
      download([headers, ...rows], `${stemName(file.file)}_flagged.${format}`, format);
      setStats({ dupes, out: rows.length });
      addToast(`Flagged ${dupes} duplicate rows`, 'success');
      return;
    }

    const seen = new Map<string, CellValue[]>();
    const ordered: { key: string; row: CellValue[] }[] = [];
    for (const row of file.rows) {
      const k = makeKey(row);
      if (keep === 'first' && !seen.has(k)) { seen.set(k, row); ordered.push({ key: k, row }); }
      if (keep === 'last')                   { seen.set(k, row); }
    }

    const outRows = keep === 'first'
      ? ordered.map(o => o.row)
      : file.rows.filter((row, _) => {
          const k = makeKey(row);
          return seen.get(k) === row;
        });

    const dupes = file.rowCount - outRows.length;
    const headers: CellValue[] = [...file.headers];
    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    download([headers, ...outRows], `${stemName(file.file)}_deduped${ext}`, format);
    setStats({ dupes, out: outRows.length });
    addToast(`Removed ${dupes} duplicates, kept ${outRows.length} rows`, 'success');
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Deduplicator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Remove or flag duplicate rows based on selected key columns.</p>
      </div>

      <StepCard step={1} title="Upload file">
        {file ? (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{file.file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{file.rowCount} rows</p>
            </div>
            <button onClick={() => { setFile(null); setStats(null); }} className="text-xs text-red-500">Remove</button>
          </div>
        ) : <DropZone onFile={handleFile} />}
      </StepCard>

      <StepCard step={2} title="Configure" visible={!!file}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Key columns (duplicate = same value in all selected)</p>
            <div className="flex flex-wrap gap-3">
              {file?.headers.map(h => (
                <label key={h} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={keys.includes(h)} onChange={() => toggleKey(h)} className="w-3.5 h-3.5 accent-violet-600" />
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{h}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">When duplicates found</p>
            <div className="flex gap-3 flex-wrap">
              {(['first', 'last', 'flag'] as KeepMode[]).map(m => (
                <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value={m} checked={keep === m} onChange={() => setKeep(m)} className="w-3.5 h-3.5 accent-violet-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                    {m === 'first' ? 'Keep first' : m === 'last' ? 'Keep last' : 'Flag all (add column)'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <FormatSelector value={format} onChange={setFormat} />
            <button onClick={handleRun} className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors">
              Run & Download
            </button>
          </div>
          {stats && (
            <div className="flex gap-4 flex-wrap pt-1">
              <div className="bg-violet-50 dark:bg-violet-950/40 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.dupes}</p>
                <p className="text-xs text-violet-700 dark:text-violet-500 font-medium mt-0.5">Duplicates found</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.out}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Rows in output</p>
              </div>
            </div>
          )}
        </div>
      </StepCard>
    </div>
  );
}
