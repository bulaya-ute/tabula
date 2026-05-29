import { useState } from 'react';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { download, readFile, stemName } from '../lib/utils';
import type { CellValue, FileData, OutputFormat } from '../types';

type CellTransform = 'trim' | 'uppercase' | 'lowercase' | 'titlecase';

const TRANSFORMS: { value: CellTransform; label: string }[] = [
  { value: 'trim',      label: 'Trim whitespace' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'titlecase', label: 'Title Case' },
];

function applyAll(v: CellValue, ops: CellTransform[]): CellValue {
  if (v === null) return null;
  let s = String(v);
  for (const op of ops) {
    if (op === 'trim')      s = s.trim();
    if (op === 'uppercase') s = s.toUpperCase();
    if (op === 'lowercase') s = s.toLowerCase();
    if (op === 'titlecase') s = s.replace(/\b\w/g, c => c.toUpperCase());
  }
  return s;
}

export function Trimmer() {
  const { addToast } = useToast();
  const [file, setFile]         = useState<FileData | null>(null);
  const [transforms, setTransforms] = useState<CellTransform[]>(['trim']);
  const [selectedCols, setSelectedCols] = useState<Set<string> | 'all'>('all');
  const [format, setFormat]     = useState<OutputFormat>('xlsx');

  async function handleFile(f: File) {
    try {
      const data = await readFile(f);
      setFile(data); setSelectedCols('all');
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function toggleTransform(t: CellTransform) {
    setTransforms(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function toggleCol(h: string) {
    if (selectedCols === 'all') {
      const s = new Set(file?.headers ?? []);
      s.delete(h);
      setSelectedCols(s);
    } else {
      const s = new Set(selectedCols);
      if (s.has(h)) s.delete(h); else s.add(h);
      if (s.size === (file?.headers.length ?? 0)) setSelectedCols('all');
      else setSelectedCols(s);
    }
  }

  function isColSelected(h: string) {
    return selectedCols === 'all' || selectedCols.has(h);
  }

  function handleDownload() {
    if (!file) return;
    if (transforms.length === 0) { addToast('Select at least one operation', 'warning'); return; }
    const headers: CellValue[] = [...file.headers];
    const rows: CellValue[][] = file.rows.map(row =>
      row.map((cell, ci) => isColSelected(file.headers[ci]) ? applyAll(cell, transforms) : cell)
    );
    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    download([headers, ...rows], `${stemName(file.file)}_normalised${ext}`, format);
    addToast(`Applied ${transforms.join(', ')} to ${file.rowCount} rows`, 'success');
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Trimmer / Normaliser</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Apply whitespace trimming and case transforms across cell values.</p>
      </div>

      <StepCard step={1} title="Upload file">
        {file ? (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{file.file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{file.rowCount} rows · {file.headers.length} columns</p>
            </div>
            <button onClick={() => setFile(null)} className="text-xs text-red-500">Remove</button>
          </div>
        ) : <DropZone onFile={handleFile} />}
      </StepCard>

      <StepCard step={2} title="Operations" visible={!!file}>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Apply (in order)</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {TRANSFORMS.map(t => (
            <button
              key={t.value}
              onClick={() => toggleTransform(t.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                ${transforms.includes(t.value)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Apply to columns</p>
        <div className="flex flex-wrap gap-3 mb-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={selectedCols === 'all'} onChange={() => setSelectedCols('all')} className="w-3.5 h-3.5 accent-blue-600" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">All columns</span>
          </label>
        </div>
        {selectedCols !== 'all' && (
          <div className="flex flex-wrap gap-3 ml-4">
            {file?.headers.map(h => (
              <label key={h} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isColSelected(h)} onChange={() => toggleCol(h)} className="w-3.5 h-3.5 accent-blue-600" />
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{h}</span>
              </label>
            ))}
          </div>
        )}
        {selectedCols === 'all' && (
          <button onClick={() => setSelectedCols(new Set())} className="ml-4 text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Choose specific columns
          </button>
        )}
      </StepCard>

      <StepCard step={3} title="Download" visible={!!file}>
        <div className="flex items-center gap-4 flex-wrap">
          <FormatSelector value={format} onChange={setFormat} />
          <button onClick={handleDownload} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Download
          </button>
        </div>
      </StepCard>
    </div>
  );
}
