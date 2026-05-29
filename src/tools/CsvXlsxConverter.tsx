import { useState } from 'react';
import { DropZone } from '../components/DropZone';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { download, readFile, stemName } from '../lib/utils';
import type { FileData, OutputFormat } from '../types';

export function CsvXlsxConverter() {
  const { addToast } = useToast();
  const [file, setFile] = useState<FileData | null>(null);

  async function handleFile(f: File) {
    try {
      const data = await readFile(f);
      setFile(data);
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function handleDownload(fmt: OutputFormat) {
    if (!file) return;
    const aoa = [file.headers, ...file.rows];
    const ext  = fmt === 'xlsx' ? '.xlsx' : '.csv';
    download(aoa, `${stemName(file.file)}${ext}`, fmt);
    addToast(`Downloaded as ${ext}`, 'success');
  }

  const isXlsx = file?.file.name.endsWith('.xlsx') || file?.file.name.endsWith('.xls');

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">CSV / XLSX Converter</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Convert between CSV and XLSX formats instantly.</p>
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
        ) : (
          <DropZone onFile={handleFile} />
        )}
      </StepCard>

      <StepCard step={2} title="Download as…" visible={!!file}>
        <div className="flex gap-3 flex-wrap">
          {!isXlsx && (
            <button
              onClick={() => handleDownload('xlsx')}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Download as .xlsx
            </button>
          )}
          {isXlsx && (
            <button
              onClick={() => handleDownload('csv')}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download as .csv
            </button>
          )}
          {!isXlsx && (
            <button
              onClick={() => handleDownload('csv')}
              className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Re-download as .csv
            </button>
          )}
        </div>
      </StepCard>
    </div>
  );
}
