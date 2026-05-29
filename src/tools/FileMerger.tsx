import { useState } from 'react';
import { MultiDropZone } from '../components/MultiDropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { download, formatFileSize, readFile } from '../lib/utils';
import type { CellValue, FileData, OutputFormat } from '../types';

export function FileMerger() {
  const { addToast } = useToast();
  const [files, setFiles]       = useState<FileData[]>([]);
  const [addSource, setAddSource] = useState(false);
  const [format, setFormat]     = useState<OutputFormat>('xlsx');

  async function handleFiles(newFiles: File[]) {
    const results: FileData[] = [];
    for (const f of newFiles) {
      try { results.push(await readFile(f)); }
      catch { addToast(`Failed to read ${f.name}`, 'error'); }
    }
    setFiles(prev => [...prev, ...results]);
    addToast(`Added ${results.length} file(s)`, 'success');
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleMerge() {
    if (files.length < 2) { addToast('Upload at least 2 files', 'warning'); return; }

    const allHeaders = files[0].headers;
    const headerMismatch = files.some(f => f.headers.join(',') !== allHeaders.join(','));
    if (headerMismatch) {
      addToast('Column headers differ between files — merge may be misaligned', 'warning');
    }

    const outHeaders: CellValue[] = addSource ? ['_source', ...allHeaders] : [...allHeaders];
    const outRows: CellValue[][] = files.flatMap(f =>
      f.rows.map(row => addSource ? [f.file.name, ...row] : [...row])
    );

    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    download([outHeaders, ...outRows], `merged${ext}`, format);
    addToast(`Merged ${outRows.length} total rows`, 'success');
  }

  const totalRows = files.reduce((s, f) => s + f.rowCount, 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">File Merger</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Combine multiple files with matching columns into one.</p>
      </div>

      <StepCard step={1} title="Upload files">
        <MultiDropZone onFiles={handleFiles} />
        {files.length > 0 && (
          <ul className="mt-4 space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{f.file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{f.rowCount} rows · {formatFileSize(f.file.size)}</p>
                </div>
                <button onClick={() => removeFile(i)} className="text-xs text-red-500 hover:text-red-600">Remove</button>
              </li>
            ))}
            <li className="text-xs text-slate-400 dark:text-slate-500 pl-1">{totalRows} total rows across {files.length} files</li>
          </ul>
        )}
      </StepCard>

      <StepCard step={2} title="Options" visible={files.length >= 2}>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={addSource} onChange={e => setAddSource(e.target.checked)}
            className="w-3.5 h-3.5 accent-emerald-600" />
          Add a <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">_source</code> column with the original filename
        </label>
      </StepCard>

      <StepCard step={3} title="Download" visible={files.length >= 2}>
        <div className="flex items-center gap-4 flex-wrap">
          <FormatSelector value={format} onChange={setFormat} />
          <button
            onClick={handleMerge}
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Download merged file
          </button>
        </div>
      </StepCard>
    </div>
  );
}
