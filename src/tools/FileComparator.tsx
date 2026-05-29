import { useState } from 'react';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { compare } from '../lib/comparator';
import { download, readFile, stemName } from '../lib/utils';
import type { CompareOptions, CompareResult, FileData, OutputFormat, TrimOption } from '../types';

export function FileComparator() {
  const { addToast } = useToast();
  const [source, setSource]   = useState<FileData | null>(null);
  const [lookup, setLookup]   = useState<FileData | null>(null);
  const [result, setResult]   = useState<CompareResult | null>(null);
  const [format, setFormat]   = useState<OutputFormat>('xlsx');
  const [opts, setOpts]       = useState<CompareOptions>({ primaryKeys: [], caseSensitive: false, trim: 'all' });

  async function handleFile(side: 'source' | 'lookup', file: File) {
    try {
      const data = await readFile(file);
      if (side === 'source') { setSource(data); setResult(null); setOpts(o => ({ ...o, primaryKeys: [] })); }
      else                   { setLookup(data); setResult(null); }
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function toggleKey(h: string) {
    setOpts(o => ({
      ...o,
      primaryKeys: o.primaryKeys.includes(h) ? o.primaryKeys.filter(k => k !== h) : [...o.primaryKeys, h],
    }));
  }

  function handleCompare() {
    if (!source || !lookup) { addToast('Upload both files first', 'warning'); return; }
    if (opts.primaryKeys.length === 0) { addToast('Select at least one primary key', 'warning'); return; }
    const r = compare(source, lookup, opts);
    setResult(r);
    if (r.total === 0) addToast('No differences found', 'info');
    else addToast(`Found ${r.counts.new} new, ${r.counts.changed} changed`, 'success');
  }

  function handleDownload() {
    if (!result || !source) return;
    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    download(result.aoa, `${stemName(source.file)}_differences${ext}`, format);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">File Comparator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Find rows that are new or changed between two files using a primary key.</p>
      </div>

      <StepCard step={1} title="Upload files">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Source file</p>
            {source
              ? <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800 dark:text-white">{source.file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{source.rowCount} rows</p>
                  <button onClick={() => { setSource(null); setResult(null); }} className="text-xs text-red-500 mt-1">Remove</button>
                </div>
              : <DropZone onFile={f => handleFile('source', f)} label="Drop source file" />
            }
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Lookup file</p>
            {lookup
              ? <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800 dark:text-white">{lookup.file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{lookup.rowCount} rows</p>
                  <button onClick={() => { setLookup(null); setResult(null); }} className="text-xs text-red-500 mt-1">Remove</button>
                </div>
              : <DropZone onFile={f => handleFile('lookup', f)} label="Drop lookup file" />
            }
          </div>
        </div>
      </StepCard>

      <StepCard step={2} title="Configure comparison" visible={!!(source && lookup)}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Primary key columns</p>
            <div className="flex flex-wrap gap-2">
              {source?.headers.map(h => (
                <label key={h} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={opts.primaryKeys.includes(h)} onChange={() => toggleKey(h)}
                    className="w-3.5 h-3.5 accent-blue-600" />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">{h}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={opts.caseSensitive} onChange={e => setOpts(o => ({ ...o, caseSensitive: e.target.checked }))}
                className="w-3.5 h-3.5 accent-blue-600" />
              Case-sensitive
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-300">Whitespace trim:</span>
              <select
                value={opts.trim}
                onChange={e => setOpts(o => ({ ...o, trim: e.target.value as TrimOption }))}
                className="text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">Both sides</option>
                <option value="left">Left only</option>
                <option value="right">Right only</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        </div>
        <button
          onClick={handleCompare}
          className="mt-4 px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
        >
          Run comparison
        </button>
      </StepCard>

      <StepCard step={3} title="Results" visible={!!result}>
        {result && (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.counts.new}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-500 font-medium mt-0.5">New rows</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.counts.changed}</p>
                <p className="text-xs text-amber-700 dark:text-amber-500 font-medium mt-0.5">Changed rows</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{result.total}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Total differences</p>
              </div>
            </div>
            {result.total > 0 && (
              <div className="flex items-center gap-4">
                <FormatSelector value={format} onChange={setFormat} />
                <button
                  onClick={handleDownload}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download differences
                </button>
              </div>
            )}
          </div>
        )}
      </StepCard>
    </div>
  );
}
