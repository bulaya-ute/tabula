import { useState } from 'react';
import { DataPreview } from '../components/DataPreview';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { download, readFile, stemName } from '../lib/utils';
import type { CellValue, FileData, OutputFormat } from '../types';

type CaseStyle = 'snake' | 'camel' | 'UPPER_SNAKE' | 'title' | 'lower' | 'UPPER';

function toStyle(h: string, style: CaseStyle, trim: boolean): string {
  let s = trim ? h.trim() : h;
  const words = s.replace(/[_\-\s]+/g, ' ').trim().split(/\s+/);
  if (style === 'snake')      return words.map(w => w.toLowerCase()).join('_');
  if (style === 'camel')      return words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
  if (style === 'UPPER_SNAKE') return words.map(w => w.toUpperCase()).join('_');
  if (style === 'title')      return words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  if (style === 'lower')      return words.join(' ').toLowerCase();
  if (style === 'UPPER')      return words.join(' ').toUpperCase();
  return s;
}

const STYLES: { value: CaseStyle; label: string; example: string }[] = [
  { value: 'snake',       label: 'snake_case',    example: 'first_name' },
  { value: 'camel',       label: 'camelCase',     example: 'firstName' },
  { value: 'UPPER_SNAKE', label: 'UPPER_SNAKE',   example: 'FIRST_NAME' },
  { value: 'title',       label: 'Title Case',    example: 'First Name' },
  { value: 'lower',       label: 'lowercase',     example: 'first name' },
  { value: 'UPPER',       label: 'UPPERCASE',     example: 'FIRST NAME' },
];

export function HeaderNormaliser() {
  const { addToast } = useToast();
  const [file, setFile]     = useState<FileData | null>(null);
  const [style, setStyle]   = useState<CaseStyle>('snake');
  const [trim, setTrim]     = useState(true);
  const [format, setFormat] = useState<OutputFormat>('xlsx');

  async function handleFile(f: File) {
    try {
      const data = await readFile(f);
      setFile(data);
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  const preview = file?.headers.map(h => toStyle(h, style, trim)) ?? [];

  function handleDownload() {
    if (!file) return;
    const newHeaders: CellValue[] = file.headers.map(h => toStyle(h, style, trim));
    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    download([newHeaders, ...file.rows], `${stemName(file.file)}_headers${ext}`, format);
    addToast('Downloaded with normalised headers', 'success');
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Header Normaliser</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Standardise column header casing and formatting.</p>
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

      <StepCard step={2} title="Choose style" visible={!!file}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors
                ${style === s.value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-400'}`}
            >
              <p className="font-medium">{s.label}</p>
              <p className={`text-xs mt-0.5 font-mono ${style === s.value ? 'text-blue-200' : 'text-slate-400'}`}>{s.example}</p>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer mb-4">
          <input type="checkbox" checked={trim} onChange={e => setTrim(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
          Trim leading/trailing whitespace from headers
        </label>

        {preview.length > 0 && (
          <>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 overflow-x-auto mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Header changes</p>
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-slate-500 pr-6 pb-1 font-medium">Original</th>
                    <th className="text-left text-slate-500 pb-1 font-medium">Normalised</th>
                  </tr>
                </thead>
                <tbody>
                  {file?.headers.map((h, i) => (
                    <tr key={i}>
                      <td className="font-mono text-slate-500 pr-6 py-0.5">{h}</td>
                      <td className="font-mono text-slate-800 dark:text-white py-0.5">{preview[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DataPreview
              headers={preview}
              rows={file?.rows.slice(0, 5) ?? []}
              label="Data preview with normalised headers (first 5 rows)"
            />
          </>
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
